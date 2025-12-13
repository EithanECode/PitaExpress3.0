-- ==========================================
-- CORRECCIÓN: administrators duplicado
-- ==========================================

DROP POLICY IF EXISTS "admins_modify_administrators" ON public.administrators;

-- Separar en 3 políticas específicas (sin SELECT)
CREATE POLICY "admins_insert_administrators_v2" ON public.administrators
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid())
      AND user_level = 'Admin'
    )
  );

CREATE POLICY "admins_update_administrators_v2" ON public.administrators
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid())
      AND user_level = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid())
      AND user_level = 'Admin'
    )
  );

CREATE POLICY "admins_delete_administrators_v2" ON public.administrators
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid())
      AND user_level = 'Admin'
    )
  );

-- La política SELECT ya existe: users_select_administrators

COMMENT ON TABLE public.administrators IS 
  'Políticas RLS optimizadas: SELECT separado de INSERT/UPDATE/DELETE para evitar duplicados';
