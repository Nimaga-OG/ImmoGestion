// components/receipts/ReceiptDocument.tsx
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 15,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottom: '3px solid #1e40af',
    paddingBottom: 10,
  },
  logoSection: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 3,
  },
  companySubtitle: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 1,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'right',
    letterSpacing: 1.5,
  },
  receiptNumber: {
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'right',
    marginTop: 4,
    backgroundColor: '#1e40af',
    padding: 4,
    paddingHorizontal: 10,
    borderRadius: 3,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
    paddingBottom: 3,
    borderBottom: '2px solid #e5e7eb',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Informations du reçu - Grid 2x2
  infosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  infoBox: {
    width: '48%',
    paddingBottom: 4,
  },
  infoLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusPaid: {
    color: '#059669',
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  
  // Mois couverts
  monthsSection: {
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: '1px solid #e5e7eb',
  },
  monthsGrid: {
    flexDirection: 'column',
    gap: 4,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 6,
    borderRadius: 3,
    borderLeft: '3px solid #1e40af',
  },
  monthLabel: {
    fontSize: 10,
    color: '#1e40af',
  },
  monthAmount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
  },

  // Tenant et Property - Side by side
  twoColumn: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  column: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 4,
  },
  label: {
    width: '35%',
    fontSize: 8,
    color: '#6b7280',
  },
  value: {
    width: '65%',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
  },

  // Détails du paiement
  paymentDetails: {
    marginBottom: 6,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: '#f8fafc',
    borderLeft: '3px solid #1e40af',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 8,
    color: '#6b7280',
  },
  paymentValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTop: '2px solid #1e40af',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e40af',
  },

  // Montant total payé - Highlight
  amountTotalSection: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#1e40af',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 4,
  },
  amountTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  amountTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Arrêté
  arreteSection: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f8fafc',
    fontSize: 8,
  },
  arreteLabel: {
    color: '#6b7280',
    marginBottom: 3,
  },
  arreteValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    fontStyle: 'italic',
  },

  // Signatures
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 16,
  },
  signatureBox: {
    flex: 1,
  },
  signatureTitle: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 14,
  },
  signatureLine: {
    borderBottom: '2px solid #d1d5db',
    marginBottom: 3,
    height: 24,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Footer
  footer: {
    marginTop: 12,
    paddingTop: 8,
    borderTop: '2px solid #e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
    marginBottom: 2,
  },

  // Watermark
  watermark: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-30deg)',
    fontSize: 100,
    fontWeight: 'bold',
    color: '#e5e7eb',
    opacity: 0.12,
    textAlign: 'center',
  },
})

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

export type { ReceiptData }

export function ReceiptDocument({ data }: { data: ReceiptData }) {
  const formatCurrency = (amount: number) => {
    const value = Math.floor(amount)
    const str = value.toString()
    
    let result = ''
    let count = 0
    for (let i = str.length - 1; i >= 0; i--) {
      if (count > 0 && count % 3 === 0) {
        result = ' ' + result
      }
      result = str[i] + result
      count++
    }
    
    return `${result} FCFA`
  }

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'bank_transfer': return 'Virement bancaire'
      case 'check': return 'Chèque'
      case 'cash': return 'Espèces'
      case 'online': return 'Paiement en ligne'
      default: return method
    }
  }

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'apartment': return 'Appartement'
      case 'house': return 'Maison'
      case 'commercial': return 'Local commercial'
      case 'land': return 'Terrain'
      default: return type
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>IMMOGESTION</Text>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.companyName}>ImmoGestion</Text>
            <Text style={styles.companySubtitle}>Gestion Immobilière Professionnelle</Text>
            <Text style={styles.companySubtitle}>
              {data.owner.address || '123 Rue de la Gestion'}
            </Text>
          </View>
          <View>
            <Text style={styles.receiptTitle}>REÇU DE PAIEMENT</Text>
            <Text style={styles.receiptNumber}>N° {data.receiptNumber}</Text>
          </View>
        </View>

        {/* Informations du reçu - 2x2 Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations du reçu</Text>
          <View style={styles.infosGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Date d'émission</Text>
              <Text style={styles.infoValue}>{data.date}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Période couverte</Text>
              <Text style={styles.infoValue}>{data.payment.monthCount || 1} mois</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Statut du paiement</Text>
              <Text style={data.payment.status === 'paid' ? [styles.infoValue, styles.statusPaid] : [styles.infoValue, styles.statusPending]}>
                {data.payment.status === 'paid' ? 'Payé' : 'En attente'}
              </Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Référence</Text>
              <Text style={styles.infoValue}>{data.payment.reference || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Mois couverts */}
        {data.payment.months && data.payment.months.length > 0 && (
          <View style={styles.monthsSection}>
            <Text style={styles.sectionTitle}>Mois couverts par ce paiement</Text>
            <View style={styles.monthsGrid}>
              {data.payment.months.map((item, index) => (
                <View key={index} style={styles.monthRow}>
                  <Text style={styles.monthLabel}>{item.month}</Text>
                  <Text style={styles.monthAmount}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Locataire et Bien loué - Side by side */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Locataire</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Nom :</Text>
              <Text style={styles.value}>{data.tenant.firstName} {data.tenant.lastName}</Text>
            </View>
            {data.tenant.email && (
              <View style={styles.row}>
                <Text style={styles.label}>Email :</Text>
                <Text style={styles.value}>{data.tenant.email}</Text>
              </View>
            )}
            {data.tenant.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Téléphone :</Text>
                <Text style={styles.value}>{data.tenant.phone}</Text>
              </View>
            )}
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Bien loué</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Bien :</Text>
              <Text style={styles.value}>{data.property.name}</Text>
            </View>
            {data.unit && (
              <View style={styles.row}>
                <Text style={styles.label}>Unité :</Text>
                <Text style={styles.value}>{data.unit.name}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Type :</Text>
              <Text style={styles.value}>{getPropertyTypeLabel(data.property.type)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Adresse :</Text>
              <Text style={styles.value}>{data.property.address}</Text>
            </View>
          </View>
        </View>

        {/* Détails du paiement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détails du paiement</Text>
          <View style={styles.paymentDetails}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Montant par mois :</Text>
              <Text style={styles.paymentValue}>{formatCurrency(data.payment.amount / (data.payment.monthCount || 1))}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Nombre de mois :</Text>
              <Text style={styles.paymentValue}>{data.payment.monthCount || 1}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Montant total :</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.payment.amount)}</Text>
            </View>
          </View>
        </View>

        {/* Méthode et Date */}
        <View style={[styles.section, { marginBottom: 6 }]}>
          <View style={styles.row}>
            <Text style={styles.label}>Méthode :</Text>
            <Text style={styles.value}>{getMethodLabel(data.payment.method)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payé le :</Text>
            <Text style={styles.value}>{data.payment.date}</Text>
          </View>
        </View>

        {/* Montant total payé */}
        <View style={styles.amountTotalSection}>
          <Text style={styles.amountTotalLabel}>Montant total payé</Text>
          <Text style={styles.amountTotalValue}>{formatCurrency(data.payment.amount)}</Text>
        </View>

        {/* Arrêté */}
        <View style={styles.arreteSection}>
          <Text style={styles.arreteLabel}>Arrêté la présente somme à la somme de :</Text>
          <Text style={styles.arreteValue}>{numberToWords(data.payment.amount)} francs CFA</Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Le propriétaire / Gestionnaire</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{data.owner.name}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Le locataire</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{data.tenant.firstName} {data.tenant.lastName}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ImmoGestion - Gestion Immobilière | {data.owner.email}
          </Text>
          <Text style={styles.footerText}>
            Reçu généré le {new Date().toLocaleDateString('fr-FR')} - Ce document fait office de reçu officiel
          </Text>
        </View>
      </Page>
    </Document>
  )
}

function numberToWords(amount: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']
  
  if (amount === 0) return 'zéro'
  
  const fcfa = Math.floor(amount)
  let result = ''
  
  if (fcfa >= 1000) {
    const thousands = Math.floor(fcfa / 1000)
    const thousandsInWords = numberToWords(thousands)
    result += (thousands === 1 ? 'mille ' : thousandsInWords.toLowerCase() + ' mille ')
  }
  
  const hundreds = Math.floor((fcfa % 1000) / 100)
  if (hundreds > 0) {
    result += (hundreds === 1 ? 'cent ' : units[hundreds] + ' cent ')
  }
  
  const remainder = fcfa % 100
  if (remainder > 0) {
    if (remainder < 10) {
      result += units[remainder]
    } else if (remainder < 20) {
      result += teens[remainder - 10]
    } else {
      const ten = Math.floor(remainder / 10)
      const unit = remainder % 10
      result += tens[ten]
      if (unit > 0) {
        result += '-' + units[unit]
      }
    }
  }
  
  return result.charAt(0).toUpperCase() + result.slice(1)
}
