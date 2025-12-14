-- Corregir política RLS para el rol Pagos
-- Problema: Los pagos desaparecían al ser aprobados (state=5) o rechazados (state=-1)
-- porque la política solo permitía ver states 3 y 4.

DROP POLICY IF EXISTS "pagos_select_orders" ON public.orders;

CREATE POLICY "pagos_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'Pagos'
    )
    AND
    state IN (3, 4, 5, -1) -- Añadidos 5 (Verificado) y -1 (Rechazado)
  );

-- También asegurarnos que puedan actualizar estos estados si es necesario revertir
DROP POLICY IF EXISTS "pagos_update_order_state" ON public.orders;

CREATE POLICY "pagos_update_order_state" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'Pagos'
    )
    AND
    state IN (3, 4, 5, -1) -- Permitir interactuar con pagos ya procesados (para deshacer)
  )
  WITH CHECK (
    state IN (4, 5, -1) -- Pueden mover entre estos estados
  );
