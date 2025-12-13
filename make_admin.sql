-- Ver usuarios recientes
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Cambiar el último usuario a Admin
-- Primero obtenemos el ID del último usuario
WITH last_user AS (
  SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1
)
-- Actualizar userlevel a Admin
UPDATE public.userlevel 
SET user_level = 'Admin' 
WHERE id IN (SELECT id FROM last_user);

-- Insertar en administrators si no existe
INSERT INTO public.administrators (user_id, name)
SELECT 
  u.id,
  u.raw_user_meta_data->>'full_name' as name
FROM auth.users u
WHERE u.id IN (
  SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1
)
ON CONFLICT (user_id) DO NOTHING;

-- Eliminar de clients si existe (porque ahora es admin)
DELETE FROM public.clients 
WHERE user_id IN (
  SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1
);

-- Verificar el cambio
SELECT 
  u.id,
  u.email,
  ul.user_level,
  a.name as admin_name
FROM auth.users u
LEFT JOIN public.userlevel ul ON u.id = ul.id
LEFT JOIN public.administrators a ON u.id = a.user_id
ORDER BY u.created_at DESC
LIMIT 5;
