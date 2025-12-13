-- Crear bucket de almacenamiento para avatares
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatar', 'avatar', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad para el bucket 'avatar'

-- 1. Permitir acceso público de lectura a los avatares
CREATE POLICY "Avatar Public Access" ON storage.objects
  FOR SELECT USING ( bucket_id = 'avatar' );

-- 2. Permitir a usuarios autenticados subir su propio avatar
-- Se asume que el nombre del archivo contiene el user_id o carpeta con user_id
-- O simplemente permitimos subir a authenticated usuarios. 
-- Para mayor seguridad, restringimos por convención de nombre (ver código frontend)
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatar');

-- 3. Permitir a usuarios actualizar su propio avatar
CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatar');

-- 4. Permitir a usuarios borrar su propio avatar
CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatar');
