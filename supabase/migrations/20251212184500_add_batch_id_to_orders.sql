-- Agregar columna batch_id a la tabla orders si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'batch_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN batch_id TEXT DEFAULT NULL;
    END IF;
END $$;

-- Recargar la caché del esquema de PostgREST para que detecte la nueva columna
NOTIFY pgrst, 'reload schema';
