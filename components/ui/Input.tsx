// components/ui/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2 rounded-xl border transition-all ${
          error 
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
            : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}