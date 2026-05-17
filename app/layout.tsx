// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import LayoutShell from '@/components/ui/LayoutShell'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ImmoGestion - Gestion immobilière',
  description: 'Plateforme de gestion immobilière moderne',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen`}>
        <LayoutShell>
          {children}
        </LayoutShell>
      </body>
    </html>
  )
}