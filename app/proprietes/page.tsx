// app/proprietes/page.tsx - VERSION COMPLÈTE ET OPTIMISÉE
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Toast } from '@/components/ui/Toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Plus, MapPin, Home, Edit, Trash2, Search,
  Building2, Calendar, DoorOpen
} from 'lucide-react'
import type { Property } from '@/lib/database.types'

type PropertyFormData = {
  name: string
  address: string
  type: 'apartment' | 'house' | 'commercial' | 'land'
  value: number
  units: number
  status: 'available' | 'rented' | 'maintenance'
  description: string
}

type PropertyFormProps = {
  initialData?: Partial<PropertyFormData>
  onSubmit: (data: PropertyFormData) => void
  onCancel: () => void
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning'
  } | null>(null)

  const loadProperties = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setProperties(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line
    void loadProperties()
  }, [loadProperties])

  const handleAddProperty = async (formData: PropertyFormData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('properties')
      .insert([{ ...formData, user_id: user.id }])

    if (error) {
      setToast({ message: 'Erreur lors de l\'ajout de la propriété', type: 'error' })
    } else {
      setToast({ message: 'Propriété ajoutée avec succès', type: 'success' })
      setShowAddModal(false)
      loadProperties()
    }
  }

  const handleUpdateProperty = async (formData: PropertyFormData) => {
    if (!selectedProperty) return

    const { error } = await supabase
      .from('properties')
      .update(formData)
      .eq('id', selectedProperty.id)

    if (error) {
      setToast({ message: 'Erreur lors de la modification', type: 'error' })
    } else {
      setToast({ message: 'Propriété modifiée avec succès', type: 'success' })
      setSelectedProperty(null)
      loadProperties()
    }
  }

  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyToDelete)

    if (error) {
      setToast({ message: 'Erreur lors de la suppression', type: 'error' })
    } else {
      setToast({ message: 'Propriété supprimée avec succès', type: 'success' })
      setShowDeleteConfirm(false)
      setPropertyToDelete(null)
      loadProperties()
    }
  }

  const getStatusColor = (status: Property['status']) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'rented': return 'bg-blue-100 text-blue-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: Property['status']) => {
    switch (status) {
      case 'available': return 'Disponible'
      case 'rented': return 'Loué'
      case 'maintenance': return 'Maintenance'
      default: return 'Inconnu'
    }
  }

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            Propriétés
          </h1>
          <p className="text-gray-500 mt-2">
            {properties.length} bien{properties.length > 1 ? 's' : ''} immobilier{properties.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une propriété
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une propriété par nom, adresse ou type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </GlassCard>

      {/* Liste des propriétés */}
      {filteredProperties.length === 0 ? (
        <EmptyState
          title="Aucune propriété"
          description="Vous n'avez pas encore ajouté de propriété. Commencez par en ajouter une !"
          action={{
            label: 'Ajouter une propriété',
            onClick: () => setShowAddModal(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <GlassCard key={property.id} className="hover:scale-[1.02] transition-transform cursor-pointer group">
              {/* Image */}
              <div className="relative h-48 bg-gradient-to-br from-blue-100 to-green-100 rounded-xl mb-4 overflow-hidden">
                {property.images && property.images[0] ? (
                  <Image
                    src={property.images[0]}
                    alt={property.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                <span className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(property.status)}`}>
                  {getStatusLabel(property.status)}
                </span>

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedProperty(property)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setPropertyToDelete(property.id)
                      setShowDeleteConfirm(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">{property.name}</h3>

              <div className="flex items-center text-gray-500 mb-2">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm truncate">{property.address}</span>
              </div>

              <div className="flex items-center text-gray-500 mb-4">
                <Home className="w-4 h-4 mr-2" />
                <span className="text-sm capitalize">{property.type}</span>
                {property.units > 1 && (
                  <span className="text-sm ml-2">· {property.units} unités</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Valeur</p>
                  <span className="text-lg font-bold text-blue-600">
                    {property.value?.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(property.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {/* Bouton gérer les unités */}
              <button 
                onClick={() => router.push(`/proprietes/${property.id}/unites`)}
                className="w-full mt-4 py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center"
              >
                <DoorOpen className="w-4 h-4 mr-2" />
                Gérer les unités
              </button>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Modal Ajout/Modification Propriété */}
      {(showAddModal || selectedProperty) && (
        <Modal
          isOpen={showAddModal || !!selectedProperty}
          onClose={() => {
            setShowAddModal(false)
            setSelectedProperty(null)
          }}
        >
          <PropertyForm
            initialData={selectedProperty || undefined}
            onSubmit={selectedProperty ? handleUpdateProperty : handleAddProperty}
            onCancel={() => {
              setShowAddModal(false)
              setSelectedProperty(null)
            }}
          />
        </Modal>
      )}

      {/* Modal Confirmation Suppression */}
      {showDeleteConfirm && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false)
            setPropertyToDelete(null)
          }}
        >
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Supprimer la propriété ?</h2>
            <p className="text-gray-500">
              Cette action est irréversible. Toutes les données de la propriété seront supprimées.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setPropertyToDelete(null)
                }}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDeleteProperty}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Notification */}
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

// Composant Formulaire Propriété
function PropertyForm({ initialData, onSubmit, onCancel }: PropertyFormProps) {
  const [formData, setFormData] = useState<PropertyFormData>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    type: initialData?.type || 'apartment',
    value: initialData?.value || 0,
    units: initialData?.units || 1,
    status: initialData?.status || 'available',
    description: initialData?.description || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Le nom est requis'
    if (!formData.address.trim()) newErrors.address = 'L\'adresse est requise'
    if (formData.value <= 0) newErrors.value = 'La valeur doit être supérieure à 0'
    if (formData.units < 1) newErrors.units = 'Au moins 1 unité'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Erreur soumission:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">
        {initialData ? 'Modifier la propriété' : 'Ajouter une propriété'}
      </h2>

      <Input
        label="Nom de la propriété *"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        placeholder="Ex: Appartement Paris Centre"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Adresse *
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Adresse complète"
          rows={2}
          className={`w-full px-4 py-2 rounded-xl border transition-all resize-none ${
            errors.address
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
          }`}
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-500">{errors.address}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de bien *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as PropertyFormData['type'] })}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="apartment">Appartement</option>
            <option value="house">Maison</option>
            <option value="commercial">Local commercial</option>
            <option value="land">Terrain</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statut *
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as PropertyFormData['status'] })}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="available">Disponible</option>
            <option value="rented">Loué</option>
            <option value="maintenance">En maintenance</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Valeur (FCFA) *"
          type="number"
          min="0"
          step="1000"
          value={formData.value || ''}
          onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
          error={errors.value}
        />

        <Input
          label="Nombre d'unités *"
          type="number"
          min="1"
          value={formData.units}
          onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value) || 1 })}
          error={errors.units}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description du bien..."
          rows={3}
          className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
        />
      </div>

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
          {initialData ? 'Modifier la propriété' : 'Ajouter la propriété'}
        </Button>
      </div>
    </form>
  )
}