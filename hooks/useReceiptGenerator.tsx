// hooks/useReceiptGenerator.tsx
import { useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import { ReceiptDocument } from '@/components/receipts/ReceiptDocument'

interface ReceiptData {
  receiptNumber: string
  date: string
  tenant: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
  }
  property: {
    name: string
    address: string
    type: string
  }
  unit?: {
    name: string
    type: string
  }
  payment: {
    amount: number
    date: string
    dueDate: string
    method: string
    reference: string
    period: string
    status: string
    monthCount?: number
    months?: Array<{ month: string; amount: number }>
  }
  owner: {
    name: string
    email: string
    phone?: string
    address?: string
  }
}

export function useReceiptGenerator() {
  const generateReceiptPdf = useCallback(async (data: ReceiptData) => {
    try {
      // Générer le blob PDF
      const blob = await pdf(
        <ReceiptDocument data={data} />
      ).toBlob()

      return blob
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      throw error
    }
  }, [])

  const downloadReceipt = useCallback(async (data: ReceiptData, filename?: string) => {
    try {
      const blob = await generateReceiptPdf(data)
      
      // Créer un lien de téléchargement
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `recu_${data.receiptNumber}_${data.tenant.lastName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return true
    } catch (error) {
      console.error('Erreur téléchargement:', error)
      return false
    }
  }, [generateReceiptPdf])

  const printReceipt = useCallback(async (data: ReceiptData) => {
    try {
      const blob = await generateReceiptPdf(data)
      const url = URL.createObjectURL(blob)
      
      // Ouvrir dans une nouvelle fenêtre pour impression
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
      
      // Nettoyer après un délai
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)

      return true
    } catch (error) {
      console.error('Erreur impression:', error)
      return false
    }
  }, [generateReceiptPdf])

  const previewReceipt = useCallback(async (data: ReceiptData) => {
    try {
      const blob = await generateReceiptPdf(data)
      const url = URL.createObjectURL(blob)
      
      // Ouvrir dans un nouvel onglet
      window.open(url, '_blank')
      
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
    } catch (error) {
      console.error('Erreur prévisualisation:', error)
    }
  }, [generateReceiptPdf])

  return {
    downloadReceipt,
    printReceipt,
    previewReceipt,
    generateReceiptPdf
  }
}
