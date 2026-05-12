// app/proprietes/[id]/unites/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Toast } from '@/components/ui/Toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { 
  Plus, ArrowLeft, Building2, Home, DoorOpen, Store, 
  Wrench, CheckCircle2, AlertCircle, MapPin, Users,
  BedDouble, Square, TrendingUp, DollarSign, Trash2, Edit
} from 'lucide-react'
import type { Property, Unit, Tenant, Contract } from '@/lib/database.types'

type UnitWithTenant = Unit & {
  contracts?: (Contract & { tenants?: Tenant })[]
  currentTenant?: Tenant
  currentContract?: Contract
}

export default function PropertyUnitsPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [units, setUnits] = useState<UnitWithTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [unitToDelete, setUnitToDelete] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [stats, setStats] = useState({
    total: 0,
    occupied: 0,
    available: 0,
    maintenance: 0,
    monthlyRevenue: 0,
    potentialRevenue: 0
  })
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning'
  } | null>(null)

  const calculateStats = (data: UnitWithTenant[]) => {
    const occupied = data.filter(u => u.status === 'occupied')
    const monthlyRevenue = occupied.reduce((sum, u) => sum + (u.monthly_rent || 0), 0)
    const potentialRevenue = data.reduce((sum, u) => sum + (u.monthly_rent || 0), 0)

    setStats({
      total: data.length,
      occupied: occupied.length,
      available: data.filter(u => u.status === 'available').length,
      maintenance: data.filter(u => u.status === 'maintenance').length,
      monthlyRevenue,
      potentialRevenue
    })
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    // Charger la propriété
    const { data: propertyData } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single()

    if (!propertyData) {
      setToast({ message: 'Propriété non trouvée', type: 'error' })
      router.push('/proprietes')
      return
    }
    setProperty(propertyData)

    // Charger les unités avec contrats actifs et locataires
    const { data: unitsData } = await supabase
      .from('units')
      .select(`
        *,
        contracts(
          *,
          tenants(*)
        )
      `)
      .eq('property_id', propertyId)
      .eq('user_id', user.id)
      .order('name')

    if (unitsData) {
      // Enrichir avec le locataire actif
      const enrichedUnits = unitsData.map(unit => {
        const activeContract = unit.contracts?.find((c: Contract) => c.status === 'active')
        return {
          ...unit,
          currentContract: activeContract,
          currentTenant: activeContract?.tenants
        }
      })
      setUnits(enrichedUnits)
      calculateStats(enrichedUnits)
    }

    setLoading(false)
  }, [propertyId, router])

  useEffect(() => { void loadData() }, [loadData])

  const handleAddUnit = async (formData: UnitFormData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('units')
      .insert([{
        ...formData,
        property_id: propertyId,
        user_id: user.id
      }])

    if (error) {
      setToast({ message: 'Erreur lors de l\'ajout', type: 'error' })
    } else {
      setToast({ message: 'Unité ajoutée avec succès', type: 'success' })
      setShowAddModal(false)
      loadData()
    }
  }

  const handleUpdateUnit = async (formData: UnitFormData) => {
    if (!selectedUnit) return
    const { error } = await supabase.from('units').update(formData).eq('id', selectedUnit.id)
    if (error) {
      setToast({ message: 'Erreur lors de la modification', type: 'error' })
    } else {
      setToast({ message: 'Unité modifiée avec succès', type: 'success' })
      setShowEditModal(false)
      setSelectedUnit(null)
      loadData()
    }
  }

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return
    const { error } = await supabase.from('units').delete().eq('id', unitToDelete)
    if (error) {
      setToast({ message: 'Erreur lors de la suppression', type: 'error' })
    } else {
      setToast({ message: 'Unité supprimée avec succès', type: 'success' })
      setShowDeleteConfirm(false)
      setUnitToDelete(null)
      loadData()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-green-100 text-green-800 border-green-200'
      case 'available': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'reserved': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'occupied': return 'Occupé'
      case 'available': return 'Libre'
      case 'maintenance': return 'Maintenance'
      case 'reserved': return 'Réservé'
      default: return status
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'apartment': return <Home className="w-5 h-5" />
      case 'room': return <BedDouble className="w-5 h-5" />
      case 'shop': return <Store className="w-5 h-5" />
      case 'office': return <Building2 className="w-5 h-5" />
      default: return <DoorOpen className="w-5 h-5" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'apartment': return 'Appartement'
      case 'room': return 'Chambre'
      case 'shop': return 'Magasin'
      case 'office': return 'Bureau'
      case 'storage': return 'Stockage'
      default: return type
    }
  }

  const filteredUnits = units.filter(unit => {
    const statusMatch = filterStatus === 'all' || unit.status === filterStatus
    const typeMatch = filterType === 'all' || unit.type === filterType
    return statusMatch && typeMatch
  })

  if (loading) return <LoadingSpinner />
  if (!property) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.push('/proprietes')} className="flex items-center text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux propriétés
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            {property.name}
          </h1>
          <p className="text-gray-500 mt-1 flex items-center">
            <MapPin className="w-4 h-4 mr-1" /> {property.address}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une unité
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <GlassCard className="p-4">
          <p className="text-sm text-gray-500">Total unités</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-sm text-gray-500">Occupées</p>
          <p className="text-2xl font-bold text-green-600">{stats.occupied}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-sm text-gray-500">Libres</p>
          <p className="text-2xl font-bold text-blue-600">{stats.available}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-sm text-gray-500">Maintenance</p>
          <p className="text-2xl font-bold text-orange-600">{stats.maintenance}</p>
        </GlassCard>
        <GlassCard className="p-4 col-span-2">
          <p className="text-sm text-gray-500">Revenu mensuel</p>
          <p className="text-xl font-bold text-green-600">{stats.monthlyRevenue.toLocaleString()} FCFA</p>
          <p className="text-xs text-gray-400">/ {stats.potentialRevenue.toLocaleString()} FCFA potentiel</p>
        </GlassCard>
      </div>

      {/* Filtres */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Statut</label>
            <div className="flex gap-2">
              {[{ value: 'all', label: 'Tous' }, { value: 'available', label: 'Libre' }, { value: 'occupied', label: 'Occupé' }, { value: 'maintenance', label: 'Maintenance' }].map(f => (
                <button key={f.value} onClick={() => setFilterStatus(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatus === f.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
            <div className="flex gap-2">
              {[{ value: 'all', label: 'Tous' }, { value: 'apartment', label: 'Appart' }, { value: 'room', label: 'Chambre' }, { value: 'shop', label: 'Magasin' }].map(f => (
                <button key={f.value} onClick={() => setFilterType(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterType === f.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Liste des unités */}
      {filteredUnits.length === 0 ? (
        <EmptyState 
          title="Aucune unité" 
          description="Cette propriété n'a pas encore d'unités. Commencez par en ajouter une."
          action={{ label: 'Ajouter une unité', onClick: () => setShowAddModal(true) }} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((unit) => (
            <GlassCard key={unit.id} className="hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">{getTypeIcon(unit.type)}</div>
                  <div>
                    <h3 className="font-semibold">{unit.name}</h3>
                    <span className="text-xs text-gray-500">{getTypeLabel(unit.type)}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(unit.status)}`}>
                  {getStatusLabel(unit.status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {unit.area && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Square className="w-4 h-4 mr-2 text-gray-400" />
                    {unit.area} m²
                  </div>
                )}
                {unit.floor !== undefined && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                    Étage {unit.floor}
                  </div>
                )}
                {unit.rooms && (
                  <div className="flex items-center text-sm text-gray-600">
                    <BedDouble className="w-4 h-4 mr-2 text-gray-400" />
                    {unit.rooms} pièce{unit.rooms > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {unit.currentTenant ? (
                <div className="bg-green-50 p-3 rounded-lg mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {unit.currentTenant.first_name} {unit.currentTenant.last_name}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Loyer: {unit.currentContract?.monthly_rent?.toLocaleString()} FCFA
                  </p>
                </div>
              ) : unit.status === 'available' ? (
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <p className="text-sm text-blue-600 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Disponible à la location
                  </p>
                </div>
              ) : unit.status === 'maintenance' ? (
                <div className="bg-orange-50 p-3 rounded-lg mb-3">
                  <p className="text-sm text-orange-600 flex items-center">
                    <Wrench className="w-4 h-4 mr-2" />
                    En travaux
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-3 border-t">
                <div>
                  <p className="text-xs text-gray-500">Loyer mensuel</p>
                  <p className="font-bold text-blue-600">{unit.monthly_rent?.toLocaleString()} FCFA</p>
                </div>
                <div className="flex gap-2">
                  {unit.status === 'available' && (
                    <Button variant="primary" size="sm" onClick={() => router.push(`/contrats?unit=${unit.id}`)}>
                      Louer
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => { setSelectedUnit(unit); setShowEditModal(true) }}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => { setUnitToDelete(unit.id); setShowDeleteConfirm(true) }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Modal Ajout */}
      {showAddModal && (
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
          <UnitForm onSubmit={handleAddUnit} onCancel={() => setShowAddModal(false)} />
        </Modal>
      )}

      {/* Modal Modification */}
      {showEditModal && selectedUnit && (
        <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedUnit(null) }}>
          <UnitForm initialData={selectedUnit} onSubmit={handleUpdateUnit} onCancel={() => { setShowEditModal(false); setSelectedUnit(null) }} />
        </Modal>
      )}

      {/* Modal Suppression */}
      {showDeleteConfirm && (
        <Modal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setUnitToDelete(null) }}>
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Supprimer cette unité ?</h2>
            <p className="text-gray-500">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowDeleteConfirm(false); setUnitToDelete(null) }}>Annuler</Button>
              <Button variant="danger" className="flex-1" onClick={handleDeleteUnit}>Supprimer</Button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

// Formulaire d'unité
interface UnitFormData {
  name: string
  type: 'apartment' | 'room' | 'shop' | 'office' | 'storage'
  area?: number
  floor?: number
  rooms?: number
  monthly_rent: number
  charges?: number
  deposit?: number
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  description?: string
}

function UnitForm({ initialData, onSubmit, onCancel }: {
  initialData?: Partial<Unit>
  onSubmit: (data: UnitFormData) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<UnitFormData>({
    name: initialData?.name || '',
    type: initialData?.type || 'apartment',
    area: initialData?.area,
    floor: initialData?.floor,
    rooms: initialData?.rooms,
    monthly_rent: initialData?.monthly_rent || 0,
    charges: initialData?.charges || 0,
    deposit: initialData?.deposit || 0,
    status: initialData?.status || 'available',
    description: initialData?.description || ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Nom requis'
    if (formData.monthly_rent < 0) newErrors.monthly_rent = 'Loyer invalide'
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">{initialData ? 'Modifier l\'unité' : 'Nouvelle unité'}</h2>

      <Input label="Nom de l'unité *" placeholder="Ex: Appartement 1A, Chambre 3, Magasin A" 
        value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} error={errors.name} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as UnitFormData['type'] })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200">
            <option value="apartment">Appartement</option>
            <option value="room">Chambre</option>
            <option value="shop">Magasin</option>
            <option value="office">Bureau</option>
            <option value="storage">Stockage</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as UnitFormData['status'] })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200">
            <option value="available">Libre</option>
            <option value="occupied">Occupé</option>
            <option value="maintenance">Maintenance</option>
            <option value="reserved">Réservé</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input label="Superficie (m²)" type="number" min="0" step="0.1"
          value={formData.area || ''} onChange={(e) => setFormData({ ...formData, area: parseFloat(e.target.value) || undefined })} />
        <Input label="Étage" type="number"
          value={formData.floor || ''} onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || undefined })} />
        <Input label="Pièces" type="number" min="0"
          value={formData.rooms || ''} onChange={(e) => setFormData({ ...formData, rooms: parseInt(e.target.value) || undefined })} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input label="Loyer mensuel (FCFA) *" type="number" min="0" step="1000"
          value={formData.monthly_rent || ''} onChange={(e) => setFormData({ ...formData, monthly_rent: parseFloat(e.target.value) || 0 })} error={errors.monthly_rent} />
        <Input label="Charges (FCFA)" type="number" min="0" step="1000"
          value={formData.charges || ''} onChange={(e) => setFormData({ ...formData, charges: parseFloat(e.target.value) || 0 })} />
        <Input label="Caution (FCFA)" type="number" min="0" step="1000"
          value={formData.deposit || ''} onChange={(e) => setFormData({ ...formData, deposit: parseFloat(e.target.value) || 0 })} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500" 
          placeholder="Équipements, particularités..." />
      </div>

      <div className="flex gap-3 sticky bottom-0 bg-white pt-4 border-t">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="flex-1" loading={submitting}>Enregistrer</Button>
      </div>
    </form>
  )
}
