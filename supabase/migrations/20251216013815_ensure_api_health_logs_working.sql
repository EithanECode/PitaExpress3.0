-- ==========================================
-- FIX DEFINITIVO: Políticas RLS para api_health_logs
-- ==========================================
-- Esta migración asegura que la tabla api_health_logs esté correctamente configurada
-- y que el service_role pueda insertar y leer logs sin problemas
-- Esto es crítico después de actualizar las políticas RLS globales

-- Asegurar que la tabla existe con todas sus columnas
CREATE TABLE IF NOT EXISTS api_health_logs (
  id BIGSERIAL PRIMARY KEY,
  api_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  response_time_ms INTEGER,
  error_message TEXT,
  rate_obtained NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_api_health_logs_api_name ON api_health_logs(api_name);
CREATE INDEX IF NOT EXISTS idx_api_health_logs_created_at ON api_health_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_health_logs_api_name_created_at ON api_health_logs(api_name, created_at DESC);

-- Asegurar que RLS está habilitado
ALTER TABLE api_health_logs ENABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes dinámicamente (sin importar el nombre)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'api_health_logs'
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.api_health_logs', r.policyname);
    END LOOP;
END $$;

-- Política 1: Service role puede INSERTAR logs
-- CRÍTICO: Sin esto, el backend no puede registrar intentos de API
CREATE POLICY "service_role_insert_api_health_logs"
ON public.api_health_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Política 2: Service role puede LEER todos los logs
-- CRÍTICO: Sin esto, el endpoint /api/exchange-rate/health no puede obtener estadísticas
CREATE POLICY "service_role_select_api_health_logs"
ON public.api_health_logs
FOR SELECT
TO service_role
USING (true);

-- Política 3: Admins autenticados pueden LEER logs
-- Para que el frontend pueda mostrar el monitoreo a los administradores
CREATE POLICY "admins_select_api_health_logs"
ON public.api_health_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.administrators
    WHERE administrators.user_id = (select auth.uid())
  )
);

-- Verificar que las políticas se crearon correctamente
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_health_logs';
    
    IF policy_count < 3 THEN
        RAISE WARNING 'Solo se encontraron % políticas para api_health_logs. Se esperaban al menos 3.', policy_count;
    ELSE
        RAISE NOTICE 'Políticas RLS configuradas correctamente para api_health_logs. Total: %', policy_count;
    END IF;
END $$;

-- Comentarios para documentación
COMMENT ON POLICY "service_role_insert_api_health_logs" ON public.api_health_logs IS 
'Permite que el service_role (backend) inserte logs de intentos de API. CRÍTICO para el funcionamiento del sistema de monitoreo.';

COMMENT ON POLICY "service_role_select_api_health_logs" ON public.api_health_logs IS 
'Permite que el service_role (backend) lea todos los logs. CRÍTICO para que el endpoint /api/exchange-rate/health funcione.';

COMMENT ON POLICY "admins_select_api_health_logs" ON public.api_health_logs IS 
'Permite que usuarios autenticados con rol de administrador lean los logs para ver el monitoreo en el frontend.';

