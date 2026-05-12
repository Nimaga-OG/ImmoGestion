// components/ui/Button.tsx
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading, 
  className,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-xl font-medium transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-gradient-to-r from-blue-600 to-green-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40': variant === 'primary',
          'bg-white/20 backdrop-blur-sm border border-white/30 text-gray-800': variant === 'secondary',
          'bg-red-500 text-white shadow-lg shadow-red-500/25': variant === 'danger',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        className
      )}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Chargement...
        </span>
      ) : children}
    </button>
  )
}