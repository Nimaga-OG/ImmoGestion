// components/units/UnitCard.tsx
'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { 
  Home, DoorOpen, Store, Building2, BedDouble, Square, 
  Users, DollarSign, Wrench, CheckCircle2, AlertCircle
} from 'lucide-react'
import type { Unit, Tenant, Contract } from '@/lib/database.types'

type UnitWithRelations = Unit & {
  currentTenant?: Tenant
  currentContract?: Contract
}

interface UnitCardProps {
  unit: UnitWithRelations
  onEdit?: () => void
  onDelete?: () => void
  onRent?: () => void
  onViewDetails?: () => void
}

export function UnitCard({ unit, onEdit, onDelete, onRent, onViewDetails }: UnitCardProps) {
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

  return (
    <GlassCard className="hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            {getTypeIcon(unit.type)}
          </div>
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
          {unit.currentContract && (
            <p className="text-xs text-green-600 mt-1">
              Loyer: {unit.currentContract.monthly_rent?.toLocaleString()} FCFA
            </p>
          )}
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
          <p className="font-bold text-blue-600 flex items-center">
            <DollarSign className="w-4 h-4 mr-1" />
            {unit.monthly_rent?.toLocaleString()} FCFA
          </p>
        </div>
        <div className="flex gap-2">
          {unit.status === 'available' && onRent && (
            <Button variant="primary" size="sm" onClick={onRent}>
              Louer
            </Button>
          )}
          {onViewDetails && (
            <Button variant="secondary" size="sm" onClick={onViewDetails}>
              Détails
            </Button>
          )}
          {onEdit && (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Modifier
            </Button>
          )}
          {onDelete && (
            <Button variant="danger" size="sm" onClick={onDelete}>
              Supprimer
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
