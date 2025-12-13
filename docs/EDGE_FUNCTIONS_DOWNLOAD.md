# 📦 EDGE FUNCTIONS - Comandos para Descargar o Recrear

## 🔴 IMPORTANTE:
Supabase CLI no puede descargar Edge Functions directamente de producción.  
Tienes 2 opciones:

---

## OPCIÓN 1: Copiar desde Dashboard (Recomendado) ⭐

### Pasos:

1. **Ve al Dashboard de Supabase:**
   ```
   https://supabase.com/dashboard/project/bgzsodcydkjqehjafbkv/functions
   ```

2. **Para cada función, copia el código:**

   **a) verificar-correo:**
   - Click en "verificar-correo"
   - Click en "Edit code" o "View code"
   - Copia todo el código
   - Pega en: `supabase/functions/verificar-correo/index.ts`

   **b) crear-pedidos (smooth-api):**
   - Click en "smooth-api" (crear pedidos)
   - Copia el código
   - Pega en: `supabase/functions/smooth-api/index.ts`

   **c) registrar-usuarios:**
   - Click en "registrar-usuarios"
   - Copia el código
   - Pega en: `supabase/functions/registrar-usuarios/index.ts`

   **d) ver-pedidos:**
   - Click en "ver-pedidos"
   - Copia el código
   - Pega en: `supabase/functions/ver-pedidos/index.ts`

   **e) mandar-mensaje:**
   - Click en "mandar-mensaje"
   - Copia el código
   - Pega en: `supabase/functions/mandar-mensaje/index.ts`

---

## OPCIÓN 2: Conectar con Proyecto Linked

Si ya tienes el proyecto linkeado:

```bash
# 1. Verificar que estás logueado
supabase login

# 2. Linkear proyecto (si no lo has hecho)
supabase link --project-ref bgzsodcydkjqehjafbkv

# 3. Descargar todas las funciones (ESTO PODRÍA FUNCIONAR si está linkeado)
supabase functions download
```

---

## OPCIÓN 3: Crear Estructura Localmente (Para Testing)

Si solo necesitas la estructura para desarrollo local:

```bash
# Crear directorios para cada función
mkdir -p supabase/functions/verificar-correo
mkdir -p supabase/functions/smooth-api
mkdir -p supabase/functions/registrar-usuarios
mkdir -p supabase/functions/ver-pedidos
mkdir -p supabase/functions/mandar-mensaje

# Crear archivos index.ts vacíos (luego copias el código del dashboard)
touch supabase/functions/verificar-correo/index.ts
touch supabase/functions/smooth-api/index.ts
touch supabase/functions/registrar-usuarios/index.ts
touch supabase/functions/ver-pedidos/index.ts
touch supabase/functions/mandar-mensaje/index.ts
```

---

## 📋 RESUMEN DE EDGE FUNCTIONS ENCONTRADAS:

| Función | Slug | Versión | Descripción Probable |
|---------|------|---------|----------------------|
| verificar-correo | verificar-correo | 22 | Verificación de email |
| crear pedidos | smooth-api | 21 | Creación de pedidos (API) |
| registrar-usuarios | registrar-usuarios | 2 | Registro de nuevos usuarios |
| ver-pedidos | ver-pedidos | 15 | Consulta de pedidos |
| mandar-mensaje | mandar-mensaje | 22 | Envío de mensajes/notificaciones |

---

## 🚀 COMANDOS PARA COPIAR Y PEGAR:

### Si quieres crear la estructura local:

```bash
cd /home/unknown/Documents/programacion/trabajo/PitaExpress3.0

# Crear estructura
mkdir -p supabase/functions/{verificar-correo,smooth-api,registrar-usuarios,ver-pedidos,mandar-mensaje}

# Crear archivos
touch supabase/functions/verificar-correo/index.ts
touch supabase/functions/smooth-api/index.ts
touch supabase/functions/registrar-usuarios/index.ts
touch supabase/functions/ver-pedidos/index.ts
touch supabase/functions/mandar-mensaje/index.ts

echo "✅ Estructura creada. Ahora copia el código desde el dashboard de Supabase"
```

### Luego, para probar localmente:

```bash
# Servir una función específica
supabase functions serve verificar-correo

# O todas a la vez
supabase functions serve
```

---

## ⚠️ NOTA IMPORTANTE:

**Las Edge Functions en producción ya están funcionando.**  
Solo necesitas descargarlas localmente si quieres:
- Modificarlas
- Probarlas localmente
- Hacer debugging
- Versionar el código en Git

Si NO necesitas modificarlas, **no es necesario descargarlas**.  
Tu aplicación seguirá usando las que están en producción.

---

## 📞 ¿NECESITAS EL CÓDIGO AHORA?

Si me dices para qué necesitas las Edge Functions, puedo ayudarte:
1. **Si solo quieres verlas:** Ve al dashboard
2. **Si necesitas modificarlas:** Dime cuál y te ayudo
3. **Si quieres versionarlas en Git:** Copia el código del dashboard a local

---

**¿Qué opción prefieres?**
