-- ==========================================
-- FIX: Agregar políticas de INSERT/UPDATE/DELETE para tablas de identidad
-- Fecha: 2025-12-12
-- Problema: Admins no pueden crear usuarios porque faltan políticas de escritura
-- ==========================================

-- ==========================================
-- CLIENTS: Permitir a admins y service_role gestionar
-- ==========================================

CREATE POLICY "admins_insert_clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_update_clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_delete_clients" ON public.clients
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_clients" ON public.clients
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- EMPLOYEES: Permitir a admins y service_role gestionar
-- ==========================================

CREATE POLICY "admins_insert_employees" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_update_employees" ON public.employees
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_delete_employees" ON public.employees
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_employees" ON public.employees
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- ADMINISTRATORS: Permitir a admins y service_role gestionar
-- ==========================================

CREATE POLICY "admins_insert_administrators" ON public.administrators
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_update_administrators" ON public.administrators
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_delete_administrators" ON public.administrators
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_administrators" ON public.administrators
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- USERLEVEL: Permitir a admins gestionar
-- ==========================================

CREATE POLICY "admins_insert_userlevel" ON public.userlevel
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_delete_userlevel" ON public.userlevel
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_userlevel" ON public.userlevel
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- COMENTARIOS
-- ==========================================

COMMENT ON POLICY "admins_insert_clients" ON public.clients IS 
  'Administradores pueden crear clientes';
COMMENT ON POLICY "admins_insert_employees" ON public.employees IS 
  'Administradores pueden crear empleados';
COMMENT ON POLICY "admins_insert_administrators" ON public.administrators IS 
  'Administradores pueden crear otros administradores';
COMMENT ON POLICY "service_role_clients" ON public.clients IS 
  'Service role para APIs de gestión de usuarios';
COMMENT ON POLICY "service_role_employees" ON public.employees IS 
  'Service role para APIs de gestión de usuarios';
COMMENT ON POLICY "service_role_administrators" ON public.administrators IS 
  'Service role para APIs de gestión de usuarios';
