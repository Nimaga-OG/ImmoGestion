-- Migration: Ajout de la table units pour gérer les unités d'une propriété
-- Date: 2024

-- Table des unités (appartements, chambres, magasins)
CREATE TABLE IF NOT EXISTS units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Informations de l'unité
  name VARCHAR(100) NOT NULL, -- ex: "Appartement 1A", "Chambre 3", "Magasin A"
  type VARCHAR(20) NOT NULL CHECK (type IN ('apartment', 'room', 'shop', 'office', 'storage')),
  
  -- Caractéristiques
  area DECIMAL(10, 2), -- surface en m²
  floor INTEGER, -- étage
  rooms INTEGER, -- nombre de pièces (pour appartements)
  
  -- Loyer et charges
  monthly_rent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  charges DECIMAL(12, 2) DEFAULT 0, -- charges mensuelles
  deposit DECIMAL(12, 2) DEFAULT 0, -- caution
  
  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  
  -- Équipements (JSON array)
  amenities JSONB DEFAULT '[]',
  
  -- Description
  description TEXT,
  
  -- Photos
  images TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_units_user_id ON units(user_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_type ON units(type);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_units_updated_at ON units;
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Mise à jour de la table contracts pour ajouter unit_id
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_unit_id ON contracts(unit_id);

-- Vue pour obtenir les unités avec leur locataire actuel
CREATE OR REPLACE VIEW units_with_tenants AS
SELECT 
  u.*,
  p.name as property_name,
  p.address as property_address,
  c.id as current_contract_id,
  c.start_date as contract_start,
  c.end_date as contract_end,
  c.monthly_rent as contract_rent,
  t.id as tenant_id,
  t.first_name as tenant_first_name,
  t.last_name as tenant_last_name,
  t.email as tenant_email,
  t.phone as tenant_phone
FROM units u
LEFT JOIN properties p ON u.property_id = p.id
LEFT JOIN contracts c ON u.id = c.unit_id AND c.status = 'active'
LEFT JOIN tenants t ON c.tenant_id = t.id;

-- Vue pour les statistiques des unités par propriété
CREATE OR REPLACE VIEW property_unit_stats AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  COUNT(u.id) as total_units,
  COUNT(CASE WHEN u.status = 'occupied' THEN 1 END) as occupied_units,
  COUNT(CASE WHEN u.status = 'available' THEN 1 END) as available_units,
  COUNT(CASE WHEN u.status = 'maintenance' THEN 1 END) as maintenance_units,
  SUM(CASE WHEN u.status = 'occupied' THEN u.monthly_rent ELSE 0 END) as total_monthly_rent
FROM properties p
LEFT JOIN units u ON p.id = u.property_id
GROUP BY p.id, p.name;

-- Politiques RLS (Row Level Security)
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs ne voient que leurs propres unités
DROP POLICY IF EXISTS units_select_own ON units;
CREATE POLICY units_select_own ON units
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS units_insert_own ON units;
CREATE POLICY units_insert_own ON units
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS units_update_own ON units;
CREATE POLICY units_update_own ON units
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS units_delete_own ON units;
CREATE POLICY units_delete_own ON units
  FOR DELETE USING (auth.uid() = user_id);
