-- Migration: Ajout de la table units pour gérer les unités d'une propriété
-- Date: 2024

-- Table des unités (appartements, chambres, magasins)
CREATE TABLE IF NOT EXISTS units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('apartment', 'room', 'shop', 'office', 'storage')),
  
  area DECIMAL(10, 2),
  floor INTEGER,
  rooms INTEGER,
  
  monthly_rent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  charges DECIMAL(12, 2) DEFAULT 0,
  deposit DECIMAL(12, 2) DEFAULT 0,
  
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  
  amenities JSONB DEFAULT '[]',
  description TEXT,
  images TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_units_user_id ON units(user_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_unit_id ON contracts(unit_id);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS units_select_own ON units;
CREATE POLICY units_select_own ON units FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS units_insert_own ON units;
CREATE POLICY units_insert_own ON units FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS units_update_own ON units;
CREATE POLICY units_update_own ON units FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS units_delete_own ON units;
CREATE POLICY units_delete_own ON units FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- LOGIQUE MÉTIER : GESTION DES CONFLITS D'ATTRIBUTION
-- =====================================================

-- Fonction pour vérifier si une unité est disponible
CREATE OR REPLACE FUNCTION is_unit_available(unit_uuid UUID, exclude_contract_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  has_active_contract BOOLEAN;
  unit_status TEXT;
BEGIN
  -- Vérifier le statut de l'unité
  SELECT status INTO unit_status FROM units WHERE id = unit_uuid;
  
  -- Si l'unité est en maintenance, elle n'est pas disponible
  IF unit_status = 'maintenance' THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier s'il existe un contrat actif sur cette unité
  SELECT EXISTS (
    SELECT 1 FROM contracts 
    WHERE unit_id = unit_uuid 
    AND status = 'active'
    AND (exclude_contract_id IS NULL OR id != exclude_contract_id)
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ) INTO has_active_contract;
  
  RETURN NOT has_active_contract AND unit_status IN ('available', 'reserved');
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le statut d'une unité basé sur ses contrats
CREATE OR REPLACE FUNCTION update_unit_status()
RETURNS TRIGGER AS $$
DECLARE
  active_contracts_count INTEGER;
  target_unit_id UUID;
BEGIN
  -- Déterminer l'unit_id concerné
  IF TG_OP = 'DELETE' THEN
    target_unit_id := OLD.unit_id;
  ELSE
    target_unit_id := NEW.unit_id;
  END IF;
  
  -- Si pas d'unité associée, ne rien faire
  IF target_unit_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Compter les contrats actifs pour cette unité
  SELECT COUNT(*) INTO active_contracts_count
  FROM contracts 
  WHERE unit_id = target_unit_id 
  AND status = 'active'
  AND start_date <= CURRENT_DATE
  AND (end_date IS NULL OR end_date >= CURRENT_DATE);
  
  -- Mettre à jour le statut de l'unité
  IF active_contracts_count > 0 THEN
    UPDATE units SET status = 'occupied', updated_at = NOW() WHERE id = target_unit_id;
  ELSE
    -- Vérifier si l'unité n'est pas en maintenance avant de la rendre disponible
    UPDATE units 
    SET status = CASE 
      WHEN status = 'maintenance' THEN 'maintenance' 
      ELSE 'available' 
    END, 
    updated_at = NOW() 
    WHERE id = target_unit_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour gérer les changements de statut des unités
DROP TRIGGER IF EXISTS trigger_update_unit_status ON contracts;
CREATE TRIGGER trigger_update_unit_status
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_unit_status();

-- Fonction pour vérifier avant insertion/mise à jour d'un contrat
CREATE OR REPLACE FUNCTION check_contract_unit_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Si une unité est spécifiée
  IF NEW.unit_id IS NOT NULL THEN
    -- Vérifier que l'unité appartient à la propriété
    IF NOT EXISTS (
      SELECT 1 FROM units 
      WHERE id = NEW.unit_id 
      AND property_id = NEW.property_id
    ) THEN
      RAISE EXCEPTION 'L''unité spécifiée n''appartient pas à la propriété sélectionnée';
    END IF;
    
    -- Vérifier que l'unité est disponible (sauf si c'est une mise à jour du même contrat)
    IF NEW.status = 'active' AND NOT is_unit_available(NEW.unit_id, NEW.id) THEN
      RAISE EXCEPTION 'Cette unité est déjà occupée ou non disponible';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier la disponibilité avant création/modification de contrat
DROP TRIGGER IF EXISTS trigger_check_unit_availability ON contracts;
CREATE TRIGGER trigger_check_unit_availability
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION check_contract_unit_availability();

-- Vue pour voir les unités avec informations de locataire actuel
CREATE OR REPLACE VIEW unit_current_status AS
SELECT 
  u.*,
  c.id as current_contract_id,
  c.tenant_id as current_tenant_id,
  t.first_name as tenant_first_name,
  t.last_name as tenant_last_name,
  c.start_date as contract_start,
  c.end_date as contract_end,
  c.monthly_rent as current_rent
FROM units u
LEFT JOIN contracts c ON u.id = c.unit_id 
  AND c.status = 'active' 
  AND c.start_date <= CURRENT_DATE 
  AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
LEFT JOIN tenants t ON c.tenant_id = t.id;

-- Contrainte pour empêcher la suppression d'une unité occupée
CREATE OR REPLACE FUNCTION prevent_delete_occupied_unit()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM contracts 
    WHERE unit_id = OLD.id 
    AND status = 'active'
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ) THEN
    RAISE EXCEPTION 'Impossible de supprimer une unité occupée par un locataire';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_delete_occupied_unit ON units;
CREATE TRIGGER trigger_prevent_delete_occupied_unit
  BEFORE DELETE ON units
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delete_occupied_unit();
