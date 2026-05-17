'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'Propriétés', href: '/proprietes' },
  { icon: Users, label: 'Locataires', href: '/locataires' },
  { icon: CreditCard, label: 'Paiements', href: '/paiements' },
  { icon: FileText, label: 'Contrats', href: '/contrats' },
  { icon: Settings, label: 'Paramètres', href: '/parametres' },
]

interface SidebarProps {
  isMobileOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isMobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    onClose?.()
  }

  return (
    <>
      {onClose && isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-72 max-w-full transform bg-white/95 backdrop-blur-xl border-r border-white/10 p-4 transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:w-64`}>
        <div className="mb-8 p-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            ImmoGestion
          </h1>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`relative flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-600'
                    : 'text-gray-600 hover:bg-white/10 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute right-0 w-1 h-6 bg-gradient-to-b from-blue-600 to-green-500 rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="absolute bottom-4 flex items-center space-x-3 px-3 py-2.5 text-gray-600 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </>
  )
}
