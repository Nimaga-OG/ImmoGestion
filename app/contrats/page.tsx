// app/contrats/page.tsx - VERSION COMPLÈTE
'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Toast } from '@/components/ui/Toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { 
  Plus, Download, FileText, Calendar, AlertCircle,
  Clock, CheckCircle2, XCircle, Upload, Search,
  Trash2, Edit, Users
} from 'lucide-react'
import { format, differenceInDays, isAfter } from 'date-fns'
import type { Contract, Property, Tenant, Unit } from '@/lib/database.types'

type ContractWithRelations = Contract & {
  properties?: { name: string; address: string } | null
  tenants?: { first_name: string; last_name: string } | null
  units?: { name: string; type: string } | null
}

type ContractFormData = {
  property_id: string
  unit_id?: string
  tenant_id: string
  start_date: string
  end_date: string
  monthly_rent: number
  deposit: number
  status: Contract['status']
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractWithRelations[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadContractId, setUploadContractId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning'
  } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setCurrentUser(user)

    const [
      { data: contractsData },
      { data: propertiesData },
      { data: unitsData },
      { data: tenantsData }
    ] = await Promise.all([
      supabase.from('contracts').select('*, properties(name, address), tenants(first_name, last_name), units(name, type)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('properties').select('*').eq('user_id', user.id),
      supabase.from('units').select('*').eq('user_id', user.id).in('status', ['available', 'occupied']),
      supabase.from('tenants').select('*').eq('user_id', user.id)
    ])

    if (contractsData) setContracts(contractsData)
    if (propertiesData) setProperties(propertiesData)
    if (unitsData) setUnits(unitsData)
    if (tenantsData) setTenants(tenantsData)
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line
    void loadData()
  }, [loadData])

  const handleAddContract = async (formData: ContractFormData) => {
    const user = currentUser
    if (!user) return

    const { error } = await supabase
      .from('contracts')
      .insert([{ ...formData, user_id: user.id }])

    if (error) {
      console.error('Erreur ajout contrat:', error)
      setToast({ message: 'Erreur lors de l\'ajout du contrat', type: 'error' })
    } else {
      setToast({ message: 'Contrat ajouté avec succès', type: 'success' })
      setShowAddModal(false)
      loadData()
    }
  }

  const handleUpdateContract = async (formData: ContractFormData) => {
    if (!selectedContract) return

    const { error } = await supabase
      .from('contracts')
      .update(formData)
      .eq('id', selectedContract.id)

    if (error) {
      setToast({ message: 'Erreur lors de la modification', type: 'error' })
    } else {
      setToast({ message: 'Contrat modifié avec succès', type: 'success' })
      setSelectedContract(null)
      loadData()
    }
  }

  const handleDeleteContract = async () => {
    if (!contractToDelete) return

    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractToDelete)

    if (error) {
      setToast({ message: 'Erreur lors de la suppression', type: 'error' })
    } else {
      setToast({ message: 'Contrat supprimé avec succès', type: 'success' })
      setShowDeleteConfirm(false)
      setContractToDelete(null)
      loadData()
    }
  }

  const handleUploadDocument = async (file: File) => {
    if (!uploadContractId) return

    const fileName = `contracts/${uploadContractId}/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage
      .from('contracts')
      .upload(fileName, file)

    if (error) {
      setToast({ message: 'Erreur lors de l\'upload', type: 'error' })
    } else {
      const contract = contracts.find(c => c.id === uploadContractId)
      const documents = contract?.documents || []
      
      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(data.path)

      await supabase
        .from('contracts')
        .update({ documents: [...documents, publicUrl] })
        .eq('id', uploadContractId)

      setToast({ message: 'Document ajouté avec succès', type: 'success' })
      setShowUploadModal(false)
      setUploadContractId(null)
      loadData()
    }
  }

  const getContractStatus = (contract: Contract) => {
    const now = new Date()
    const endDate = new Date(contract.end_date)
    const daysUntilExpiry = differenceInDays(endDate, now)

    if (contract.status === 'terminated') return 'terminated'
    if (isAfter(now, endDate)) return 'expired'
    if (daysUntilExpiry <= 30) return 'expiring_soon'
    return 'active'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { 
          color: 'bg-green-100 text-green-800', 
          icon: <CheckCircle2 className="w-4 h-4" />, 
          label: 'Actif' 
        }
      case 'expiring_soon':
        return { 
          color: 'bg-yellow-100 text-yellow-800', 
          icon: <Clock className="w-4 h-4" />, 
          label: 'Expire bientôt' 
        }
      case 'expired':
        return { 
          color: 'bg-red-100 text-red-800', 
          icon: <XCircle className="w-4 h-4" />, 
          label: 'Expiré' 
        }
      case 'terminated':
        return { 
          color: 'bg-gray-100 text-gray-800', 
          icon: <AlertCircle className="w-4 h-4" />, 
          label: 'Résilié' 
        }
    }
  }

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.properties?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.tenants?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.tenants?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || getContractStatus(contract) === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            Contrats & Documents
          </h1>
          <p className="text-gray-500 mt-2">{contracts.length} contrat{contracts.length > 1 ? 's' : ''} enregistré{contracts.length > 1 ? 's' : ''}</p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau contrat
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un contrat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Tous' },
              { value: 'active', label: 'Actifs' },
              { value: 'expiring_soon', label: 'Expire bientôt' },
              { value: 'expired', label: 'Expirés' },
              { value: 'terminated', label: 'Résiliés' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === filter.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Liste des contrats */}
      {filteredContracts.length === 0 ? (
        <EmptyState
          title="Aucun contrat"
          description="Vous n'avez pas encore de contrat. Créez votre premier contrat !"
          action={{
            label: 'Nouveau contrat',
            onClick: () => setShowAddModal(true)
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => {
            const status = getContractStatus(contract)
            const badge = getStatusBadge(status)

            return (
              <GlassCard key={contract.id} className="hover:scale-[1.01] transition-transform">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold">
                        {contract.properties?.name || 'Propriété'}
                      </h3>
                      {contract.units && (
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {contract.units.name}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${badge?.color}`}>
                        {badge?.icon}
                        <span className="ml-1">{badge?.label}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Locataire</p>
                        <p className="font-medium text-sm flex items-center">
                          <Users className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                          {contract.tenants?.first_name} {contract.tenants?.last_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Loyer mensuel</p>
                        <p className="font-medium text-blue-600">
                          {contract.monthly_rent.toLocaleString()} FCFA
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Période</p>
                        <p className="font-medium text-sm flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                          {format(new Date(contract.start_date), 'MM/yyyy')} - {format(new Date(contract.end_date), 'MM/yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Dépôt</p>
                        <p className="font-medium">
                          {contract.deposit?.toLocaleString() || 0} FCFA
                        </p>
                      </div>
                    </div>

                    {/* Documents */}
                    {contract.documents && contract.documents.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {contract.documents.map((doc, index) => (
                          <a
                            key={index}
                            href={doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            Document {index + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 lg:flex-col">
                    <Button 
                      size="sm"
                      onClick={() => {
                        setUploadContractId(contract.id)
                        setShowUploadModal(true)
                      }}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Document
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => setSelectedContract(contract)}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Modifier
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => {
                        setContractToDelete(contract.id)
                        setShowDeleteConfirm(true)
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Modal Ajout/Modification Contrat */}
      <Modal 
        isOpen={showAddModal || !!selectedContract} 
        onClose={() => {
          setShowAddModal(false)
          setSelectedContract(null)
        }}
      >
        <ContractForm
          initialData={selectedContract || undefined}
          properties={properties}
          units={units}
          tenants={tenants}
          onSubmit={selectedContract ? handleUpdateContract : handleAddContract}
          onCancel={() => {
            setShowAddModal(false)
            setSelectedContract(null)
          }}
        />
      </Modal>

      {/* Modal Upload Document */}
      <Modal 
        isOpen={showUploadModal} 
        onClose={() => {
          setShowUploadModal(false)
          setUploadContractId(null)
        }}
      >
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Ajouter un document</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Glissez-déposez votre fichier ou cliquez pour sélectionner
            </p>
            <p className="text-sm text-gray-500 mb-4">
              PDF, Images (max 10MB)
            </p>
            <label>
              <span className="inline-flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 bg-white/20 backdrop-blur-sm border border-white/30 text-gray-800 hover:scale-105 active:scale-95 cursor-pointer">
                Sélectionner un fichier
              </span>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadDocument(file)
                }}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmation Suppression */}
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => {
          setShowDeleteConfirm(false)
          setContractToDelete(null)
        }}
      >
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold">Supprimer le contrat ?</h2>
          <p className="text-gray-500">
            Cette action est irréversible. Toutes les données du contrat seront supprimées.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={() => {
                setShowDeleteConfirm(false)
                setContractToDelete(null)
              }}
            >
              Annuler
            </Button>
            <Button 
              variant="danger" 
              className="flex-1"
              onClick={handleDeleteContract}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// Composant Formulaire Contrat
function ContractForm({ 
  initialData, 
  properties,
  units,
  tenants,
  onSubmit, 
  onCancel 
}: { 
  initialData?: Contract
  properties: Property[]
  units: Unit[]
  tenants: Tenant[]
  onSubmit: (data: ContractFormData) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<ContractFormData>({
    property_id: initialData?.property_id || '',
    unit_id: initialData?.unit_id || '',
    tenant_id: initialData?.tenant_id || '',
    start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
    end_date: initialData?.end_date || '',
    monthly_rent: initialData?.monthly_rent || 0,
    deposit: initialData?.deposit || 0,
    status: initialData?.status || 'active',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.property_id) newErrors.property_id = 'Sélectionnez une propriété'
    if (!formData.tenant_id) newErrors.tenant_id = 'Sélectionnez un locataire'
    if (!formData.start_date) newErrors.start_date = 'Date de début requise'
    if (!formData.end_date) newErrors.end_date = 'Date de fin requise'
    if (formData.monthly_rent <= 0) newErrors.monthly_rent = 'Le loyer doit être supérieur à 0'
    
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        newErrors.end_date = 'La date de fin doit être après la date de début'
      }
    }

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">
        {initialData ? 'Modifier le contrat' : 'Nouveau contrat'}
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Propriété *
        </label>
        <select
          value={formData.property_id}
          onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
          className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
            errors.property_id 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-200 focus:border-blue-500'
          }`}
        >
          <option value="">Sélectionnez une propriété</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name} - {property.address}
            </option>
          ))}
        </select>
        {errors.property_id && (
          <p className="mt-1 text-sm text-red-500">{errors.property_id}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Unité (optionnel)
        </label>
        <select
          value={formData.unit_id || ''}
          onChange={(e) => {
            const unitId = e.target.value
            const unit = units.find(u => u.id === unitId)
            setFormData(prev => ({
              ...prev,
              unit_id: unitId || undefined,
              monthly_rent: unit?.monthly_rent || prev.monthly_rent
            }))
          }}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500"
        >
          <option value="">Sélectionnez une unité (optionnel)</option>
          {units
            .filter(unit => unit.property_id === formData.property_id)
            .filter(unit => {
              // Si c'est une modification et que l'unité est déjà assignée à ce contrat
              if (initialData?.unit_id === unit.id) return true;
              // Sinon, ne montrer que les unités disponibles ou réservées
              return ['available', 'reserved'].includes(unit.status);
            })
            .map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} {unit.status === 'occupied' && initialData?.unit_id === unit.id ? '(Actuelle)' : `(${unit.status === 'available' ? 'Libre' : unit.status === 'reserved' ? 'Réservé' : unit.status})`} - {unit.monthly_rent?.toLocaleString()} FCFA
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Locataire *
        </label>
        <select
          value={formData.tenant_id}
          onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
          className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
            errors.tenant_id 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-200 focus:border-blue-500'
          }`}
        >
          <option value="">Sélectionnez un locataire</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.first_name} {tenant.last_name}
            </option>
          ))}
        </select>
        {errors.tenant_id && (
          <p className="mt-1 text-sm text-red-500">{errors.tenant_id}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date de début *"
          type="date"
          value={formData.start_date}
          onChange={(e) => {
            const start = e.target.value
            setFormData(prev => {
              const updates: Partial<ContractFormData> = { start_date: start }
              if (!initialData && start && !prev.end_date) {
                const startDate = new Date(start)
                startDate.setFullYear(startDate.getFullYear() + 1)
                updates.end_date = startDate.toISOString().split('T')[0]
              }
              return { ...prev, ...updates }
            })
          }}
          error={errors.start_date}
        />

        <Input
          label="Date de fin *"
          type="date"
          value={formData.end_date}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          error={errors.end_date}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Loyer mensuel (FCFA) *"
          type="number"
          min="0"
          step="50"
          value={formData.monthly_rent || ''}
          onChange={(e) => {
            const rent = parseFloat(e.target.value) || 0
            setFormData(prev => ({
              ...prev,
              monthly_rent: rent,
              deposit: !initialData && rent > 0 ? rent * 2 : prev.deposit
            }))
          }}
          error={errors.monthly_rent}
        />

        <Input
          label="Dépôt de garantie (FCFA)"
          type="number"
          min="0"
          step="50"
          value={formData.deposit || ''}
          onChange={(e) => setFormData({ ...formData, deposit: parseFloat(e.target.value) || 0 })}
        />
      </div>

      {initialData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statut
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as Contract['status'] })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 transition-all"
          >
            <option value="active">Actif</option>
            <option value="expired">Expiré</option>
            <option value="terminated">Résilié</option>
          </select>
        </div>
      )}

      {/* Résumé */}
      {formData.monthly_rent > 0 && (
        <div className="bg-blue-50 rounded-xl p-4 space-y-2">
          <h3 className="font-medium text-blue-900">Résumé du contrat</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>Loyer mensuel : {formData.monthly_rent.toLocaleString()} FCFA</p>
            <p>Dépôt : {formData.deposit.toLocaleString()} FCFA</p>
            {formData.start_date && formData.end_date && (
              <p>
                Durée : {differenceInDays(new Date(formData.end_date), new Date(formData.start_date))} jours
                ({(differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) / 30).toFixed(1)} mois)
              </p>
            )}
            <p>Revenu total : {(formData.monthly_rent * (formData.start_date && formData.end_date ? differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) / 30 : 0)).toFixed(0)} FCFA</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 sticky bottom-0 bg-white pt-4 border-t">
        <Button 
          type="button" 
          variant="secondary" 
          className="flex-1"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button 
          type="submit" 
          className="flex-1"
          loading={submitting}
        >
          {initialData ? 'Modifier' : 'Créer le contrat'}
        </Button>
      </div>
    </form>
  )
}

