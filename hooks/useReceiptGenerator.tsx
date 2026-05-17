// hooks/useReceiptGenerator.tsx
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

export async function generateReceiptPdf(data: ReceiptData) {
  try {
    const blob = await pdf(
      <ReceiptDocument data={data} />
    ).toBlob()

    return blob
  } catch (error) {
    console.error('Erreur génération PDF:', error)
    throw error
  }
}

export async function downloadReceipt(data: ReceiptData, filename?: string) {
  try {
    const blob = await generateReceiptPdf(data)
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
}

export async function printReceipt(data: ReceiptData) {
  try {
    const blob = await generateReceiptPdf(data)
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)

    return true
  } catch (error) {
    console.error('Erreur impression:', error)
    return false
  }
}

export async function previewReceipt(data: ReceiptData) {
  try {
    const blob = await generateReceiptPdf(data)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
  } catch (error) {
    console.error('Erreur prévisualisation:', error)
  }
}

export function useReceiptGenerator() {
  return {
    downloadReceipt,
    printReceipt,
    previewReceipt,
    generateReceiptPdf
  }
}
