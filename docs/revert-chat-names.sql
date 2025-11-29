-- ============================================
-- REVERTIR CAMBIOS DE NOMBRES EN CHAT
-- ============================================
-- Este script restaura la función get_chat_conversations_v2 a su versión original.
-- Ejecutar esto si el script de nombres reales causó problemas.

DROP FUNCTION IF EXISTS get_chat_conversations_v2(uuid);

CREATE OR REPLACE FUNCTION get_chat_conversations_v2(current_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT,
  last_file_url TEXT,
  is_hidden BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH relevant_messages AS (
    -- Obtener mensajes donde el usuario es sender o receiver
    -- Y filtrar los que han sido eliminados por el usuario
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
    FROM chat_messages cm
    WHERE (cm.sender_id = current_user_id AND cm.deleted_by_sender = FALSE)
       OR (cm.receiver_id = current_user_id AND cm.deleted_by_receiver = FALSE)
  ),
  conversations AS (
    -- Identificar con quién es la conversación
    SELECT DISTINCT
      CASE
        WHEN rm.sender_id = current_user_id THEN rm.receiver_id
        ELSE rm.sender_id
      END as other_user_id
    FROM relevant_messages rm
  ),
  hidden_status AS (
    -- Verificar si la conversación está oculta y desde cuándo
    SELECT 
      hidden_user_id, 
      created_at as hidden_since
    FROM chat_hidden_conversations
    WHERE chat_hidden_conversations.user_id = current_user_id
  ),
  last_messages AS (
    -- Obtener el último mensaje válido para cada conversación
    SELECT DISTINCT ON (c.other_user_id)
      c.other_user_id,
      rm.message,
      rm.created_at,
      rm.file_url
    FROM conversations c
    JOIN relevant_messages rm ON 
      (rm.sender_id = c.other_user_id OR rm.receiver_id = c.other_user_id)
    LEFT JOIN hidden_status hs ON hs.hidden_user_id = c.other_user_id
    WHERE 
      -- Solo mostrar mensajes posteriores a la fecha de ocultamiento (si existe)
      (hs.hidden_since IS NULL OR rm.created_at > hs.hidden_since)
    ORDER BY c.other_user_id, rm.created_at DESC
  ),
  unread_counts AS (
    -- Contar no leídos (solo mensajes visibles)
    SELECT
      rm.sender_id as other_user_id,
      COUNT(*) as unread
    FROM relevant_messages rm
    LEFT JOIN hidden_status hs ON hs.hidden_user_id = rm.sender_id
    WHERE rm.receiver_id = current_user_id
      AND rm.read = FALSE
      AND (hs.hidden_since IS NULL OR rm.created_at > hs.hidden_since)
    GROUP BY rm.sender_id
  )
  SELECT
    lm.other_user_id as user_id,
    au.email as user_email,
    COALESCE(au.raw_user_meta_data->>'name', au.email) as user_name,
    lm.message as last_message,
    lm.created_at as last_message_time,
    COALESCE(uc.unread, 0) as unread_count,
    lm.file_url as last_file_url,
    (hs.hidden_user_id IS NOT NULL) as is_hidden
  FROM last_messages lm
  JOIN auth.users au ON au.id = lm.other_user_id
  LEFT JOIN unread_counts uc ON uc.other_user_id = lm.other_user_id
  LEFT JOIN hidden_status hs ON hs.hidden_user_id = lm.other_user_id
  ORDER BY lm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
