-- ==========================================
-- FIX: Agregar search_path a funciones existentes (Security Lint)
-- Solo las funciones que existen en la BD
-- ==========================================

-- ✅ Funciones de actualización de timestamps (FUNCIONAN)
ALTER FUNCTION public.update_chat_typing_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_elapsed_time() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_employee_user_level_function() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_order_reviews_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_product_alternatives_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_chat_messages_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_elapsed_time() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;

-- ✅ Funciones de asignación (FUNCIONAN)
ALTER FUNCTION public.assign_order_to_least_busy_employee_safe() SET search_path = public, pg_temp;
ALTER FUNCTION public.assign_order_to_least_busy_employees() SET search_path = public, pg_temp;

-- ✅ Funciones de mensajes/chat (FUNCIONAN)
ALTER FUNCTION public.get_chat_conversations_v2(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_admin_conversations(uuid) SET search_path = public, pg_temp;

-- ✅ Funciones de tasas de cambio (FUNCIONAN)
ALTER FUNCTION public.cleanup_old_binance_rates() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_old_exchange_rates_cny() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_latest_valid_binance_rate() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_latest_valid_exchange_rate_cny() SET search_path = public, pg_temp;

-- ✅ Funciones de pedidos (FUNCIONAN)
ALTER FUNCTION public.log_order_state_change() SET search_path = public, pg_temp;

-- ✅ Funciones de usuarios (FUNCIONAN)
ALTER FUNCTION public.get_user_id_by_email(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.manage_user_roles() SET search_path = public, pg_temp;
ALTER FUNCTION public.verify_user_password(uuid, text) SET search_path = public, pg_temp;

-- Comentario
COMMENT ON SCHEMA public IS 
  '22 de 30 funciones tienen search_path fijo. Las restantes tienen firmas diferentes y se arreglarán después.';
