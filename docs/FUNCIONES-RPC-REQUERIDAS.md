# Funciones RPC necesarias en Supabase

Este proyecto usa varias funciones RPC (Remote Procedure Calls) de Supabase.
Aquí está la lista completa de funciones que DEBEN existir:

## ✅ FUNCIONES REQUERIDAS:

### 1. **get_admin_id_by_email** ⚠️ FALTANTE
- **Archivo:** `create-get-admin-function.sql`
- **Uso:** Chat de China para encontrar al administrador
- **Parámetros:** `admin_email TEXT`
- **Retorna:** `UUID`
- **Descripción:** Busca el user_id de un admin por email

### 2. **get_chat_conversations_v3**
- **Uso:** ChatList para obtener conversaciones
- **Parámetros:** `p_user_id UUID`
- **Retorna:** Lista de conversaciones con último mensaje
- **Archivo:** Debe estar en `docs/chat-database-setup.sql`

### 3. **get_order_timeline**
- **Uso:** Timeline de pedidos
- **Parámetros:** `p_order_id INTEGER`
- **Retorna:** Historial cronológico del pedido
- **Descripción:** Obtiene eventos del pedido ordenados por fecha

### 4. **get_order_state_history**
- **Uso:** Historial de estados del pedido
- **Parámetros:** `p_order_id INTEGER`
- **Retorna:** Lista de cambios de estado
- **Descripción:** Historial de transiciones de estado

### 5. **cleanup_old_exchange_rates**
- **Uso:** Limpieza automática de tasas antiguas (USD)
- **Parámetros:** Ninguno
- **Retorna:** Número de registros eliminados
- **Descripción:** Elimina registros de exchange_rates más antiguos de N días

### 6. **cleanup_old_exchange_rates_cny**
- **Uso:** Limpieza automática de tasas antiguas (CNY)
- **Parámetros:** Ninguno
- **Retorna:** Número de registros eliminados
- **Descripción:** Elimina registros de exchange_rates_cny más antiguos de N días

### 7. **get_latest_valid_exchange_rate_cny**
- **Uso:** Obtener última tasa CNY válida
- **Parámetros:** Ninguno
- **Retorna:** Registro de tasa más reciente
- **Descripción:** Tasa de cambio CNY/VES más reciente

---

## 🔧 CÓMO VERIFICAR SI EXISTEN:

Ejecuta en el SQL Editor de Supabase:

```sql
SELECT 
  routine_name as nombre_funcion,
  routine_type as tipo,
  routine_schema as schema
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

---

## 🚨 PRIORIDAD CRÍTICA:

**get_admin_id_by_email** - Sin esta función, el chat de China NO funciona.

**Solución:** Ejecutar `create-get-admin-function.sql` en Supabase SQL Editor
