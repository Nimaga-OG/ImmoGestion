// lib/database.types.ts
export type Property = {
  id: string
  user_id: string
  name: string
  address: string
  type: 'apartment' | 'house' | 'commercial' | 'land'
  value: number
  units: number
  status: 'available' | 'rented' | 'maintenance'
  description: string
  images: string[]
  created_at: string
  updated_at: string
}

export type Tenant = {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  emergency_contact: string
  profession: string
  notes: string
  created_at: string
  updated_at: string
}

export type Unit = {
  id: string
  user_id: string
  property_id: string
  name: string
  type: 'apartment' | 'room' | 'shop' | 'office' | 'storage'
  area?: number
  floor?: number
  rooms?: number
  monthly_rent: number
  charges?: number
  deposit?: number
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  amenities?: string[]
  description?: string
  images?: string[]
  created_at: string
  updated_at: string
}

export type Contract = {
  id: string
  user_id: string
  property_id: string
  unit_id?: string
  tenant_id: string
  start_date: string
  end_date: string
  monthly_rent: number
  deposit: number
  status: 'active' | 'expired' | 'terminated'
  documents: string[]
  created_at: string
  updated_at: string
}

export type Payment = {
  id: string
  user_id: string
  tenant_id: string
  contract_id: string
  amount: number
  date: string
  due_date: string
  status: 'paid' | 'pending' | 'late'
  method: 'bank_transfer' | 'check' | 'cash' | 'online'
  reference: string
  created_at: string
}