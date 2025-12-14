-- FIX: Rename parameter to avoid any potential collision/ambiguity and force schema refresh
-- We rename current_user_id -> p_user_id

DROP FUNCTION IF EXISTS public.get_chat_conversations_v2(uuid);

CREATE OR REPLACE FUNCTION public.get_chat_conversations_v2(p_user_id uuid)
 RETURNS TABLE(
    user_id uuid,
    user_email text,
    user_name text,
    last_message text,
    last_message_time timestamp with time zone,
    unread_count bigint,
    last_file_url text,
    is_hidden boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH relevant_messages AS (
    SELECT 
      cm.id,
      cm.sender_id,
      cm.receiver_id,
      cm.message,
      cm.created_at,
      cm.file_url,
      cm.read,
      cm.deleted_by_sender,
      cm.deleted_by_receiver
    FROM public.chat_messages cm
    WHERE (cm.sender_id = p_user_id AND cm.deleted_by_sender = FALSE)
       OR (cm.receiver_id = p_user_id AND cm.deleted_by_receiver = FALSE)
  ),
  conversations AS (
    SELECT DISTINCT
      CASE
        WHEN rm.sender_id = p_user_id THEN rm.receiver_id
        ELSE rm.sender_id
      END as other_user_id
    FROM relevant_messages rm
  ),
  hidden_status AS (
    SELECT 
      chc.hidden_user_id, 
      chc.created_at as hidden_since
    FROM public.chat_hidden_conversations chc
    WHERE chc.user_id = p_user_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (c.other_user_id)
      c.other_user_id,
      rm.message,
      rm.created_at,
      rm.file_url
    FROM conversations c
    JOIN relevant_messages rm ON 
      (rm.sender_id = c.other_user_id OR rm.receiver_id = c.other_user_id)
    LEFT JOIN hidden_status hs ON hs.hidden_user_id = c.other_user_id
    WHERE (hs.hidden_since IS NULL OR rm.created_at > hs.hidden_since)
    ORDER BY c.other_user_id, rm.created_at DESC
  ),
  unread_counts AS (
    SELECT
      rm.sender_id as other_user_id,
      COUNT(*) as unread
    FROM relevant_messages rm
    LEFT JOIN hidden_status hs ON hs.hidden_user_id = rm.sender_id
    WHERE rm.receiver_id = p_user_id
      AND rm.read = FALSE
      AND (hs.hidden_since IS NULL OR rm.created_at > hs.hidden_since)
    GROUP BY rm.sender_id
  )
  SELECT
    lm.other_user_id as user_id,
    COALESCE(au.email, '')::text as user_email, -- Handle potential nulls safely
    CASE
      WHEN adm.user_id IS NOT NULL THEN 'Administrador'
      ELSE COALESCE(
        emp.name,
        cli.name,
        (au.raw_user_meta_data->>'name')::text,
        au.email::text,
        'Usuario Desconocido'
      )
    END as user_name,
    lm.message as last_message,
    lm.created_at as last_message_time,
    COALESCE(uc.unread, 0) as unread_count,
    lm.last_file_url as last_file_url,
    (hs.hidden_user_id IS NOT NULL) as is_hidden
  FROM last_messages lm
  JOIN auth.users au ON au.id = lm.other_user_id
  LEFT JOIN unread_counts uc ON uc.other_user_id = lm.other_user_id
  LEFT JOIN hidden_status hs ON hs.hidden_user_id = lm.other_user_id
  LEFT JOIN public.employees emp ON emp.user_id = lm.other_user_id
  LEFT JOIN public.clients cli ON cli.user_id = lm.other_user_id
  LEFT JOIN public.administrators adm ON adm.user_id = lm.other_user_id
  ORDER BY lm.created_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.get_chat_conversations_v2(uuid) IS 'Versión corregida v3: parámetro p_user_id y manejo robusto de nulos.';
