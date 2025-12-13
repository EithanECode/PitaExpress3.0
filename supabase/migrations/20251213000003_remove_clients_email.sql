-- ==========================================
-- FIX: Eliminar campo email de tabla clients
-- Fecha: 2025-12-12
-- Razón: Campo redundante (ya existe en auth.users) con constraint inválido
-- ==========================================

-- 1. Eliminar constraint UNIQUE en email (si existe)
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_cedula_key;

-- 2. Eliminar constraint CHECK erróneo (email <= 10 caracteres)
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_cedula_check;

-- 3. Eliminar columna email
ALTER TABLE public.clients DROP COLUMN IF EXISTS email;

-- Comentario
COMMENT ON TABLE public.clients IS 
  'Tabla de clientes. El email se obtiene de auth.users, no se duplica aquí.';
