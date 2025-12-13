-- Habilitar RLS en business_config
ALTER TABLE public.business_config ENABLE ROW LEVEL SECURITY;

-- Política 1: Todos los usuarios autenticados pueden VER la configuración (necesario para calculadoras)
CREATE POLICY "Authenticated users can view business_config" ON public.business_config
  FOR SELECT TO authenticated
  USING (true);

-- Política 2: Solo Administradores pueden EDITAR la configuración
CREATE POLICY "Admins can update business_config" ON public.business_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE userlevel.id = auth.uid()
      AND userlevel.user_level = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE userlevel.id = auth.uid()
      AND userlevel.user_level = 'Admin'
    )
  );

-- Política 3: Solo Administradores pueden INSERTAR (por si acaso se borrara)
CREATE POLICY "Admins can insert business_config" ON public.business_config
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE userlevel.id = auth.uid()
      AND userlevel.user_level = 'Admin'
    )
  );
