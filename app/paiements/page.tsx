'use client'

import { useEffect, useState, startTransition } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Toast } from '@/components/ui/Toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { 
  Plus, Download, TrendingUp, TrendingDown, 
  DollarSign, CreditCard, AlertCircle, CheckCircle2,
  Clock, Calendar, Search, Trash2, Edit, FileText, Printer, X
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Payment, Contract, Tenant, Property, Unit } from '@/lib/database.types'

type PaymentWithRelations = Payment & {
  tenants?: Tenant
  contracts?: Contract & { properties?: Property; units?: Unit }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithRelations[]>([])
  const [contracts, setContracts] = useState<(Contract & { properties?: Property; tenants?: Tenant; units?: Unit })[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; user_metadata?: any } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    totalRevenue: 0,
    expectedRevenue: 0,
    latePayments: 0,
    paidThisMonth: 0
  })
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning'
  } | null>(null)

  const calculateStats = (data: Payment[]) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return {
      totalRevenue: data.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
      expectedRevenue: data.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
      latePayments: data.filter(p => p.status === 'late').length,
      paidThisMonth: data.filter(p => {
        const paymentDate = new Date(p.date)
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear &&
               p.status === 'paid'
      }).reduce((sum, p) => sum + p.amount, 0)
    }
  }
  // Fetcher qui renvoie les résultats mais ne met pas l'état directement.
  const fetchFromServer = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { user: null, payments: [], contracts: [] }

    const paymentsQuery = supabase
      .from('payments')
      .select('*, tenants(first_name, last_name, email, phone), contracts(monthly_rent, property_id, properties(name, address, type), units(name, type))')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (filterStatus !== 'all') paymentsQuery.eq('status', filterStatus)

    const contractsQuery = supabase
      .from('contracts')
      .select('*, properties(name, address, type), tenants(first_name, last_name)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    const [paymentsResult, contractsResult] = await Promise.all([paymentsQuery, contractsQuery])

    return {
      user,
      payments: paymentsResult.data || [],
      contracts: contractsResult.data || []
    }
  }

  // Fonction publique pour recharger les données (utilisée par les handlers)
  const reloadData = async () => {
    setLoading(true)
    const res = await fetchFromServer()
    if (!res.user) { setLoading(false); return }
    const computedStats = calculateStats(res.payments as Payment[])
    // grouper les mises à jour d'état dans une transition pour éviter des re-render en cascade
    startTransition(() => {
      setCurrentUser(res.user)
      setPayments(res.payments as PaymentWithRelations[])
      setContracts(res.contracts as typeof contracts)
      setStats(computedStats)
      setLoading(false)
    })
  }

  useEffect(() => { void reloadData() }, [filterStatus])

  const handleAddPayment = async (formData: PaymentFormData) => {
    const user = currentUser
    if (!user) { setToast({ message: 'Non authentifié', type: 'error' }); return }

    const contract = contracts.find(c => c.id === formData.contract_id)
    if (!contract) { setToast({ message: 'Contrat introuvable', type: 'error' }); return }

    const monthsToPay = formData.months_to_pay || 1
    const paymentsToCreate = []
    const startDate = new Date(formData.due_date)

    const { data: existingPayments } = await supabase
      .from('payments')
      .select('*, contracts(property_id)')
      .eq('tenant_id', formData.tenant_id)
      .eq('user_id', user.id)

    // Générer les paiements pour chaque mois
    for (let i = 0; i < monthsToPay; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)

      const paymentMonth = dueDate.getMonth()
      const paymentYear = dueDate.getFullYear()

      const hasDuplicate = existingPayments?.some(payment => {
        const existingDate = new Date(payment.due_date)
        const existingMonth = existingDate.getMonth()
        const existingYear = existingDate.getFullYear()
        const existingPropertyId = payment.contracts?.property_id

        return existingMonth === paymentMonth &&
               existingYear === paymentYear &&
               existingPropertyId === contract.property_id
      })

      if (hasDuplicate) {
        setToast({ message: `Un paiement existe déjà pour ${dueDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`, type: 'error' })
        return
      }

      paymentsToCreate.push({
        contract_id: formData.contract_id,
        tenant_id: formData.tenant_id,
        amount: formData.amount,
        date: formData.date,
        due_date: dueDate.toISOString().split('T')[0],
        status: formData.status || 'pending',
        method: formData.method,
        reference: formData.reference,
        user_id: user.id
      })
    }

    const { error } = await supabase
      .from('payments')
      .insert(paymentsToCreate)
      .select()

    if (error) {
      setToast({ message: 'Erreur lors de l\'enregistrement', type: 'error' })
    } else {
      setToast({ message: `${monthsToPay} paiement${monthsToPay > 1 ? 's' : ''} enregistré${monthsToPay > 1 ? 's' : ''} avec succès`, type: 'success' })
      setShowAddModal(false)
      await reloadData()
    }
  }

  const handleUpdatePayment = async (formData: PaymentFormData) => {
    if (!selectedPayment) return
    const { error } = await supabase.from('payments').update(formData).eq('id', selectedPayment.id)
    if (error) {
      setToast({ message: 'Erreur lors de la modification', type: 'error' })
    } else {
      setToast({ message: 'Paiement modifié avec succès', type: 'success' })
      setShowEditModal(false)
      setSelectedPayment(null)
      await reloadData()
    }
  }

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return
    const { error } = await supabase.from('payments').delete().eq('id', paymentToDelete)
    if (error) {
      setToast({ message: 'Erreur lors de la suppression', type: 'error' })
    } else {
      setToast({ message: 'Paiement supprimé avec succès', type: 'success' })
      setShowDeleteConfirm(false)
      setPaymentToDelete(null)
      await reloadData()
    }
  }

  const handleExport = async (exportFormat: 'csv' | 'excel' = 'csv') => {
    if (payments.length === 0) { setToast({ message: 'Aucune donnée à exporter', type: 'warning' }); return }
    
    const exportData = payments.map(payment => ({
      'Locataire': `${payment.tenants?.first_name || ''} ${payment.tenants?.last_name || ''}`,
      'Propriété': payment.contracts?.properties?.name || 'N/A',
      'Montant (FCFA)': payment.amount,
      'Statut': payment.status === 'paid' ? 'Payé' : payment.status === 'pending' ? 'En attente' : 'En retard',
      'Date de paiement': payment.date ? format(new Date(payment.date), 'dd/MM/yyyy') : 'N/A',
      'Date d\'échéance': payment.due_date ? format(new Date(payment.due_date), 'dd/MM/yyyy') : 'N/A',
      'Méthode': payment.method === 'bank_transfer' ? 'Virement' : payment.method === 'check' ? 'Chèque' : payment.method === 'cash' ? 'Espèces' : 'En ligne',
      'Référence': payment.reference || 'N/A',
    }))

    if (exportFormat === 'csv') {
      const headers = Object.keys(exportData[0])
      const csvContent = [headers.join(';'), ...exportData.map(row => headers.map(h => row[h as keyof typeof row]).join(';'))].join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `paiements_${format(new Date(), 'yyyy-MM-dd')}.csv`
      link.click()
      setToast({ message: 'Export CSV réussi !', type: 'success' })
    } else {
      const { utils, writeFile } = await import('xlsx')
      const ws = utils.json_to_sheet(exportData)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Paiements')
      writeFile(wb, `paiements_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
      setToast({ message: 'Export Excel réussi !', type: 'success' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'late': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />
      case 'late': return <AlertCircle className="w-5 h-5 text-red-600" />
      default: return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const handlePrintReceipt = async (payment: PaymentWithRelations) => {
    const user = currentUser
    if (!user) return

    // Récupérer tous les paiements avec la même référence pour afficher les mois multiples
    const { data: relatedPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', payment.reference)
      .eq('tenant_id', payment.tenant_id)
      .order('due_date', { ascending: true })

    const isMultiplePayment = relatedPayments && relatedPayments.length > 1

    const receiptNumber = payment.id ? `REC-${payment.id.slice(0, 8).toUpperCase()}` : `REC-${Date.now()}`

    const receiptData = {
      receiptNumber,
      date: new Date().toLocaleDateString('fr-FR'),
      tenant: {
        firstName: payment.tenants?.first_name || '',
        lastName: payment.tenants?.last_name || '',
        email: payment.tenants?.email,
        phone: payment.tenants?.phone,
      },
      property: {
        name: payment.contracts?.properties?.name || '',
        address: payment.contracts?.properties?.address || '',
        type: payment.contracts?.properties?.type || 'rent',
      },
      unit: payment.contracts?.units ? {
        name: payment.contracts.units.name,
        type: payment.contracts.units.type,
      } : undefined,
      payment: {
        amount: isMultiplePayment && relatedPayments 
          ? relatedPayments.reduce((sum, p) => sum + p.amount, 0)
          : payment.amount,
        date: payment.date ? format(new Date(payment.date), 'dd/MM/yyyy') : '',
        dueDate: payment.due_date ? format(new Date(payment.due_date), 'dd/MM/yyyy') : '',
        method: payment.method || 'bank_transfer',
        reference: payment.reference || '',
        period: payment.due_date ? format(new Date(payment.due_date), 'MMMM yyyy', { locale: fr }) : '',
        status: payment.status,
        monthCount: isMultiplePayment ? relatedPayments?.length : 1,
        months: isMultiplePayment && relatedPayments ? relatedPayments.map(p => ({
          month: p.due_date ? format(new Date(p.due_date), 'MMMM yyyy', { locale: fr }) : '',
          amount: p.amount
        })) : [{
          month: payment.due_date ? format(new Date(payment.due_date), 'MMMM yyyy', { locale: fr }) : '',
          amount: payment.amount
        }]
      },
      owner: {
        name: user.user_metadata?.name || 'Propriétaire',
        email: user.email || '',
      },
    }

    const { downloadReceipt } = await import('@/hooks/useReceiptGenerator')
    await downloadReceipt(receiptData)
    setToast({ message: 'Reçu généré avec succès', type: 'success' })
  }

  const filteredPayments = payments.filter(payment => {
    const searchLower = searchTerm.toLowerCase()
    return payment.tenants?.first_name?.toLowerCase().includes(searchLower) ||
           payment.tenants?.last_name?.toLowerCase().includes(searchLower) ||
           payment.reference?.toLowerCase().includes(searchLower)
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            Paiements
          </h1>
          <p className="text-gray-500 mt-2">Suivez vos revenus locatifs</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative group">
            <Button variant="secondary">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[200px]">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-t-xl flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <div><p className="text-sm font-medium">Exporter en CSV</p></div>
              </button>
              <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-b-xl flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                <div><p className="text-sm font-medium">Exporter en Excel</p></div>
              </button>
            </div>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Enregistrer un paiement
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Revenu total</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{stats.totalRevenue.toLocaleString()} FCFA</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600/20" />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Attendus ce mois</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{stats.expectedRevenue.toLocaleString()} FCFA</p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-600/20" />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Payés ce mois</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{stats.paidThisMonth.toLocaleString()} FCFA</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600/20" />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">En retard</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{stats.latePayments}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600/20" />
          </div>
        </GlassCard>
      </div>

      {/* Filtres */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2 flex-wrap">
            {[{ value: 'all', label: 'Tous' }, { value: 'paid', label: 'Payés' }, { value: 'pending', label: 'En attente' }, { value: 'late', label: 'En retard' }].map((filter) => (
              <button key={filter.value} onClick={() => setFilterStatus(filter.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterStatus === filter.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-500" />
          </div>
        </div>
      </GlassCard>

      {/* Liste des paiements */}
      {filteredPayments.length === 0 ? (
        <EmptyState title="Aucun paiement" description="Aucun paiement n'a encore été enregistré." action={{ label: 'Enregistrer un paiement', onClick: () => setShowAddModal(true) }} />
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => (
            <GlassCard key={payment.id} className="hover:scale-[1.01] transition-transform">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-50 rounded-xl">{getStatusIcon(payment.status)}</div>
                  <div>
                    <h3 className="font-semibold">{payment.tenants?.first_name} {payment.tenants?.last_name}</h3>
                    <p className="text-sm text-gray-500">Loyer - {payment.contracts?.properties?.name || 'Propriété'}</p>
                    {payment.reference && <p className="text-xs text-gray-400 mt-1">Réf: {payment.reference}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-lg">{payment.amount.toLocaleString()} FCFA</p>
                    <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status === 'paid' ? 'Payé' : payment.status === 'pending' ? 'En attente' : 'En retard'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" />Échéance: {payment.due_date ? format(new Date(payment.due_date), 'dd/MM/yyyy') : 'N/A'}</p>
                    {payment.date && <p className="flex items-center mt-1"><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" />Payé le: {format(new Date(payment.date), 'dd/MM/yyyy')}</p>}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setSelectedPayment(payment); setShowEditModal(true) }}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => { setPaymentToDelete(payment.id); setShowDeleteConfirm(true) }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handlePrintReceipt(payment)}>
                      <Printer className="w-4 h-4 mr-1" />Reçu
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Modal Ajout */}
      {showAddModal && (
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
          <PaymentForm contracts={contracts} onSubmit={handleAddPayment} onCancel={() => setShowAddModal(false)} userId={currentUser?.id} />
        </Modal>
      )}

      {/* Modal Modification */}
      {showEditModal && selectedPayment && (
        <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedPayment(null) }}>
          <PaymentForm contracts={contracts} initialData={selectedPayment} onSubmit={handleUpdatePayment} onCancel={() => { setShowEditModal(false); setSelectedPayment(null) }} userId={currentUser?.id} />
        </Modal>
      )}

      {/* Modal Suppression */}
      {showDeleteConfirm && (
        <Modal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setPaymentToDelete(null) }}>
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto"><Trash2 className="w-8 h-8 text-red-600" /></div>
            <h2 className="text-xl font-bold">Supprimer le paiement ?</h2>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowDeleteConfirm(false); setPaymentToDelete(null) }}>Annuler</Button>
              <Button variant="danger" className="flex-1" onClick={handleDeletePayment}>Supprimer</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

// Formulaire
interface PaymentFormData {
  contract_id: string
  tenant_id: string
  amount: number
  date: string
  due_date: string
  status: Payment['status']
  method: Payment['method']
  reference: string
  months_to_pay?: number
}

function PaymentForm({ contracts, initialData, onSubmit, onCancel, userId }: {
  contracts: (Contract & { properties?: Property; tenants?: Tenant; units?: Unit })[]
  userId?: string
  initialData?: Partial<PaymentFormData>
  onSubmit: (data: PaymentFormData) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    contract_id: initialData?.contract_id || '',
    tenant_id: initialData?.tenant_id || '',
    amount: initialData?.amount || 0,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    due_date: initialData?.due_date || '',
    status: initialData?.status || 'pending',
    method: initialData?.method || 'bank_transfer',
    reference: initialData?.reference || '',
    months_to_pay: initialData?.months_to_pay || 1,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [duplicateMonths, setDuplicateMonths] = useState<string[]>([])
  const [validating, setValidating] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])

  // Vérification en temps réel des doublons
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!formData.contract_id || !formData.tenant_id || !formData.due_date || !userId) {
        setDuplicateMonths([])
        return
      }

      setValidating(true)
      const contract = contracts.find(c => c.id === formData.contract_id)
      if (!contract) {
        setValidating(false)
        return
      }

      const monthsToPay = formData.months_to_pay || 1
      const startDate = new Date(formData.due_date)
      const duplicates: string[] = []

      const { data: existingPayments } = await supabase
        .from('payments')
        .select('*, contracts(property_id)')
        .eq('tenant_id', formData.tenant_id)
        .eq('user_id', userId)

      if (existingPayments) {
        for (let i = 0; i < monthsToPay; i++) {
          const dueDate = new Date(startDate)
          dueDate.setMonth(dueDate.getMonth() + i)
          const paymentMonth = dueDate.getMonth()
          const paymentYear = dueDate.getFullYear()

          const hasDuplicate = existingPayments.some(payment => {
            const existingDate = new Date(payment.due_date)
            const existingMonth = existingDate.getMonth()
            const existingYear = existingDate.getFullYear()
            const existingPropertyId = payment.contracts?.property_id

            return existingMonth === paymentMonth &&
                   existingYear === paymentYear &&
                   existingPropertyId === contract.property_id
          })

          if (hasDuplicate) {
            duplicates.push(dueDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
          }
        }
      }

      setDuplicateMonths(duplicates)
      setValidating(false)
    }

    checkDuplicates()
  }, [formData.contract_id, formData.tenant_id, formData.due_date, formData.months_to_pay, contracts, userId])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.contract_id) newErrors.contract_id = 'Sélectionnez un contrat'
    if (!formData.tenant_id) newErrors.tenant_id = 'Sélectionnez un locataire'
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Le montant doit être supérieur à 0'
    if (!formData.date) newErrors.date = 'Date requise'
    if (!formData.due_date) newErrors.due_date = 'Date d\'échéance requise'
    if (duplicateMonths.length > 0) newErrors.duplicate = 'Conflit de paiement détecté'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setSubmitting(true)
    await onSubmit(formData)
    setSubmitting(false)
  }

  const totalAmount = formData.amount * (formData.months_to_pay || 1)

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">{initialData ? 'Modifier le paiement' : 'Enregistrer un paiement'}</h2>

      {/* Sélection du contrat */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contrat *</label>
        <select value={formData.contract_id} onChange={(e) => {
          const contractId = e.target.value
          const contract = contracts.find(c => c.id === contractId)
          setFormData({ ...formData, contract_id: contractId, tenant_id: contract?.tenant_id || '', amount: contract?.monthly_rent || formData.amount })
        }} className={`w-full px-4 py-2.5 rounded-xl border ${errors.contract_id ? 'border-red-300' : 'border-gray-200'}`}>
          <option value="">Sélectionnez un contrat</option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.properties?.name} - {contract.tenants?.first_name} {contract.tenants?.last_name} ({contract.monthly_rent} FCFA/mois)
            </option>
          ))}
        </select>
        {errors.contract_id && <p className="mt-1 text-sm text-red-500">{errors.contract_id}</p>}
      </div>

      {/* Montant */}
      <Input label="Montant (FCFA) *" type="number" min="0" step="10" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} error={errors.amount} />

      {/* Sélection des mois à payer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Nombre de mois à payer</label>
        <select value={formData.months_to_pay || 1} onChange={(e) => {
          const months = parseInt(e.target.value)
          setFormData({ ...formData, months_to_pay: months })
          // Réinitialiser les mois sélectionnés
          setSelectedMonths(Array.from({ length: months }, (_, i) => i))
        }} className="w-full px-4 py-2.5 rounded-xl border border-gray-200">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
            <option key={num} value={num}>{num} mois{num > 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>

      {/* Affichage des mois avec détection des doublons */}
      {formData.due_date && formData.months_to_pay > 1 && (
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-blue-900">Mois à payer:</p>
            {validating && <span className="text-xs text-blue-600 animate-pulse">Vérification...</span>}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {Array.from({ length: formData.months_to_pay }, (_, i) => {
              const date = new Date(formData.due_date)
              date.setMonth(date.getMonth() + i)
              const monthName = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
              const fullMonthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              const isDuplicate = duplicateMonths.includes(fullMonthName)
              
              return (
                <span key={i} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isDuplicate 
                    ? 'bg-red-100 text-red-700 border border-red-300' 
                    : 'bg-blue-100 text-blue-700 border border-blue-300'
                }`} title={isDuplicate ? `Doublon détecté pour ${fullMonthName}` : monthName}>
                  {monthName}
                  {isDuplicate && <span className="ml-1">⚠️</span>}
                </span>
              )
            })}
          </div>

          {/* Message d'alerte si doublons */}
          {duplicateMonths.length > 0 && (
            <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Attention - Paiements en conflit</p>
                <p className="text-xs text-red-700 mt-1">Un paiement existe déjà pour: <span className="font-semibold">{duplicateMonths.join(', ')}</span></p>
                <p className="text-xs text-red-600 mt-1">Ces mois seront bloqués. Veuillez sélectionner d'autres mois.</p>
              </div>
            </div>
          )}

          {/* Résumé du coût */}
          <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Montant total:</span>
              <span className="text-lg font-bold text-blue-600">{totalAmount.toLocaleString()} FCFA</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{formData.amount.toLocaleString()} FCFA × {formData.months_to_pay} mois</p>
          </div>
        </div>
      )}

      {/* Résumé pour 1 mois */}
      {formData.due_date && formData.months_to_pay === 1 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Montant total:</span>
            <span className="text-lg font-bold text-blue-600">{totalAmount.toLocaleString()} FCFA</span>
          </div>
        </div>
      )}

      {/* Dates de paiement */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Date de paiement *" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} error={errors.date} />
        <Input label="Date d'échéance *" type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} error={errors.due_date} />
      </div>

      {/* Statut et Méthode */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Payment['status'] })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200">
            <option value="pending">En attente</option>
            <option value="paid">Payé</option>
            <option value="late">En retard</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Méthode</label>
          <select value={formData.method} onChange={(e) => setFormData({ ...formData, method: e.target.value as Payment['method'] })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200">
            <option value="bank_transfer">Virement bancaire</option>
            <option value="check">Chèque</option>
            <option value="cash">Espèces</option>
            <option value="online">Paiement en ligne</option>
          </select>
        </div>
      </div>

      {/* Référence */}
      <Input label="Référence" placeholder="Numéro de référence ou note..." value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} />

      {/* Message d'erreur global */}
      {errors.duplicate && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Impossible de créer ces paiements</p>
            <p className="text-xs text-red-700 mt-1">{errors.duplicate}</p>
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-3 sticky bottom-0 bg-white pt-4 border-t mt-6">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="flex-1" loading={submitting} disabled={duplicateMonths.length > 0}>
          {duplicateMonths.length > 0 ? 'Paiements bloqués' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
