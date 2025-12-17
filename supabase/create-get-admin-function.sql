-- ===================================================================
-- FUNCIÓN RPC: get_admin_id_by_email
-- Devuelve el user_id del administrador dado su email
-- ===================================================================

-- Borrar la función si existe (para poder recrearla)
DROP FUNCTION IF EXISTS get_admin_id_by_email(TEXT);

-- Crear la función
CREATE OR REPLACE FUNCTION get_admin_id_by_email(admin_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Buscar el usuario en auth.users por email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email
  LIMIT 1;
  
  -- Retornar el ID encontrado (o NULL si no existe)
  RETURN admin_user_id;
END;
$$;

-- Dar permisos para que el usuario anónimo pueda ejecutarla
GRANT EXECUTE ON FUNCTION get_admin_id_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_admin_id_by_email(TEXT) TO authenticated;

-- Comentario descriptivo
COMMENT ON FUNCTION get_admin_id_by_email IS 'Obtiene el user_id de un administrador dado su email';

-- ===================================================================
-- PRUEBA: Verificar que funcione
-- ===================================================================
SELECT get_admin_id_by_email('admin@gmail.com') as admin_user_id;

-- Resultado esperado: Debe devolver el UUID del admin
-- Si devuelve NULL, el usuario admin@gmail.com no existe
