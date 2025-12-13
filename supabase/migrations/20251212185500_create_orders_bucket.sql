-- Crear bucket de almacenamiento para pedidos (Imágenes y PDFs)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('orders', 'orders', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad para el bucket 'orders'

-- 1. Acceso público de lectura
CREATE POLICY "Orders Public Access" ON storage.objects
  FOR SELECT USING ( bucket_id = 'orders' );

-- 2. Permitir subir archivos a usuarios autenticados (Clientes al crear pedidos)
CREATE POLICY "Authenticated users can upload to orders" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'orders');

-- 3. Permitir actualizar a usuarios autenticados
CREATE POLICY "Authenticated users can update orders files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'orders');

-- 4. Permitir borrar a usuarios autenticados
CREATE POLICY "Authenticated users can delete orders files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'orders');
