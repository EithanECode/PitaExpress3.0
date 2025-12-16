-- Crear tabla para logs de salud de APIs
CREATE TABLE IF NOT EXISTS api_health_logs (
  id BIGSERIAL PRIMARY KEY,
  api_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  response_time_ms INTEGER,
  error_message TEXT,
  rate_obtained NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas por API y fecha
CREATE INDEX IF NOT EXISTS idx_api_health_logs_api_name ON api_health_logs(api_name);
CREATE INDEX IF NOT EXISTS idx_api_health_logs_created_at ON api_health_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_health_logs_api_name_created_at ON api_health_logs(api_name, created_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE api_health_logs IS 'Registra los intentos de conexión a APIs externas de tasas de cambio';
COMMENT ON COLUMN api_health_logs.api_name IS 'Nombre de la API (dollarvzla.com, pydolarvenezuela, exchangerate-api, binance_p2p_direct, etc.)';
COMMENT ON COLUMN api_health_logs.status IS 'Estado del intento: success o failed';
COMMENT ON COLUMN api_health_logs.response_time_ms IS 'Tiempo de respuesta en milisegundos';
COMMENT ON COLUMN api_health_logs.error_message IS 'Mensaje de error si el intento falló';
COMMENT ON COLUMN api_health_logs.rate_obtained IS 'Tasa de cambio obtenida si el intento fue exitoso';

-- Habilitar Row Level Security en la tabla api_health_logs
ALTER TABLE api_health_logs ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir que el servicio (service_role) pueda insertar logs
-- Esto es necesario para que el backend pueda registrar los intentos de API
DROP POLICY IF EXISTS "Service role can insert api health logs" ON api_health_logs;
CREATE POLICY "Service role can insert api health logs"
ON api_health_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Política 2: Permitir que el servicio (service_role) pueda leer todos los logs
-- Esto es necesario para que el endpoint /api/exchange-rate/health pueda obtener estadísticas
DROP POLICY IF EXISTS "Service role can read api health logs" ON api_health_logs;
CREATE POLICY "Service role can read api health logs"
ON api_health_logs
FOR SELECT
TO service_role
USING (true);

-- Política 3: Permitir que usuarios autenticados con rol de administrador puedan leer logs
-- Esto permite que los admins vean el monitoreo en el frontend
DROP POLICY IF EXISTS "Admins can read api health logs" ON api_health_logs;
CREATE POLICY "Admins can read api health logs"
ON api_health_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM administrators
    WHERE administrators.user_id = auth.uid()
  )
);

-- Nota: No creamos políticas para UPDATE o DELETE porque los logs son históricos
-- y no deben ser modificados o eliminados por usuarios


