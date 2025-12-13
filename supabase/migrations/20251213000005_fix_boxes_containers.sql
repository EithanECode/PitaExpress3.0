-- ==========================================
-- FIX: Agregar WITH CHECK a políticas de boxes y containers
-- ==========================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "employees_manage_boxes" ON public.boxes;
DROP POLICY IF EXISTS "employees_manage_containers" ON public.containers;

-- Recrear política de boxes con WITH CHECK
CREATE POLICY "employees_manage_boxes" ON public.boxes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() 
      AND user_level IN ('China', 'Vzla', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() 
      AND user_level IN ('China', 'Vzla', 'Admin')
    )
  );

-- Recrear política de containers con WITH CHECK
CREATE POLICY "employees_manage_containers" ON public.containers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() 
      AND user_level IN ('China', 'Vzla', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() 
      AND user_level IN ('China', 'Vzla', 'Admin')
    )
  );

COMMENT ON POLICY "employees_manage_boxes" ON public.boxes IS 
  'Empleados China, Vzla y Admins pueden gestionar cajas completamente';
  
COMMENT ON POLICY "employees_manage_containers" ON public.containers IS 
  'Empleados China, Vzla y Admins pueden gestionar contenedores completamente';
