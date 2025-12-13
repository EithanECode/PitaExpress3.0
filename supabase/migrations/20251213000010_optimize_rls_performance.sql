-- ==========================================
-- OPTIMIZACIÓN DE RENDIMIENTO: RLS Performance Fix  
-- ==========================================
-- Fix 1: auth.uid() → (select auth.uid()) para evitar re-evaluación por fila
-- Fix 2: Consolidar políticas duplicadas
-- Fix 3: Eliminar índices duplicados

-- ==========================================
-- FIX 1: TABLA ORDERS (Crítico - Más usada)
-- ==========================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "clients_select_own_orders" ON public.orders;
DROP POLICY IF EXISTS "clients_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "clients_update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "china_employees_select_orders" ON public.orders;
DROP POLICY IF EXISTS "china_employees_update_orders" ON public.orders;
DROP POLICY IF EXISTS "vzla_employees_select_orders" ON public.orders;
DROP POLICY IF EXISTS "vzla_employees_update_orders" ON public.orders;
DROP POLICY IF EXISTS "pagos_select_orders" ON public.orders;
DROP POLICY IF EXISTS "pagos_update_order_state" ON public.orders;
DROP POLICY IF EXISTS "admins_full_access" ON public.orders;

-- Recrear optimizadas (con SELECT)
CREATE POLICY "clients_select_own_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (client_id = (select auth.uid()));

CREATE POLICY "clients_insert_orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients WHERE user_id = (select auth.uid()))
    AND client_id = (select auth.uid())
  );

CREATE POLICY "clients_update_own_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (client_id = (select auth.uid()))
  WITH CHECK (client_id = (select auth.uid()));

CREATE POLICY "china_employees_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid()) AND user_level = 'China'
    )
    AND
    (
      ("asignedEChina" = (select auth.uid()) AND state BETWEEN 1 AND 8)
      OR ("asignedEChina" IS NULL AND state IN (1, 2, 3))
      OR (state >= 4 AND state <= 8)
    )
  );

CREATE POLICY "china_employees_update_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid()) AND user_level = 'China'
    )
    AND
    (
      ("asignedEChina" = (select auth.uid()) AND state BETWEEN 1 AND 8)
      OR ("asignedEChina" IS NULL AND state IN (1, 2, 3))
      OR (state >= 1 AND state <= 8)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid()) AND user_level = 'China'
    )
    AND (state BETWEEN 1 AND 9 OR state = -1)
  );

CREATE POLICY "vzla_employees_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid()) AND user_level = 'Vzla'
    )
    AND ("asignedEVzla" = (select auth.uid()) OR state >= 4)
  );

CREATE POLICY "vzla_employees_update_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid()) AND user_level = 'Vzla'
    )
    AND ("asignedEVzla" = (select auth.uid()) OR state >= 4)
  );

CREATE POLICY "pagos_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid()) AND user_level = 'Pagos'
    )
    AND state IN (3, 4)
  );

CREATE POLICY "pagos_update_order_state" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid()) AND user_level = 'Pagos'
    )
    AND state IN (3, 4)
  )
  WITH CHECK (state IN (4, -1));

CREATE POLICY "admins_full_access" ON public.orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = (select auth.uid())
    )
  );

-- ==========================================
-- FIX 2: ELIMINAR ÍNDICE DUPLICADO
-- ==========================================

ALTER TABLE public.maritime_shipments DROP CONSTRAINT IF EXISTS maritime_shipments_order_id_key;

-- ==========================================
-- COMENTARIOS
-- ==========================================

COMMENT ON SCHEMA public IS 
  'Políticas RLS optimizadas: orders (10 policies), índice duplicado eliminado';
