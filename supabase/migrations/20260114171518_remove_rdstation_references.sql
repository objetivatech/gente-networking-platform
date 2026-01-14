/*
  # Remover Referências ao RD Station
  
  ## Alterações
  
  1. **Campo Removido**
     - `profiles.rd_station_synced_at`: Campo não mais necessário
  
  ## Notas
  
  - Integração com RD Station foi removida do sistema
*/

-- Remover campo rd_station_synced_at da tabela profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'rd_station_synced_at'
  ) THEN
    ALTER TABLE profiles DROP COLUMN rd_station_synced_at;
  END IF;
END $$;
