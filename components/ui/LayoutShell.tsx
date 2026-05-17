'use client'

import { ReactNode, useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/ui/Sidebar'

interface LayoutShellProps {
  children: ReactNode
}

export default function LayoutShell({ children }: LayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/70 backdrop-blur-lg">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl border border-gray-200 p-2 text-gray-700 hover:bg-gray-100"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
          ImmoGestion
        </div>
        <div className="w-10" />
      </header>

      <Sidebar isMobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-64 flex-1 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
