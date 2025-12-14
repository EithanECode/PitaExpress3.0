-- ==========================================
-- FIX: Romper recursión infinita con función helper
-- ==========================================
-- El error "infinite recursion detected" ocurre porque:
-- userlevel chequea administrators <-> administrators chequea userlevel
-- Solución: Usar función SECURITY DEFINER par chequear userlevel sin disparar RLS

-- 1. Crear función segura para chequear admin
-- SECURITY DEFINER hace que se ejecute con permisos de creador (sin RLS), rompiendo el bucle.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.userlevel 
    WHERE id = (select auth.uid()) 
    AND user_level = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public; -- Buena práctica seguridad

-- 2. Arreglar USERLEVEL (Usando la función)
DROP POLICY IF EXISTS "userlevel_select" ON public.userlevel;
CREATE POLICY "userlevel_select" ON public.userlevel
  FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = id
    OR public.is_admin() -- Usa la función = No recursión
  );

DROP POLICY IF EXISTS "admins_manage_userlevel" ON public.userlevel;
CREATE POLICY "admins_manage_userlevel" ON public.userlevel
  FOR ALL TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- 3. Arreglar ADMINISTRATORS (Usando la función)
-- Primero eliminamos las políticas viejas de SELECT si existen
DROP POLICY IF EXISTS "users_select_administrators" ON public.administrators;
DROP POLICY IF EXISTS "Authenticated can view administrators" ON public.administrators;

-- Política SELECT única y segura
DROP POLICY IF EXISTS "admins_select_administrators_v3" ON public.administrators;
CREATE POLICY "admins_select_administrators_v3" ON public.administrators
  FOR SELECT TO authenticated
  USING ( public.is_admin() );

-- Las de modificación (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "admins_insert_administrators_v2" ON public.administrators;
DROP POLICY IF EXISTS "admins_update_administrators_v2" ON public.administrators;
DROP POLICY IF EXISTS "admins_delete_administrators_v2" ON public.administrators;
DROP POLICY IF EXISTS "admins_manage_administrators" ON public.administrators;

DROP POLICY IF EXISTS "admins_insert_administrators_v3" ON public.administrators;
CREATE POLICY "admins_insert_administrators_v3" ON public.administrators
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS "admins_update_administrators_v3" ON public.administrators;
CREATE POLICY "admins_update_administrators_v3" ON public.administrators
  FOR UPDATE TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS "admins_delete_administrators_v3" ON public.administrators;
CREATE POLICY "admins_delete_administrators_v3" ON public.administrators
  FOR DELETE TO authenticated
  USING ( public.is_admin() );

-- 4. Arreglar CLIENTS también para prevenir futuros problemas y mejorar rendimiento
DROP POLICY IF EXISTS "admins_insert_clients_v2" ON public.clients;
DROP POLICY IF EXISTS "admins_update_clients_v2" ON public.clients;
DROP POLICY IF EXISTS "admins_delete_clients_v2" ON public.clients;

DROP POLICY IF EXISTS "admins_insert_clients_v3" ON public.clients;
CREATE POLICY "admins_insert_clients_v3" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS "admins_update_clients_v3" ON public.clients;
CREATE POLICY "admins_update_clients_v3" ON public.clients
  FOR UPDATE TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS "admins_delete_clients_v3" ON public.clients;
CREATE POLICY "admins_delete_clients_v3" ON public.clients
  FOR DELETE TO authenticated
  USING ( public.is_admin() );

-- 5. Arreglar EMPLOYEES también
DROP POLICY IF EXISTS "admins_insert_employees_v2" ON public.employees;
DROP POLICY IF EXISTS "admins_update_employees_v2" ON public.employees;
DROP POLICY IF EXISTS "admins_delete_employees_v2" ON public.employees;

DROP POLICY IF EXISTS "admins_insert_employees_v3" ON public.employees;
CREATE POLICY "admins_insert_employees_v3" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS "admins_update_employees_v3" ON public.employees;
CREATE POLICY "admins_update_employees_v3" ON public.employees
  FOR UPDATE TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS "admins_delete_employees_v3" ON public.employees;
CREATE POLICY "admins_delete_employees_v3" ON public.employees
  FOR DELETE TO authenticated
  USING ( public.is_admin() );

COMMENT ON FUNCTION public.is_admin IS 'Función crítica SECURITY DEFINER para romper ciclos de recursión en RLS y mejorar performance.';
