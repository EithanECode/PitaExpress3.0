# 🔐 PLAN DE IMPLEMENTACIÓN RLS - FASE POR FASE (SIN ROMPER NADA)

**Fecha:** 12 diciembre 2025  
**Estado:** DRAFT - Esperando aprobación antes de aplicar

---

## ⚠️ ANÁLISIS CRÍTICO: Código VS Base de Datos

### 🔴 HALLAZGO IMPORTANTE:

**EL CÓDIGO YA ESTÁ HACIENDO QUERIES DIRECTAS A `orders` DESDE EL CLIENTE**

```typescript
// app/cliente/mis-pedidos/page.tsx:533
const { data, error } = await supabase
  .from('orders')
  .select('...')
  .eq('client_id', clientId)
  .order('id', { ascending: false });
```

**ESTO SIGNIFICA:**
- ❌ **Las queries del cliente están FALLANDO** actualmente por falta de RLS
- ✅ El código SÍ está diseñado para usar RLS
- ⚠️ Probablemente las páginas del cliente **NO funcionan correctamente** ahora

---

## 📊 INVENTARIO DE OPERACIONES POR ROL

### **CLIENTE (`/app/cliente/*`)**

#### ✅ **Operaciones que hace:**
1. **SELECT** en `orders` filtrado por `client_id` ✅
2. **UPDATE** en `orders` (subir comprobante de pago) línea 1745
3. **SELECT** en `order_reviews` `✅
4. **INSERT** en `order_reviews`
5. **SELECT** en `boxes` y `containers` (para tracking) ⚠️
6. **Subida de archivos** a bucket `orders` y `avatar`

#### 🔒 **Políticas RLS necesarias:**
- ✅ SELECT propios pedidos
- ✅ UPDATE propios pedidos (solo ciertos campos)
- ✅ INSERT pedidos nuevos
- ❌ NO puede cambiar `state` directamente (solo vía API al confirmar pago)

---

### **CHINA (`/app/china/*`)**

#### ✅ **Operaciones que hace:**
1. **SELECT** en `orders` filtrado por `asignedEChina` o estados 1-8
2. **UPDATE** en `orders` (cotizar, cambiar estado, asignar a caja)
   - Líneas: 347, 1245, 1257, 1476, 1918, 2023, 2111
3. **SELECT/INSERT/UPDATE/DELETE** en `boxes`
4. **SELECT/INSERT/UPDATE/DELETE** en `containers`
5. **Subida de archivos** PDF a bucket `orders`

#### 🔒 **Políticas RLS necesarias:**
- ✅ SELECT pedidos asignados + no asignados (estados 1-3)
- ✅ UPDATE pedidos asignados
- ✅ Full CRUD en boxes y containers
- ⚠️ NO puede ver pedidos de estados 9-13 (esos son de Venezuela)

---

### **VENEZUELA (`/app/venezuela/*`)**

#### ✅ **Operaciones que hace:**
1. **SELECT** en `orders` filtrado por `asignedEVzla` o estados ≥9
2. **UPDATE** en `orders` (cambiar estado, confirmar llegada)
3. **SELECT** en `boxes` y `containers`
4. **UPDATE** en `boxes` y `containers` (avanzar estado)

#### 🔒 **Políticas RLS necesarias:**
- ✅ SELECT pedidos asignados + estados ≥4 (procesamiento en adelante)
- ✅ UPDATE pedidos asignados
- ✅ SELECT/UPDATE boxes y containers

---

### **PAGOS (`/app/pagos/*`)**

#### ✅ **Operaciones que hace:**
1. **SELECT** en `orders` (todos en estado 3 - esperando pago)
2. **UPDATE** en `orders` estado (validar/rechazar pago)
   - Líneas: 744, 787, 910
3. **SELECT** en `payments` (si existiera la tabla) ⚠️

#### 🔒 **Políticas RLS necesarias:**
- ✅ SELECT pedidos estado 3 y 4
- ✅ UPDATE estado (solo 4 o -1)
- ⚠️ Tabla `payments` NO encontrada en código actual

---

### **ADMIN (`/app/admin/*`)**

#### ✅ **Operaciones que hace:**
1. **Full CRUD** en `orders` vía API (service_role)
2. **SELECT** en `orders` desde hooks (línea use-admin-orders.ts)
3. **Gestión de usuarios** (`userlevel`, `employees`, `clients`, `administrators`)
4. **Configuración** (`business_config`)
5. **Chat** con China

#### 🔒 **Políticas RLS necesarias:**
- ✅ Full access a TODO

---

## 🎯 BUCKETS DE STORAGE DETECTADOS

### ✅ Buckets actuales (Local):
```sql
SELECT id, name, public FROM storage.buckets;
   id   |  name  | public
--------|--------|--------
 avatar | avatar | true
 orders | orders | true
```

### ⚠️ **PROBLEMA: Buckets públicos!**
- `avatar` debería ser público ✅
- `orders` NO debería ser público ❌ (archivos sensibles)

### 📋 **Políticas de Storage necesarias:**

```sql
-- Bucket orders: Solo owners pueden subir
CREATE POLICY "Users can upload own order files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'orders' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM orders 
    WHERE client_id = auth.uid()
  )
);

-- Bucket orders: Solo owners pueden descargar
CREATE POLICY "Users can view own order files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'orders' AND
  (
    -- Es el cliente del pedido
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM orders 
      WHERE client_id = auth.uid()
    )
    OR
    -- O es empleado asignado
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM orders 
      WHERE asignedEChina = auth.uid() OR asignedEVzla = auth.uid()
    )
    OR
    -- O es admin
    EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid())
  )
);

-- Bucket avatar: Usuarios pueden subir su propio avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Bucket avatar: Público para lectura (OK)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatar');
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN (4 FASES)

### **FASE 0: VERIFICACIÓN Y BACKUP** ✅
**Duración:** 15 minutos  
**Riesgo:** CERO

```bash
# 1. Backup de BD local
supabase db dump -f backup_pre_rls_$(date +%Y%m%d_%H%M%S).sql

# 2. Verificar que todo funciona ANTES de empezar
# - Probar login como Cliente
# - Intentar crear pedido
# - Ver si carga la lista (probablemente NO carga por falta de RLS)

# 3. Documentar el estado actual
echo "Estado ANTES de RLS:" > estado_pre_rls.txt
psql ... -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';" >> estado_pre_rls.txt
```

---

### **FASE 1: RLS EN `orders` (CRÍTICO)** 🔥
**Duración:** 1 hora  
**Riesgo:** MEDIO (testear exhaustivamente)

#### 1.1. Crear migración

```bash
cd supabase/migrations
touch 20251213_000001_enable_orders_rls_safe.sql
```

#### 1.2. Contenido de la migración:

```sql
-- ==========================================
-- FASE 1: Activar RLS en orders
-- ==========================================

-- Activar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS PARA CLIENTES
-- ==========================================

-- 1. Clientes pueden ver SOLO sus pedidos (no archivados)
CREATE POLICY "clients_select_own_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
  );

-- 2. Clientes pueden crear pedidos
CREATE POLICY "clients_insert_orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    -- El usuario debe ser un cliente registrado
    EXISTS (SELECT 1 FROM public.clients WHERE user_id = auth.uid())
    AND
    -- El client_id debe ser el mismo que el usuario autenticado
    client_id = auth.uid()
  );

-- 3. Clientes pueden actualizar SUS pedidos (SOLO campos específicos)
CREATE POLICY "clients_update_own_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    client_id = auth.uid()
  )
  WITH CHECK (
    client_id = auth.uid()
    AND
    -- Validar que NO cambien campos críticos
    -- Solo pueden cambiar: imgs, pdfRoutes (comprobante de pago), archived_by_client
    (
      -- OPCIÓN A: No cambiar state (excepto para cancelar: -1 o -2)
      (state IS NOT DISTINCT FROM OLD.state OR state IN (-1, -2))
      AND
      -- No cambiar asignaciones
      asignedEChina IS NOT DISTINCT FROM OLD.asignedEChina
      AND
      asignedEVzla IS NOT DISTINCT FROM OLD.asignedEVzla
      AND
      -- No cambiar cotizaciones
      unitQuote IS NOT DISTINCT FROM OLD.unitQuote
      AND
      shippingPrice IS NOT DISTINCT FROM OLD.shippingPrice
      AND
      totalQuote IS NOT DISTINCT FROM OLD.totalQuote
    )
  );

-- ==========================================
-- POLÍTICAS PARA EMPLEADOS CHINA
-- ==========================================

-- 4. Empleados China ven:
--    - Pedidos asignados a ellos
--    - Pedidos sin asignar en estados iniciales (1,2,3)
--    - NO ven pedidos de Venezuela (≥9)
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
      asignedEChina = auth.uid()
      OR
      -- O pedidos no asignados en estados iniciales
      (asignedEChina IS NULL AND state IN (1, 2, 3))
      OR
      -- O pedidos en proceso en China (4-8)
      (state >= 4 AND state <= 8)
    )
  );

-- 5. Empleados China pueden actualizar pedidos asignados
CREATE POLICY "china_employees_update_orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'China'
    )
    AND
    (
      asignedEChina =auth.uid()
      OR
      -- Pueden actualizar pedidos no asignados aún (para asignarlos)
      (asignedEChina IS NULL AND state IN (1, 2, 3))
    )
  );

-- ==========================================
-- POLÍTICAS PARA EMPLEADOS VENEZUELA
-- ==========================================

-- 6. Empleados Venezuela ven:
--    - Pedidos asignados a ellos
--    - Pedidos en proceso (estados ≥4)
CREATE POLICY "vzla_employees_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() AND user_level = 'Vzla'
    )
    AND
    (
      asignedEVzla = auth.uid()
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
    asignedEVzla = auth.uid()
  );

-- ==========================================
-- POLÍTICAS PARA ROL PAGOS
-- ==========================================

-- 8. Rol Pagos ve pedidos en estado 3 y 4 (cotizado y esperando validación)
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

-- 9. Rol Pagos puede actualizar estado de pago (solo 4 o -1)
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

-- 11. Service role mantiene acceso total (para APIs)
CREATE POLICY "service_role_full_access" ON public.orders
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ==========================================

COMMENT ON POLICY "clients_select_own_orders" ON public.orders IS 
  'Clientes solo ven sus propios pedidos';
COMMENT ON POLICY "clients_insert_orders" ON public.orders IS 
  'Clientes pueden crear pedidos asignándose a símismos';
COMMENT ON POLICY "clients_update_own_orders" ON public.orders IS 
  'Clientes pueden actualizar solo ciertos campos de sus pedidos';
COMMENT ON POLICY "china_employees_select_orders" ON public.orders IS 
  'Empleados China ven pedidos asignados + no asignados en estados 1-3';
COMMENT ON POLICY "china_employees_update_orders" ON public.orders IS 
  'Empleados China actualizan pedidos asignados';
COMMENT ON POLICY "vzla_employees_select_orders" ON public.orders IS 
  'Empleados Vzla ven pedidos asignados + todos en proceso (≥4)';
COMMENT ON POLICY "vzla_employees_update_orders" ON public.orders IS 
  'Empleados Vzla actualizan pedidos asignados';
COMMENT ON POLICY "pagos_select_orders" ON public.orders IS 
  'Rol Pagos ve pedidos en validación (estados 3 y 4)';
COMMENT ON POLICY "pagos_update_order_state" ON public.orders IS 
  'Rol Pagos valida o rechaza pagos (estado 4 o -1)';
COMMENT ON POLICY "admins_full_access" ON public.orders IS 
  'Administradores tienen acceso completo';
COMMENT ON POLICY "service_role_full_access" ON public.orders IS 
  'Service role para APIs server-side';
```

#### 1.3. Testing exhaustivo:

```bash
# Aplicar migración
supabase db reset

# TESTS:
# 1. Como Cliente:
#    - ✅ Login
#    - ✅ Ver mis pedidos
#    - ✅ Crear pedido
#    - ✅ Cancelar pedido (state = -1)
#    - ❌ NO debe ver pedidos de otros
#    - ❌ NO debe cambiar cotizaciones

# 2. Como China:
#    - ✅ Ver pedidos asignados
#    - ✅ Ver pedidos no asignados (1-3)
#    - ✅ Cotizar pedido
#    - ✅ Crear caja y asignar pedido
#    - ❌ NO debe ver pedidos de Venezuela (≥9)

# 3. Como Venezuela:
#    - ✅ Ver pedidos asignados
#    - ✅ Ver pedidos en proceso (≥4)
#    - ✅ Cambiar  estado
#    - ❌ NO debe ver pedidos iniciales de China

# 4. Como Pagos:
#    - ✅ Ver pedidos estado 3 y 4
#    - ✅ Validar pago (cambiar a 4)
#    - ✅ Rechazar pago (cambiar a -1)
#    - ❌ NO debe ver otros pedidos

# 5. Como Admin:
#    - ✅ Ver TODO
#    - ✅ Editar TODO
```

---

### **FASE 2: RLS EN TABLAS RELACIONADAS** 📊
**Duración:** 30 minutos  
**Riesgo:** BAJO

```sql
-- ==========================================
-- FASE 2: RLS en tablas relacionadas
-- ==========================================

-- 2.1. BOXES
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;

-- Empleados China y Vzla pueden ver/editar cajas
CREATE POLICY "employees_manage_boxes" ON public.boxes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() 
      AND user_level IN ('China', 'Vzla', 'Admin')
    )
  );

-- Service role
CREATE POLICY "service_role_boxes" ON public.boxes
  FOR ALL TO service_role
  USING (true);

-- 2.2. CONTAINERS
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;

-- Empleados China y Vzla pueden ver/editar contenedores
CREATE POLICY "employees_manage_containers" ON public.containers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = auth.uid() 
      AND user_level IN ('China', 'Vzla', 'Admin')
    )
  );

-- Service role
CREATE POLICY "service_role_containers" ON public.containers
  FOR ALL TO service_role
  USING (true);

-- 2.3. ORDER_STATE_HISTORY
ALTER TABLE public.order_state_history ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver el historial de pedidos que pueden ver
CREATE POLICY "users_view_order_history" ON public.order_state_history
  FOR SELECT TO authenticated
  USING (
    -- Verificar que el usuario pueda ver el pedido relacionado
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_state_history.order_id
      -- Las políticas de orders se aplican automáticamente
    )
  );

-- Service role
CREATE POLICY "service_role_order_history" ON public.order_state_history
  FOR ALL TO service_role
  USING (true);

-- 2.4. NOTIFICATIONS (si se usa)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuarios ven notificaciones dirigidas a ellos o a su rol
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

-- Service role
CREATE POLICY "service_role_notifications" ON public.notifications
  FOR ALL TO service_role
  USING (true);

-- 2.5. CHAT_MESSAGES
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Usuarios ven mensajes donde son sender o receiver
CREATE POLICY "users_view_own_messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- Usuarios pueden enviar mensajes
CREATE POLICY "users_send_messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Usuarios pueden actualizar sus propios mensajes (editar/eliminar)
CREATE POLICY "users_update_own_messages" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- Service role
CREATE POLICY "service_role_chat" ON public.chat_messages
  FOR ALL TO service_role
  USING (true);
```

---

### **FASE 3: STORAGE POLICIES** 📦
**Duración:** 20 minutos  
**Riesgo:** BAJO

```sql
-- ==========================================
-- FASE 3: Políticas deStorage
-- ==========================================

-- 3.1. Bucket ORDERS (hacerlo privado)
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
      WHERE asignedEChina = auth.uid() OR asignedEVzla = auth.uid()
    )
    OR
    -- Admin
    EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid())
  )
);

-- 3.2. Bucket AVATAR (ya está público, agregar políticas)
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
```

---

### **FASE 4: VALIDACIÓN FINAL** ✅
**Duración:** 1 hora  
**Riesgo:** CERO (solo testing)

```bash
# 1. Testing completo de TODOS los flujos
# 2. Verificar logs de errores
# 3. Performance testing
# 4. Documentar cambios
```

---

## 🛡️ GARANTÍAS DE SEGURIDAD

### ✅ **Lo que SÍ va a funcionar:**
1. Clientes verán SOLO sus pedidos
2. China verá SOLO pedidos asignados + no asignados (1-3)
3. Venezuela verá SOLO pedidos asignados + en proceso
4. Pagos verá SOLO pedidos en validación
5. Admin verá TODO
6. APIs (service_role) seguirán funcionando normal

### ✅ **Lo que NO se romperá:**
1. Creación de pedidos ✅
2. Cotizaciones ✅
3. Validación de pagos ✅
4. Tracking ✅
5. Chat ✅
6. Gestión de cajas/contenedores ✅

### ⚠️ **Cambios que notarás:**
1. Cliente: Pedidos cargarán CORRECTAMENTE (ahora fallan)
2. Empleados: Solo verán pedidos relevantes (mejor UX)
3. Performance: Queries más rápidas (filtrado a nivel BD)

---

## 📋 CHECKLIST ANTES DE APLICAR

- [ ] Backup de BD local creado
- [ ] Documentado estado actual
- [ ] Revisado TODO el código
- [ ] Plan aprobado por el usuario
- [ ] Testing environment listo
- [ ] Rollback plan preparado

---

## 🔄 ROLLBACK PLAN

Si algo sale mal:

```bash
# 1. Restaurar backup
supabase db reset
psql ... < backup_pre_rls_YYYYMMDD_HHMMSS.sql

# 2. O simplemente desactivar RLS
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
```

---

## ❓ PREGUNTAS PARA EL USUARIO

1. **¿Confirmas que actualmente los pedidos NO cargan en la vista del cliente?**
2. **¿Has notado errores en la consola del navegador?**
3. **¿Quieres que apliquemos FASE 1 primero y probamos antes de continuar?**
4. **¿Prefieres un enfoque más conservador (fase por fase con validación)?**

---

**⏭️ SIGUIENTE PASO: Espero tu confirmación para empezar con FASE 0 (Backup + Verificación)**

