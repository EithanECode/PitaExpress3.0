-- Permitir a los usuarios actualizar su propia fila en userlevel (para guardar foto de perfil)
CREATE POLICY "Users can update own userlevel" ON public.userlevel
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
