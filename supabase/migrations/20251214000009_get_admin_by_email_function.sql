-- FIX: Function to get the designated admin ID by email
-- This allows China to always connect with the same admin

CREATE OR REPLACE FUNCTION public.get_admin_id_by_email(admin_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get user ID from auth.users by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email
  AND deleted_at IS NULL
  LIMIT 1;
  
  -- Verify this user is actually an admin
  IF admin_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.userlevel
      WHERE id = admin_user_id
      AND user_level = 'Admin'
    ) THEN
      RETURN admin_user_id;
    END IF;
  END IF;
  
  -- Return NULL if not found or not an admin
  RETURN NULL;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_admin_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_id_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_id_by_email(text) TO anon;

COMMENT ON FUNCTION public.get_admin_id_by_email(text) IS 'Returns the user ID of an admin by email, or NULL if not found';
