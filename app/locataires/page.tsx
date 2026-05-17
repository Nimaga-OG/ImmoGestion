// app/locataires/page.tsx - VERSION COMPLÈTE
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
  Plus, Users, Edit, Trash2, Search, Phone,
  Mail, MapPin, Calendar, FileText, User
} from 'lucide-react'
import type { Tenant } from '@/lib/database.types'

type TenantFormData = {
  first_name: string
  last_name: string
  email: string
  phone: string
  emergency_contact: string
  profession: string
  notes: string
}

type TenantFormProps = {
  initialData?: Partial<TenantFormData>
  onSubmit: (data: TenantFormData) => void
  onCancel: () => void
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning'
  } | null>(null)

  const loadTenants = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setCurrentUser(user)

    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setTenants(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line
    void loadTenants()
  }, [loadTenants])

  const handleAddTenant = async (formData: TenantFormData) => {
    const user = currentUser
    if (!user) return

    const { error } = await supabase
      .from('tenants')
      .insert([{ ...formData, user_id: user.id }])

    if (error) {
      setToast({ message: 'Erreur lors de l\'ajout du locataire', type: 'error' })
    } else {
      setToast({ message: 'Locataire ajouté avec succès', type: 'success' })
      setShowAddModal(false)
      loadTenants()
    }
  }

  const handleUpdateTenant = async (formData: TenantFormData) => {
    if (!selectedTenant) return

    const { error } = await supabase
      .from('tenants')
      .update(formData)
      .eq('id', selectedTenant.id)

    if (error) {
      setToast({ message: 'Erreur lors de la modification', type: 'error' })
    } else {
      setToast({ message: 'Locataire modifié avec succès', type: 'success' })
      setSelectedTenant(null)
      loadTenants()
    }
  }

  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return

    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantToDelete)

    if (error) {
      setToast({ message: 'Erreur lors de la suppression', type: 'error' })
    } else {
      setToast({ message: 'Locataire supprimé avec succès', type: 'success' })
      setShowDeleteConfirm(false)
      setTenantToDelete(null)
      loadTenants()
    }
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.phone.includes(searchTerm)
  )

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            Locataires
          </h1>
          <p className="text-gray-500 mt-2">
            {tenants.length} locataire{tenants.length > 1 ? 's' : ''} enregistré{tenants.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau locataire
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un locataire par nom, email ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </GlassCard>

      {/* Liste des locataires */}
      {filteredTenants.length === 0 ? (
        <EmptyState
          title="Aucun locataire"
          description="Vous n'avez pas encore de locataire enregistré. Commencez par en ajouter un !"
          action={{
            label: 'Nouveau locataire',
            onClick: () => setShowAddModal(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => (
            <GlassCard key={tenant.id} className="hover:scale-[1.02] transition-transform">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {tenant.first_name} {tenant.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">{tenant.profession || 'Profession non spécifiée'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedTenant(tenant)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setTenantToDelete(tenant.id)
                      setShowDeleteConfirm(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${tenant.email}`} className="text-blue-600 hover:underline">
                    {tenant.email}
                  </a>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${tenant.phone}`} className="text-blue-600 hover:underline">
                    {tenant.phone}
                  </a>
                </div>

                {tenant.emergency_contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Contact urgence: {tenant.emergency_contact}</span>
                  </div>
                )}

                {tenant.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-gray-600 line-clamp-2">{tenant.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Ajouté le {new Date(tenant.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Modal Ajout/Modification Locataire */}
      {(showAddModal || selectedTenant) && (
        <Modal
          isOpen={showAddModal || !!selectedTenant}
          onClose={() => {
            setShowAddModal(false)
            setSelectedTenant(null)
          }}
        >
          <TenantForm
            initialData={selectedTenant || undefined}
            onSubmit={selectedTenant ? handleUpdateTenant : handleAddTenant}
            onCancel={() => {
              setShowAddModal(false)
              setSelectedTenant(null)
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
            setTenantToDelete(null)
          }}
        >
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Supprimer le locataire ?</h2>
            <p className="text-gray-500">
              Cette action est irréversible. Toutes les données du locataire seront supprimées.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setTenantToDelete(null)
                }}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDeleteTenant}
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

// Composant Formulaire Locataire
function TenantForm({ initialData, onSubmit, onCancel }: TenantFormProps) {
  const [formData, setFormData] = useState<TenantFormData>({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    emergency_contact: initialData?.emergency_contact || '',
    profession: initialData?.profession || '',
    notes: initialData?.notes || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.first_name.trim()) newErrors.first_name = 'Prénom requis'
    if (!formData.last_name.trim()) newErrors.last_name = 'Nom requis'
    if (!formData.email.trim()) newErrors.email = 'Email requis'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email invalide'
    if (!formData.phone.trim()) newErrors.phone = 'Téléphone requis'

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
        {initialData ? 'Modifier le locataire' : 'Nouveau locataire'}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Prénom *"
          value={formData.first_name}
          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          error={errors.first_name}
          placeholder="Jean"
        />

        <Input
          label="Nom *"
          value={formData.last_name}
          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          error={errors.last_name}
          placeholder="Dupont"
        />
      </div>

      <Input
        label="Email *"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
        placeholder="jean.dupont@email.com"
      />

      <Input
        label="Téléphone *"
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        error={errors.phone}
        placeholder="+33 6 12 34 56 78"
      />

      <Input
        label="Profession"
        value={formData.profession}
        onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
        placeholder="Ingénieur, Enseignant, etc."
      />

      <Input
        label="Contact d'urgence"
        value={formData.emergency_contact}
        onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
        placeholder="Nom et téléphone du contact"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Informations supplémentaires..."
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
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
          {initialData ? 'Modifier' : 'Ajouter le locataire'}
        </Button>
      </div>
    </form>
  )
}