-- ==========================================
-- FIX FINAL: Últimas 9 funciones con search_path (Security Lint)
-- ==========================================

-- 1. assign_order_to_employee (trigger, sin parámetros)
ALTER FUNCTION public.assign_order_to_employee() SET search_path = public, pg_temp;

-- 2. delete_message (uuid, uuid)
ALTER FUNCTION public.delete_message(uuid, uuid) SET search_path = public, pg_temp;

-- 3. get_binance_rate_history (integer DEFAULT 20, boolean DEFAULT false)
ALTER FUNCTION public.get_binance_rate_history(integer, boolean) SET search_path = public, pg_temp;

-- 4. get_order_state_history (integer)
ALTER FUNCTION public.get_order_state_history(integer) SET search_path = public, pg_temp;

-- 5. get_order_timeline (integer)
ALTER FUNCTION public.get_order_timeline(integer) SET search_path = public, pg_temp;

-- 6. get_unread_messages_count (uuid)
ALTER FUNCTION public.get_unread_messages_count(uuid) SET search_path = public, pg_temp;

-- 7. metricas_con_cambio (sin parámetros)
ALTER FUNCTION public.metricas_con_cambio() SET search_path = public, pg_temp;

-- 8. pedidos_por_mes (sin parámetros)
ALTER FUNCTION public.pedidos_por_mes() SET search_path = public, pg_temp;

-- 9. verify_user_password_direct (text, text)
ALTER FUNCTION public.verify_user_password_direct(text, text) SET search_path = public, pg_temp;

-- ✅ COMPLETADO
COMMENT ON SCHEMA public IS 
  '31 de 31 funciones ahora tienen search_path fijo. 100% de warnings de seguridad resueltos!';
