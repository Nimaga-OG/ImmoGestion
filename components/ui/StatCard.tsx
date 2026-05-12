// components/ui/StatCard.tsx
import { GlassCard } from './GlassCard'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
}

export function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-2 bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ml-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-500/10 rounded-xl">
          {icon}
        </div>
      </div>
    </GlassCard>
  )
}