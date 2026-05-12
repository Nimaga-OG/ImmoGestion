// app/parametres/page.tsx - VERSION COMPLÈTE ET OPTIMISÉE
'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toast } from '@/components/ui/Toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  User, Bell, Shield, Globe,
  Monitor, Eye, EyeOff, Save, RefreshCw
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserProfile {
  full_name: string
  email: string
  phone: string
  currency: string
  date_format: string
  language: string
  theme: 'light' | 'dark' | 'system'
}

interface NotificationSettings {
  email_notifications: boolean
  payment_reminders: boolean
  contract_expiry: boolean
  monthly_reports: boolean
  marketing_emails: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [userData, setUserData] = useState<UserProfile>({
    full_name: '',
    email: '',
    phone: '',
    currency: 'FCFA', // FCFA par défaut
    date_format: 'DD/MM/YYYY',
    language: 'fr',
    theme: 'system'
  })
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    payment_reminders: true,
    contract_expiry: true,
    monthly_reports: false,
    marketing_emails: false
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  })
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning'
  } | null>(null)

  const loadUserData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUser(user)

      // Charger les données utilisateur depuis les métadonnées
      const userMetadata = user.user_metadata || {}
      setUserData({
        full_name: userMetadata.full_name || '',
        email: user.email || '',
        phone: userMetadata.phone || '',
        currency: userMetadata.currency || 'FCFA', // FCFA par défaut
        date_format: userMetadata.date_format || 'DD/MM/YYYY',
        language: userMetadata.language || 'fr',
        theme: userMetadata.theme || 'system'
      })

      // Charger les préférences de notifications (simulation - à implémenter avec une table dédiée)
      setNotifications({
        email_notifications: userMetadata.email_notifications !== false,
        payment_reminders: userMetadata.payment_reminders !== false,
        contract_expiry: userMetadata.contract_expiry !== false,
        monthly_reports: userMetadata.monthly_reports || false,
        marketing_emails: userMetadata.marketing_emails || false
      })

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      setToast({ message: 'Erreur lors du chargement des données', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line
    void loadUserData()
  }, [loadUserData])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: userData.full_name,
          phone: userData.phone,
          currency: userData.currency,
          date_format: userData.date_format,
          language: userData.language,
          theme: userData.theme
        }
      })

      if (error) throw error

      setToast({ message: 'Profil mis à jour avec succès', type: 'success' })
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
      setToast({ message: 'Erreur lors de la mise à jour du profil', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationsUpdate = async () => {
    if (!currentUser) return

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          email_notifications: notifications.email_notifications,
          payment_reminders: notifications.payment_reminders,
          contract_expiry: notifications.contract_expiry,
          monthly_reports: notifications.monthly_reports,
          marketing_emails: notifications.marketing_emails
        }
      })

      if (error) throw error

      setToast({ message: 'Préférences de notifications mises à jour', type: 'success' })
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
      setToast({ message: 'Erreur lors de la mise à jour des notifications', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    if (passwordData.new !== passwordData.confirm) {
      setToast({ message: 'Les mots de passe ne correspondent pas', type: 'error' })
      return
    }

    if (passwordData.new.length < 6) {
      setToast({ message: 'Le mot de passe doit contenir au moins 6 caractères', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      })

      if (error) throw error

      setPasswordData({ current: '', new: '', confirm: '' })
      setToast({ message: 'Mot de passe changé avec succès', type: 'success' })
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error)
      setToast({ message: 'Erreur lors du changement de mot de passe', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'preferences', label: 'Préférences', icon: <Globe className="w-4 h-4" /> },
    { id: 'security', label: 'Sécurité', icon: <Shield className="w-4 h-4" /> },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            Paramètres
          </h1>
          <p className="text-gray-500 mt-2">
            Gérez vos préférences et votre compte • {currentUser?.email}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={loadUserData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                  : 'text-gray-600 hover:bg-white/10 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          <GlassCard>
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Profil utilisateur</h2>
                  <Button
                    type="submit"
                    form="profile-form"
                    loading={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>

                <form id="profile-form" onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <Button variant="secondary" size="sm" type="button">
                        Changer la photo
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG ou GIF (max 2MB)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nom complet"
                      value={userData.full_name}
                      onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                      placeholder="Votre nom complet"
                    />
                    <Input
                      label="Téléphone"
                      value={userData.phone}
                      onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                      placeholder="+225 XX XX XX XX"
                    />
                  </div>

                  <Input
                    label="Email"
                    value={userData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    L&apos;email ne peut pas être modifié. Contactez le support si nécessaire.
                  </p>
                </form>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Préférences de notifications</h2>
                  <Button onClick={handleNotificationsUpdate} loading={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>

                <div className="space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium">
                          {key === 'email_notifications' && 'Notifications par email'}
                          {key === 'payment_reminders' && 'Rappels de paiement'}
                          {key === 'contract_expiry' && 'Expiration des contrats'}
                          {key === 'monthly_reports' && 'Rapports mensuels'}
                          {key === 'marketing_emails' && 'Emails marketing'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {key === 'email_notifications' && 'Recevoir les notifications importantes par email'}
                          {key === 'payment_reminders' && 'Être averti des paiements à venir (7 jours avant)'}
                          {key === 'contract_expiry' && 'Alertes quand un contrat arrive à expiration (30 jours avant)'}
                          {key === 'monthly_reports' && 'Recevoir un rapport mensuel détaillé par email'}
                          {key === 'marketing_emails' && 'Recevoir des offres spéciales et nouveautés'}
                        </p>
                      </div>
                      <button
                        onClick={() => setNotifications({ ...notifications, [key]: !value })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Préférences générales</h2>
                  <Button
                    type="submit"
                    form="preferences-form"
                    loading={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>

                <form id="preferences-form" onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Devise *
                      </label>
                      <select
                        value={userData.currency}
                        onChange={(e) => setUserData({ ...userData, currency: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="FCFA">Franc CFA (FCFA)</option>
                        <option value="EUR">Euro (FCFA)</option>
                        <option value="USD">Dollar américain ($)</option>
                        <option value="GBP">Livre sterling (£)</option>
                        <option value="CHF">Franc suisse (CHF)</option>
                        <option value="XOF">Franc CFA BCEAO (XOF)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Devise utilisée pour afficher les montants
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Format de date
                      </label>
                      <select
                        value={userData.date_format}
                        onChange={(e) => setUserData({ ...userData, date_format: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="DD/MM/YYYY">JJ/MM/AAAA (31/12/2024)</option>
                        <option value="MM/DD/YYYY">MM/JJ/AAAA (12/31/2024)</option>
                        <option value="YYYY-MM-DD">AAAA-MM-JJ (2024-12-31)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Langue
                      </label>
                      <select
                        value={userData.language}
                        onChange={(e) => setUserData({ ...userData, language: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thème
                      </label>
                      <select
                        value={userData.theme}
                        onChange={(e) => setUserData({ ...userData, theme: e.target.value as UserProfile['theme'] })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="light">Clair</option>
                        <option value="dark">Sombre</option>
                        <option value="system">Système</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">Sécurité du compte</h2>

                {/* Changer le mot de passe */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Changer le mot de passe</h3>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="relative">
                      <Input
                        label="Mot de passe actuel"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.current}
                        onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Input
                          label="Nouveau mot de passe"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.new}
                          onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <Input
                        label="Confirmer le mot de passe"
                        type="password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                        required
                      />
                    </div>

                    <Button type="submit" loading={saving}>
                      Changer le mot de passe
                    </Button>
                  </form>
                </div>

                {/* Sessions actives */}
                <div className="p-4 bg-white/5 rounded-xl">
                  <h3 className="font-medium mb-4">Sessions actives</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Monitor className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Navigateur actuel</p>
                          <p className="text-xs text-gray-500">
                            {navigator.userAgent.includes('Chrome') ? 'Chrome' :
                             navigator.userAgent.includes('Firefox') ? 'Firefox' :
                             navigator.userAgent.includes('Safari') ? 'Safari' : 'Navigateur'} • Actif maintenant
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        Actif
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions dangereuses */}
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <h3 className="font-medium text-red-900 mb-2">Zone dangereuse</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Ces actions sont irréversibles. Soyez prudent.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="danger" size="sm">
                      Désactiver le compte
                    </Button>
                    <Button variant="danger" size="sm">
                      Supprimer le compte
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

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