// components/ui/GlassCard.tsx
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        'bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl',
        'shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10',
        'transition-all duration-300 hover:scale-[1.02]',
        'p-6',
        className
      )}
    >
      {children}
    </div>
  )
}