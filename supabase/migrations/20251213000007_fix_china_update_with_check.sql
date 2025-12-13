-- ==========================================
-- FIX: Agregar WITH CHECK a política UPDATE de China
-- ==========================================

-- La política UPDATE de China no tenía WITH CHECK
-- Esto bloqueaba cambios de estado a 9 (enviado)

DROP POLICY IF EXISTS "china_employees_update_orders" ON public.orders;

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
  )
  WITH CHECK (
    -- Después del UPDATE, deben seguir siendo rol China
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'China'
    )
    AND
    (
      -- Pueden cambiar a estados 1-9 (incluye enviado)
      state BETWEEN 1 AND 9
      OR
      -- Pueden cancelar (-1)
      state = -1
    )
  );

COMMENT ON POLICY "china_employees_update_orders" ON public.orders IS 
  'Empleados China actualizan: pedidos asignados (1-8), asignan no asignados (1-3), pueden cambiar a estados 1-9';
