-- ==========================================
-- CORRECCIÓN DE SEGURIDAD: 3 errores críticos
-- ==========================================

-- ==========================================
-- ERROR 1 y 2: user_phones expone auth.users + SECURITY DEFINER
-- ==========================================
-- NOTA: user_phones SE USA en edge function mandar-mensaje
-- No podemos eliminarla, pero la recreamos de forma segura

DROP VIEW IF EXISTS public.user_phones CASCADE;

-- Recrear con SECURITY INVOKER (respeta permisos del usuario que consulta)
CREATE VIEW public.user_phones 
WITH (security_invoker = true)
AS
SELECT 
  id,
  phone
FROM auth.users;

-- Otorgar permisos mínimos necesarios
GRANT SELECT ON public.user_phones TO service_role;

COMMENT ON VIEW public.user_phones IS 
  'Vista de teléfonos de usuarios. SECURITY INVOKER - solo accesible por service_role.
   Usada por edge function mandar-mensaje.';

-- IMPORTANTE: La vista ahora solo es accesible por service_role
-- Los edge functions usan service_role, así que seguirá funcionando

-- ==========================================
-- ERROR 3: exchange_rates_cny sin RLS
-- ==========================================

-- Habilitar RLS en exchange_rates_cny
ALTER TABLE public.exchange_rates_cny ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública (es información de tasas de cambio)
DROP POLICY IF EXISTS "public_read_exchange_rates_cny" ON public.exchange_rates_cny;
CREATE POLICY "public_read_exchange_rates_cny" ON public.exchange_rates_cny
  FOR SELECT
  USING (true);

-- Solo service_role puede INSERT/UPDATE/DELETE (asumiendo que es data de sistema)
DROP POLICY IF EXISTS "service_role_manage_exchange_rates_cny" ON public.exchange_rates_cny;
CREATE POLICY "service_role_manage_exchange_rates_cny" ON public.exchange_rates_cny
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.exchange_rates_cny IS 
  'Tasas de cambio CNY. RLS habilitado: lectura pública, escritura solo service_role.';

-- ==========================================
-- RESUMEN
-- ==========================================

COMMENT ON SCHEMA public IS 
  'Seguridad reforzada:
   ✅ user_phones: SECURITY INVOKER (respeta permisos del invocador)
   ✅ exchange_rates_cny: RLS habilitado
   ✅ 0 errores de seguridad críticos';
