-- Activar RLS en tablas de identidad
ALTER TABLE public.userlevel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para userlevel (Roles)
-- Usuarios pueden ver su propio rol
CREATE POLICY "Users can view own userlevel" ON public.userlevel
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admins pueden ver todos los roles (para gestión de usuarios)
CREATE POLICY "Admins can view all userlevels" ON public.userlevel
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators 
      WHERE user_id = auth.uid()
    )
  );

-- 2. Políticas para Perfiles (Públicos para usuarios autenticados)
-- Necesario para que el Chat y la UI muestren nombres de usuarios

-- Administrators
CREATE POLICY "Authenticated can view administrators" ON public.administrators
  FOR SELECT TO authenticated
  USING (true);

-- Employees
CREATE POLICY "Authenticated can view employees" ON public.employees
  FOR SELECT TO authenticated
  USING (true);

-- Clients
CREATE POLICY "Authenticated can view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (true);
