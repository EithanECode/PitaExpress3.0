-- Limpiar usuarios existentes (para desarrollo local)
TRUNCATE TABLE auth.users CASCADE;

-- Función auxiliar para crear usuarios (simulando auth.users de Supabase)
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  china_id uuid := gen_random_uuid();
  vzla_id uuid := gen_random_uuid();
  client_id uuid := gen_random_uuid();
BEGIN
  -- 1. Crear ADMIN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
  VALUES (
    admin_id, 
    '00000000-0000-0000-0000-000000000000', 
    'admin@pitaexpress.com', 
    crypt('password123', gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Super Admin","full_name":"Super Admin"}', 
    now(), now(), 'authenticated', 'authenticated', ''
  );

  INSERT INTO public.userlevel (id, user_level) VALUES (admin_id, 'Admin');

  -- 2. Crear Empleado CHINA
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
  VALUES (
    china_id, 
    '00000000-0000-0000-0000-000000000000', 
    'china@pitaexpress.com', 
    crypt('password123', gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Empleado China","full_name":"Empleado China"}', 
    now(), now(), 'authenticated', 'authenticated', ''
  );

  INSERT INTO public.userlevel (id, user_level) VALUES (china_id, 'China');

  -- 3. Crear Empleado VENEZUELA
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
  VALUES (
    vzla_id, 
    '00000000-0000-0000-0000-000000000000', 
    'vzla@pitaexpress.com', 
    crypt('password123', gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Empleado Vzla","full_name":"Empleado Vzla"}', 
    now(), now(), 'authenticated', 'authenticated', ''
  );

  INSERT INTO public.userlevel (id, user_level) VALUES (vzla_id, 'Vzla');

  -- 4. Crear CLIENTE
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
  VALUES (
    client_id, 
    '00000000-0000-0000-0000-000000000000', 
    'cliente@pitaexpress.com', 
    crypt('password123', gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Cliente Feliz","full_name":"Cliente Feliz"}', 
    now(), now(), 'authenticated', 'authenticated', ''
  );

  INSERT INTO public.userlevel (id, user_level) VALUES (client_id, 'Client');

  -- Insertar identidades (CORREGIDO: provider_id es requerido)
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), admin_id, format('{"sub":"%s","email":"admin@pitaexpress.com"}', admin_id)::jsonb, 'email', admin_id::text, now(), now(), now()),
    (gen_random_uuid(), china_id, format('{"sub":"%s","email":"china@pitaexpress.com"}', china_id)::jsonb, 'email', china_id::text, now(), now(), now()),
    (gen_random_uuid(), vzla_id, format('{"sub":"%s","email":"vzla@pitaexpress.com"}', vzla_id)::jsonb, 'email', vzla_id::text, now(), now(), now()),
    (gen_random_uuid(), client_id, format('{"sub":"%s","email":"cliente@pitaexpress.com"}', client_id)::jsonb, 'email', client_id::text, now(), now(), now());

END $$;
