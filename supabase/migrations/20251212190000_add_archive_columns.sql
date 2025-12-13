-- Agregar columnas de archivado a orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS archived_by_client BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_by_admin BOOLEAN DEFAULT FALSE;

-- Recargar esquema
NOTIFY pgrst, 'reload schema';
