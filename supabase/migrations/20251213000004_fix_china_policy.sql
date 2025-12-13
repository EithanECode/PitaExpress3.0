-- ==========================================
-- FIX URGENTE: Política China puede ver y actualizar pedidos asignados
-- ==========================================

-- Eliminar políticas restrictivas
DROP POLICY IF EXISTS "china_employees_select_orders" ON public.orders;
DROP POLICY IF EXISTS "china_employees_update_orders" ON public.orders;

-- Recrear política SELECT CORRECTA
CREATE POLICY "china_employees_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'China'
    )
    AND
    (
      -- Pedidos asignados a este empleado (CUALQUIER ESTADO 1-8)
      ("asignedEChina" = auth.uid() AND state BETWEEN 1 AND 8)
      OR
      -- Pedidos no asignados en estados iniciales (para asignar)
      ("asignedEChina" IS NULL AND state IN (1, 2, 3))
      OR
      -- TODOS los pedidos en proceso (4-8) para visibilidad general
      (state >= 4 AND state <= 8)
    )
  );

-- Recrear política UPDATE CORRECTA
CREATE POLICY "china_employees_update_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'China'
    )
    AND
    (
      -- Pueden actualizar pedidos asignados a ellos (1-8)
      ("asignedEChina" = auth.uid() AND state BETWEEN 1 AND 8)
      OR
      -- Pueden actualizar pedidos no asignados para asignarlos (1-3)
      ("asignedEChina" IS NULL AND state IN (1, 2, 3))
      OR
      -- Gestión general de proceso (4-8)
      (state >= 1 AND state <= 8)
    )
  );

COMMENT ON POLICY "china_employees_select_orders" ON public.orders IS 
  'Empleados China ven: pedidos asignados (1-8), no asignados (1-3), y todos en proceso (4-8)';

COMMENT ON POLICY "china_employees_update_orders" ON public.orders IS 
  'Empleados China actualizan: pedidos asignados (1-8), asignan no asignados (1-3), gestionan proceso (4-8)';
