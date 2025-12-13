-- ==========================================
-- FIX: Permitir INSERT en order_state_history desde triggers
-- ==========================================

-- La tabla order_state_history solo tenía política SELECT, no INSERT
-- Cuando empleados actualizan pedidos, los triggers necesitan insertar aquí

DROP POLICY IF EXISTS "users_view_order_history" ON public.order_state_history;

-- Política SELECT (como antes)
CREATE POLICY "users_view_order_history" ON public.order_state_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_state_history.order_id
      -- Las políticas de orders se aplican automáticamente
    )
  );

-- NUEVA: Política INSERT para empleados
CREATE POLICY "employees_insert_order_history" ON public.order_state_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() 
      AND user_level IN ('China', 'Vzla', 'Pagos', 'Admin')
    )
    AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_state_history.order_id
      -- Solo pueden insertar historia de pedidos que pueden ver
    )
  );

-- NUEVA: Permitir a service role (para triggers)
CREATE POLICY "service_role_insert_history" ON public.order_state_history
  FOR INSERT TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "employees_insert_order_history" ON public.order_state_history IS 
  'Empleados pueden insertar historial cuando actualizan pedidos que gestionan';
