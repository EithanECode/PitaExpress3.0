# Soluciones para Avisos de Seguridad de Supabase

## 🔴 **1. CRÍTICO: Function search_path mutable**

### **Problema:**
```
Function `public.get_admin_id_by_email` has a role mutable search_path
```

### **Riesgo:**
Vulnerabilidad de seguridad - podría permitir ataques de inyección SQL.

### **✅ Solución:**
Ejecuta el archivo actualizado `supabase/create-get-admin-function.sql` en el SQL Editor.

El archivo ahora incluye `SET search_path = public, auth` que fija el search path y previene vulnerabilidades.

**Pasos:**
1. Abre: https://supabase.com/dashboard/project/bgzsodcydkjqehjafbkv/sql/new
2. Copia y pega `supabase/create-get-admin-function.sql`
3. Ejecuta (Run)
4. Verifica que la advertencia desaparezca en el Dashboard

---

## ⚠️ **2. OTP Expiry más de 1 hora**

### **Problema:**
```
Email provider OTP expiry set to more than an hour
```

### **Riesgo:**
Menor seguridad - códigos OTP válidos por mucho tiempo.

### **✅ Solución:**

1. Ve a: **Authentication** → **Providers** → **Email**
2. Busca la sección **"OTP expiration time"**
3. Cambia el valor a **3600** (1 hora) o menos
4. Recomendado: **1800** (30 minutos) para mejor seguridad
5. Guarda los cambios

---

## 🔒 **3. HaveIBeenPwned Password Check**

### **Problema:**
```
Password breach detection not enabled
```

### **Beneficio:**
Previene que usuarios usen contraseñas comprometidas conocidas.

### **✅ Solución:**

1. Ve a: **Authentication** → **Providers** → **Email**
2. Busca la opción **"Password breach detection"** o **"HaveIBeenPwned"**
3. **Activa** el checkbox
4. Guarda los cambios

**Nota:** Esto verificará contraseñas contra la base de datos de HaveIBeenPwned.org al registrarse/cambiar contraseña.

---

## 📦 **4. PostgreSQL Version Outdated**

### **Problema:**
```
postgres version supabase-postgres-17.4.1.064 has outstanding security patches
```

### **Riesgo:**
Vulnerabilidades de seguridad conocidas sin parchear.

### **✅ Solución:**

**⚠️ IMPORTANTE:** Esto requiere mantenimiento de la base de datos.

1. Ve a: **Database** → **Database Settings**
2. Busca la sección **"Postgres Version"**
3. Si hay una actualización disponible, verás un botón **"Upgrade"**
4. **ANTES de actualizar:**
   - ✅ Haz un backup completo de tu base de datos
   - ✅ Programa la actualización en un horario de baja demanda
   - ✅ Notifica a tu equipo (habrá downtime breve)

5. Haz clic en **"Upgrade"** o **"Schedule Upgrade"**
6. Sigue las instrucciones del asistente

**Alternativa desde el Dashboard:**
- **Settings** → **General** → **Infrastructure**
- Busca notificaciones de actualización
- Sigue el proceso guiado

---

## ✅ **Resumen de Prioridades:**

| # | Advertencia | Prioridad | Tiempo Estimado |
|---|------------|-----------|----------------|
| 1 | Function search_path | 🔴 **ALTA** | 2 minutos |
| 2 | OTP Expiry | 🟡 Media | 1 minuto |
| 3 | Password Breach Check | 🟡 Média | 1 minuto |
| 4 | PostgreSQL Update | 🟠 Alta (planificada) | 15-30 minutos + downtime |

---

## 🔧 **Orden Recomendado:**

1. **Primero:** Arregla el search_path (crítico de seguridad)
2. **Segundo:** Habilita Password Breach Check (fácil, sin impacto)
3. **Tercero:** Ajusta OTP Expiry (fácil, sin impacto)
4. **Cuarto:** Planifica y ejecuta PostgreSQL update (requiere planificación)

---

## 📝 **Verificación Final:**

Después de aplicar las soluciones:

1. Ve a **Dashboard** → **Overview**
2. Revisa la sección de **Alerts** o **Health**
3. Deberías ver menos advertencias
4. Si persiste alguna, revisa los logs en **Logs** → **Postgres Logs**
