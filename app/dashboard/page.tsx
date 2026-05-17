// app/dashboard/page.tsx - VERSION COMPLÈTE ET OPTIMISÉE
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
  Plus,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DashboardStats {
  properties: number
  tenants: number
  monthlyRevenue: number
  latePayments: number
  occupancyRate: number
  totalRevenue: number
}

interface RecentPayment {
  id: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  due_date: string
  paid_date?: string
  tenant: { first_name: string; last_name: string }
  property: { name: string; address: string }
}

interface SupabasePayment {
  id: string
  amount: number
  status: string
  due_date: string
  paid_date?: string
  tenants: { first_name: string; last_name: string } | { first_name: string; last_name: string }[]
  properties: { name: string; address: string } | { name: string; address: string }[]
}

interface SupabaseContract {
  id: string
  end_date: string
  properties: { name: string; address: string } | { name: string; address: string }[]
  tenants: { first_name: string; last_name: string } | { first_name: string; last_name: string }[]
}

interface UpcomingContract {
  id: string
  property: { name: string; address: string }
  tenant: { first_name: string; last_name: string }
  end_date: string
  days_until_expiry: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    properties: 0,
    tenants: 0,
    monthlyRevenue: 0,
    latePayments: 0,
    occupancyRate: 0,
    totalRevenue: 0
  })
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [upcomingContracts, setUpcomingContracts] = useState<UpcomingContract[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const router = useRouter()

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setCurrentUser(user)

    try {
      const now = new Date()
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)
      const thirtyDaysFromNow = addDays(now, 30)

      const [
        { data: properties },
        { data: tenants },
        { data: monthlyPayments },
        { data: allPayments },
        { data: overduePayments },
        { data: activeContracts },
        { data: recentPaymentsData },
        { data: expiringContracts }
      ] = await Promise.all([
        supabase.from('properties').select('*').eq('user_id', user.id),
        supabase.from('tenants').select('*').eq('user_id', user.id),
        supabase.from('payments').select('amount, status').eq('user_id', user.id).eq('status', 'paid').gte('paid_date', monthStart.toISOString()).lte('paid_date', monthEnd.toISOString()),
        supabase.from('payments').select('amount, status').eq('user_id', user.id).eq('status', 'paid'),
        supabase.from('payments').select('id').eq('user_id', user.id).eq('status', 'pending').lt('due_date', now.toISOString()),
        supabase.from('contracts').select('id').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('payments').select(`
          id, amount, status, due_date, paid_date,
          tenants!inner(first_name, last_name),
          properties!inner(name, address)
        `).eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('contracts').select(`
          id, end_date,
          properties!inner(name, address),
          tenants!inner(first_name, last_name)
        `).eq('user_id', user.id).eq('status', 'active').lte('end_date', thirtyDaysFromNow.toISOString()).order('end_date', { ascending: true }).limit(5)
      ])

      const occupancyRate = properties && properties.length > 0
        ? Math.round((activeContracts?.length || 0) / properties.length * 100)
        : 0

      const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + p.amount, 0) || 0
      const totalRevenue = allPayments?.reduce((sum, p) => sum + p.amount, 0) || 0

      setStats({
        properties: properties?.length || 0,
        tenants: tenants?.length || 0,
        monthlyRevenue,
        latePayments: overduePayments?.length || 0,
        occupancyRate,
        totalRevenue
      })

      if (recentPaymentsData) {
        const formattedPayments: RecentPayment[] = (recentPaymentsData as SupabasePayment[]).map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status as RecentPayment['status'],
          due_date: payment.due_date,
          paid_date: payment.paid_date,
          tenant: Array.isArray(payment.tenants) ? payment.tenants[0] : payment.tenants,
          property: Array.isArray(payment.properties) ? payment.properties[0] : payment.properties
        }))
        setRecentPayments(formattedPayments)
      }

      if (expiringContracts) {
        const formattedContracts: UpcomingContract[] = (expiringContracts as SupabaseContract[]).map((contract) => ({
          id: contract.id,
          property: Array.isArray(contract.properties) ? contract.properties[0] : contract.properties,
          tenant: Array.isArray(contract.tenants) ? contract.tenants[0] : contract.tenants,
          end_date: contract.end_date,
          days_until_expiry: Math.ceil((new Date(contract.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }))
        setUpcomingContracts(formattedContracts)
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line
    void loadDashboardData()
  }, [loadDashboardData])

  const getPaymentStatusColor = (status: RecentPayment['status']) => {
    switch (status) {
      case 'paid': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'overdue': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getPaymentStatusIcon = (status: RecentPayment['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'overdue': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            Tableau de bord
          </h1>
          <p className="text-gray-500 mt-2">
            Bienvenue sur votre espace de gestion • {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">
            <TrendingUp className="w-4 h-4 mr-2" />
            Rapport mensuel
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un bien
          </Button>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Biens immobiliers"
          value={stats.properties}
          change={stats.properties > 0 ? Math.round((stats.tenants / stats.properties) * 100) : 0}
          icon={<Building2 className="w-6 h-6 text-blue-600" />}
        />
        <StatCard
          title="Locataires actifs"
          value={stats.tenants}
          change={stats.tenants}
          icon={<Users className="w-6 h-6 text-green-600" />}
        />
        <StatCard
          title="Revenus du mois"
          value={`${stats.monthlyRevenue.toLocaleString('fr-FR')} FCFA`}
          change={stats.monthlyRevenue > 0 ? 15 : 0}
          icon={<CreditCard className="w-6 h-6 text-purple-600" />}
        />
        <StatCard
          title="Paiements en retard"
          value={stats.latePayments}
          change={stats.latePayments > 0 ? -20 : 0}
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
        />
      </div>

      {/* Métriques supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Taux d&apos;occupation</p>
              <p className="text-2xl font-bold text-blue-600">{stats.occupancyRate}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Revenus totaux</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalRevenue.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Contrats actifs</p>
              <p className="text-2xl font-bold text-purple-600">{stats.tenants}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Sections principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paiements récents */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Paiements récents</h2>
            <Button variant="secondary" size="sm">
              Voir tout
            </Button>
          </div>

          {recentPayments.length === 0 ? (
            <EmptyState
              title="Aucun paiement"
              description="Les paiements récents apparaîtront ici"
            />
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getPaymentStatusColor(payment.status)} bg-current/10`}>
                      {getPaymentStatusIcon(payment.status)}
                    </div>
                    <div>
                      <p className="font-medium">
                        {payment.tenant.first_name} {payment.tenant.last_name}
                      </p>
                      <p className="text-sm text-gray-500 truncate max-w-48">
                        {payment.property.name} • {payment.property.address}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getPaymentStatusColor(payment.status)}`}>
                      {payment.amount.toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.status === 'paid' && payment.paid_date
                        ? format(new Date(payment.paid_date), 'dd/MM/yyyy', { locale: fr })
                        : payment.status === 'overdue'
                        ? 'En retard'
                        : 'En attente'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Contrats expirants */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Échéances prochaines</h2>
            <Button variant="secondary" size="sm">
              Voir tout
            </Button>
          </div>

          {upcomingContracts.length === 0 ? (
            <EmptyState
              title="Aucune échéance"
              description="Les contrats arrivant à échéance apparaîtront ici"
            />
          ) : (
            <div className="space-y-3">
              {upcomingContracts.map((contract) => (
                <div key={contract.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    contract.days_until_expiry <= 7 ? 'bg-red-100' :
                    contract.days_until_expiry <= 30 ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    <Calendar className={`w-4 h-4 ${
                      contract.days_until_expiry <= 7 ? 'text-red-600' :
                      contract.days_until_expiry <= 30 ? 'text-yellow-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {contract.property.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {contract.tenant.first_name} {contract.tenant.last_name} • {contract.property.address}
                    </p>
                    <p className="text-xs text-gray-400">
                      Expire dans {contract.days_until_expiry} jour{contract.days_until_expiry > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Actions rapides */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="secondary" className="h-auto p-4 flex flex-col items-center gap-2">
            <Plus className="w-6 h-6" />
            <span className="text-sm">Nouveau bien</span>
          </Button>
          <Button variant="secondary" className="h-auto p-4 flex flex-col items-center gap-2">
            <Users className="w-6 h-6" />
            <span className="text-sm">Ajouter locataire</span>
          </Button>
          <Button variant="secondary" className="h-auto p-4 flex flex-col items-center gap-2">
            <CreditCard className="w-6 h-6" />
            <span className="text-sm">Enregistrer paiement</span>
          </Button>
          <Button variant="secondary" className="h-auto p-4 flex flex-col items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            <span className="text-sm">Voir rapports</span>
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}