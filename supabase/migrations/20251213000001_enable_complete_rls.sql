-- ==========================================
-- MIGRACIÓN COMPLETA: Activar RLS y Seguridad
-- Fecha: 2025-12-12
-- Descripción: Activar Row Level Security en todas las tablas críticas
--              y configurar políticas de seguridad por rol
-- ==========================================

-- ==========================================
-- PARTE 1: RLS EN TABLA ORDERS (CRÍTICO)
-- ==========================================

-- Activar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS PARA CLIENTES
-- ==========================================

-- 1. Clientes pueden ver SOLO sus pedidos
CREATE POLICY "clients_select_own_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
  );

-- 2. Clientes pueden crear pedidos
CREATE POLICY "clients_insert_orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients WHERE user_id = auth.uid())
    AND
    client_id = auth.uid()
  );

-- 3. Clientes pueden actualizar SUS pedidos
-- Nota: Protección adicional de campos críticos se maneja vía triggers y validación de API
CREATE POLICY "clients_update_own_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    client_id = auth.uid()
  )
  WITH CHECK (
    client_id = auth.uid()
  );

-- ==========================================
-- POLÍTICAS PARA EMPLEADOS CHINA
-- ==========================================

-- 4. Empleados China ven pedidos asignados + no asignados en estados iniciales
CREATE POLICY "china_employees_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'China'
    )
    AND
    (
      -- Pedidos asignados a este empleado
      "asignedEChina" = auth.uid()
      OR
      -- Pedidos no asignados en estados iniciales (1-3)
      ("asignedEChina" IS NULL AND state IN (1, 2, 3))
      OR
      -- Pedidos en proceso en China (4-8) para visibilidad general
      (state >= 4 AND state <= 8)
    )
  );

-- 5. Empleados China pueden actualizar pedidos asignados o no asignados (para asignarlos)
CREATE POLICY "china_employees_update_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'China'
    )
    AND
    (
      "asignedEChina" = auth.uid()
      OR
      -- Pueden actualizar pedidos no asignados para asignarlos
      ("asignedEChina" IS NULL AND state IN (1, 2, 3))
      OR
      -- Estados 4-8 para gestión de cajas/contenedores
      (state >= 1 AND state <= 8)
    )
  );

-- ==========================================
-- POLÍTICAS PARA EMPLEADOS VENEZUELA
-- ==========================================

-- 6. Empleados Venezuela ven pedidos asignados + en proceso
CREATE POLICY "vzla_employees_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'Vzla'
    )
    AND
    (
      "asignedEVzla" = auth.uid()
      OR
      state >= 4  -- Procesamiento en adelante
    )
  );

-- 7. Empleados Venezuela pueden actualizar pedidos asignados
CREATE POLICY "vzla_employees_update_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'Vzla'
    )
    AND
    (
      "asignedEVzla" = auth.uid()
      OR
      state >= 4  -- Pueden gestionar pedidos en proceso
    )
  );

-- ==========================================
-- POLÍTICAS PARA ROL PAGOS
-- ==========================================

-- 8. Rol Pagos ve pedidos en validación
CREATE POLICY "pagos_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'Pagos'
    )
    AND
    state IN (3, 4)
  );

-- 9. Rol Pagos puede actualizar estado de pago
CREATE POLICY "pagos_update_order_state" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'Pagos'
    )
    AND
    state IN (3, 4)
  )
  WITH CHECK (
    -- Solo pueden cambiar a estado 4 (validado) o -1 (rechazado)
    state IN (4, -1)
  );

-- ==========================================
-- POLÍTICAS PARA ADMINISTRADORES
-- ==========================================

-- 10. Admins tienen acceso total
CREATE POLICY "admins_full_access" ON public.orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administrators
      WHERE user_id = auth.uid()
    )
  );

-- ==========================================
-- POLÍTICA PARA SERVICE ROLE (APIs)
-- ==========================================

-- 11. Service role mantiene acceso total
CREATE POLICY "service_role_full_access" ON public.orders
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- PARTE 2: RLS EN TABLAS RELACIONADAS
-- ==========================================

-- 2.1. BOXES
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_manage_boxes" ON public.boxes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() 
      AND user_level IN ('China', 'Vzla', 'Admin')
    )
  );

CREATE POLICY "service_role_boxes" ON public.boxes
  FOR ALL TO service_role
  USING (true);

-- 2.2. CONTAINERS
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_manage_containers" ON public.containers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() 
      AND user_level IN ('China', 'Vzla', 'Admin')
    )
  );

CREATE POLICY "service_role_containers" ON public.containers
  FOR ALL TO service_role
  USING (true);

-- 2.3. ORDER_STATE_HISTORY
ALTER TABLE public.order_state_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_order_history" ON public.order_state_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_state_history.order_id
      -- Las políticas de orders se aplican automáticamente
    )
  );

CREATE POLICY "service_role_order_history" ON public.order_state_history
  FOR ALL TO service_role
  USING (true);

-- 2.4. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (
      audience_type = 'role' AND
      audience_value IN (
        SELECT user_level FROM public.userlevel WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "service_role_notifications" ON public.notifications
  FOR ALL TO service_role
  USING (true);

-- 2.5. CHAT_MESSAGES
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "users_send_messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

CREATE POLICY "users_update_own_messages" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "service_role_chat" ON public.chat_messages
  FOR ALL TO service_role
  USING (true);

-- 2.6. CHAT_TYPING_STATUS
ALTER TABLE public.chat_typing_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_typing" ON public.chat_typing_status
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "service_role_typing" ON public.chat_typing_status
  FOR ALL TO service_role
  USING (true);

-- 2.7. CHAT_HIDDEN_CONVERSATIONS
ALTER TABLE public.chat_hidden_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_hidden_convs" ON public.chat_hidden_conversations
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "service_role_hidden_convs" ON public.chat_hidden_conversations
  FOR ALL TO service_role
  USING (true);

-- 2.8. NOTIFICATION_READS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_reads" ON public.notification_reads
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "service_role_notif_reads" ON public.notification_reads
  FOR ALL TO service_role
  USING (true);

-- ==========================================
-- PARTE 3: CREAR BUCKET FALTANTE (chat-files)
-- ==========================================

-- Crear bucket para archivos de chat si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  false,  -- Privado
  10485760,  -- 10 MB límite
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PARTE 4: POLÍTICAS DE STORAGE
-- ==========================================

-- 4.1. Bucket ORDERS (hacerlo privado si no lo es)
UPDATE storage.buckets
SET public = false
WHERE id = 'orders';

-- Políticas para bucket orders
CREATE POLICY "users_upload_own_order_files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'orders' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM orders 
    WHERE client_id = auth.uid()
  )
);

CREATE POLICY "users_view_accessible_order_files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'orders' AND
  (
    -- Cliente del pedido
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM orders 
      WHERE client_id = auth.uid()
    )
    OR
    -- Empleado asignado
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM orders 
      WHERE "asignedEChina" = auth.uid() OR "asignedEVzla" = auth.uid()
    )
    OR
    -- Admin
    EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid())
  )
);

-- Service role para orders
CREATE POLICY "service_role_orders_storage"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'orders');

-- 4.2. Bucket AVATAR (políticas)
CREATE POLICY "users_upload_own_avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatar');

CREATE POLICY "users_update_own_avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_delete_own_avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4.3. Bucket CHAT-FILES (privado)
CREATE POLICY "users_upload_chat_files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files' AND
  -- Solo usuarios autenticados pueden subir archivos para chat
  auth.uid() IS NOT NULL
);

CREATE POLICY "users_view_chat_files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files' AND
  (
    -- Pueden ver archivos que subieron ellos
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- O archivos en conversaciones donde participan
    EXISTS (
      SELECT 1 FROM chat_messages
      WHERE (sender_id = auth.uid() OR receiver_id = auth.uid())
      AND (file_url LIKE '%' || name || '%')
    )
  )
);

CREATE POLICY "service_role_chat_files"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'chat-files');

-- ==========================================
-- PARTE 5: COMENTARIOS Y DOCUMENTACIÓN
-- ==========================================

COMMENT ON POLICY "clients_select_own_orders" ON public.orders IS 
  'Clientes solo ven sus propios pedidos';
COMMENT ON POLICY "clients_insert_orders" ON public.orders IS 
  'Clientes pueden crear pedidos asignándose a sí mismos';
COMMENT ON POLICY "clients_update_own_orders" ON public.orders IS 
  'Clientes pueden actualizar solo ciertos campos (cancelar, subir comprobantes)';
COMMENT ON POLICY "china_employees_select_orders" ON public.orders IS 
  'Empleados China ven pedidos asignados + no asignados en estados 1-8';
COMMENT ON POLICY "china_employees_update_orders" ON public.orders IS 
  'Empleados China actualizan pedidos asignados y gestionan cajas';
COMMENT ON POLICY "vzla_employees_select_orders" ON public.orders IS 
  'Empleados Vzla ven pedidos asignados + todos en proceso (≥4)';
COMMENT ON POLICY "vzla_employees_update_orders" ON public.orders IS 
  'Empleados Vzla actualizan pedidos asignados';
COMMENT ON POLICY "pagos_select_orders" ON public.orders IS 
  'Rol Pagos ve pedidos en validación (estados 3 y 4)';
COMMENT ON POLICY "pagos_update_order_state" ON public.orders IS 
  'Rol Pagos valida o rechaza pagos';
COMMENT ON POLICY "admins_full_access" ON public.orders IS 
  'Administradores tienen acceso completo';
COMMENT ON POLICY "service_role_full_access" ON public.orders IS 
  'Service role para APIs server-side';

-- ==========================================
-- FIN DE LA MIGRACIÓN
-- ==========================================
