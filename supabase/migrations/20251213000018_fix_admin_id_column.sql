-- ==========================================
-- CORRECCIÓN CRÍTICA: Cambiar administrators.id por administrators.user_id
-- ==========================================
-- Esto arregla el login que "no agarra" porque las políticas anteriores fallaron al crearse
-- o estaban consultando una columna inexistente.

-- 1. Arreglar USERLEVEL (Crítico para Login)
DROP POLICY IF EXISTS "userlevel_select" ON public.userlevel;
DROP POLICY IF EXISTS "admins_manage_userlevel" ON public.userlevel;

CREATE POLICY "userlevel_select" ON public.userlevel
  FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM public.administrators
      WHERE administrators.user_id = (select auth.uid())
    )
  );

CREATE POLICY "admins_manage_userlevel" ON public.userlevel
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE administrators.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE administrators.user_id = (select auth.uid())
    )
  );

-- 2. Arreglar ORDER_REVIEWS
DROP POLICY IF EXISTS "users_update_reviews" ON public.order_reviews;
DROP POLICY IF EXISTS "admins_delete_reviews" ON public.order_reviews;

CREATE POLICY "users_update_reviews" ON public.order_reviews
  FOR UPDATE TO authenticated
  USING (
    (select auth.uid()) = (SELECT client_id FROM public.orders WHERE orders.id = order_reviews.order_id)
    OR EXISTS (
      SELECT 1 FROM public.administrators WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (select auth.uid()) = (SELECT client_id FROM public.orders WHERE orders.id = order_reviews.order_id)
    OR EXISTS (
      SELECT 1 FROM public.administrators WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "admins_delete_reviews" ON public.order_reviews
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators WHERE user_id = (select auth.uid())
    )
  );

-- 3. Arreglar BUSINESS_CONFIG
DROP POLICY IF EXISTS "admins_manage_business_config" ON public.business_config;

CREATE POLICY "admins_manage_business_config" ON public.business_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administrators WHERE user_id = (select auth.uid())
    )
  );

-- 4. Arreglar CLIENTS
DROP POLICY IF EXISTS "admins_modify_clients" ON public.clients;
DROP POLICY IF EXISTS "admins_update_clients_v2" ON public.clients;
DROP POLICY IF EXISTS "admins_delete_clients_v2" ON public.clients;

-- Nota: Estas politicas usaban userlevel antes (que es correcto/seguro), pero si queremos ser consistentes
-- con usar la tabla administrators, podemos hacerlo. Sin embargo, para arreglar el error 'column id does not exist'
-- en las migraciones previas (si ocurrio), nos aseguramos de usar userlevel (que tiene id) o administrators.user_id.
-- En las migraciones anteriores usabamos userlevel.id (correcto).
-- Pero por si acaso alguna referencia quedo mal, las recreamos asegurando que funcionen.
-- Usaremos userlevel para determinar si es admin, ya que es la fuente de verdad del rol.

CREATE POLICY "admins_insert_clients_v2" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid())
      AND user_level = 'Admin'
    )
  );

CREATE POLICY "admins_update_clients_v2" ON public.clients
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

CREATE POLICY "admins_delete_clients_v2" ON public.clients
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid())
      AND user_level = 'Admin'
    )
  );

-- 5. Arreglar EMPLOYEES
DROP POLICY IF EXISTS "admins_insert_employees_v2" ON public.employees;
DROP POLICY IF EXISTS "admins_update_employees_v2" ON public.employees;
DROP POLICY IF EXISTS "admins_delete_employees_v2" ON public.employees;

CREATE POLICY "admins_insert_employees_v2" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid())
      AND user_level = 'Admin'
    )
  );

CREATE POLICY "admins_update_employees_v2" ON public.employees
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

CREATE POLICY "admins_delete_employees_v2" ON public.employees
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = (select auth.uid())
      AND user_level = 'Admin'
    )
  );

-- 6. Arreglar ADMINISTRATORS (Crítico para admins)
DROP POLICY IF EXISTS "admins_insert_administrators_v2" ON public.administrators;
DROP POLICY IF EXISTS "admins_update_administrators_v2" ON public.administrators;
DROP POLICY IF EXISTS "admins_delete_administrators_v2" ON public.administrators;

-- Aquí también usamos userlevel para verificar permisos de admin, que es seguro y correcto.
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

COMMENT ON SCHEMA public IS 
  'Corrección aplicada: Referencias a tablas corregidas (admins.user_id vs id). Login desbloqueado.';
