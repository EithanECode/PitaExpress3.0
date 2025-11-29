-- ============================================
-- CORRECCIÓN DE NOMBRES EN CHAT
-- ============================================
-- Este script actualiza la función get_chat_conversations_v2 para buscar
-- los nombres reales en las tablas employees, clients y administrators.

DROP FUNCTION IF EXISTS get_chat_conversations_v2(uuid);

CREATE OR REPLACE FUNCTION get_chat_conversations_v2(current_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT,
  last_file_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- 1. Obtener lista de usuarios con los que hay chat
  chat_partners AS (
    SELECT DISTINCT
      CASE
        WHEN cm.sender_id = current_user_id THEN cm.receiver_id
        ELSE cm.sender_id
      END as partner_id
    FROM chat_messages cm
    WHERE cm.sender_id = current_user_id OR cm.receiver_id = current_user_id
  ),
  -- 2. Obtener fecha de ocultamiento (si existe)
  hidden_dates AS (
    SELECT hidden_user_id, created_at as hidden_since
    FROM chat_hidden_conversations
    WHERE chat_hidden_conversations.user_id = current_user_id
  ),
  -- 3. Obtener último mensaje visible para cada partner
  last_messages AS (
    SELECT DISTINCT ON (
      CASE
        WHEN cm.sender_id = current_user_id THEN cm.receiver_id
        ELSE cm.sender_id
      END
    )
      CASE
        WHEN cm.sender_id = current_user_id THEN cm.receiver_id
        ELSE cm.sender_id
      END as partner_id,
      cm.message,
      cm.created_at,
      cm.file_url
    FROM chat_messages cm
    LEFT JOIN hidden_dates hd ON hd.hidden_user_id = (
      CASE
        WHEN cm.sender_id = current_user_id THEN cm.receiver_id
        ELSE cm.sender_id
      END
    )
    WHERE 
      (cm.sender_id = current_user_id OR cm.receiver_id = current_user_id)
      -- Filtrar mensajes eliminados por el usuario actual
      AND (
        (cm.sender_id = current_user_id AND cm.deleted_by_sender = FALSE) OR
        (cm.receiver_id = current_user_id AND cm.deleted_by_receiver = FALSE)
      )
      -- Filtrar mensajes anteriores a la fecha de ocultamiento
      AND (hd.hidden_since IS NULL OR cm.created_at > hd.hidden_since)
    ORDER BY
      CASE
        WHEN cm.sender_id = current_user_id THEN cm.receiver_id
        ELSE cm.sender_id
      END,
      cm.created_at DESC
  ),
  -- 4. Contar no leídos (solo visibles)
  unread_counts AS (
    SELECT
      cm.sender_id as partner_id,
      COUNT(*) as unread
    FROM chat_messages cm
    LEFT JOIN hidden_dates hd ON hd.hidden_user_id = cm.sender_id
    WHERE cm.receiver_id = current_user_id
      AND cm.read = FALSE
      AND cm.deleted_by_receiver = FALSE
      AND (hd.hidden_since IS NULL OR cm.created_at > hd.hidden_since)
    GROUP BY cm.sender_id
  )
  SELECT
    cp.partner_id as user_id,
    au.email as user_email,
    COALESCE(
      emp.name,
      cli.name,
      adm.name,
      au.raw_user_meta_data->>'name',
      au.email
    ) as user_name,
    lm.message as last_message,
    lm.created_at as last_message_time,
    COALESCE(uc.unread, 0) as unread_count,
    lm.file_url as last_file_url
  FROM chat_partners cp
  JOIN last_messages lm ON lm.partner_id = cp.partner_id -- Solo mostrar si hay mensajes visibles
  LEFT JOIN auth.users au ON au.id = cp.partner_id
  LEFT JOIN unread_counts uc ON uc.partner_id = cp.partner_id
  -- JOINS para obtener nombres reales
  LEFT JOIN employees emp ON emp.user_id = cp.partner_id
  LEFT JOIN clients cli ON cli.user_id = cp.partner_id
  LEFT JOIN administrators adm ON adm.user_id = cp.partner_id
  ORDER BY lm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
