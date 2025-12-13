import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
serve(async (req)=>{
  // Habilitar CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      status: 200
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Método no permitido. Usa POST'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 405
    });
  }
  try {
    // Obtener variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({
        error: 'Configuración incompleta del servidor'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500
      });
    }
    // Parsear el cuerpo de la solicitud
    const body = await req.json();
    // Validar campos requeridos
    const requiredFields = [
      'email',
      'password',
      'full_name'
    ];
    const missingFields = requiredFields.filter((field)=>!body[field]);
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        error: 'Campos requeridos faltantes',
        missing: missingFields
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 400
      });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name
      },
      app_metadata: {
        provider: 'email',
        providers: [
          'email'
        ]
      }
    });
    if (authError) {
      console.error('Error creando usuario en Auth:', authError);
      return new Response(JSON.stringify({
        error: 'Error al crear usuario en Auth',
        details: authError.message
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 400
      });
    }
    const userId = authData.user.id;
    const userEmail = authData.user.email;
    const userName = body.full_name;
    // 2. Insertar en tabla clients
    const { error: clientsError } = await supabase.from('clients').insert({
      user_id: userId,
      name: userName,
      correo: userEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    if (clientsError) {
      console.error('Error insertando en clients:', clientsError);
    // No fallar completamente, continuar con userlevel
    }
    // 3. Upsert en tabla userlevel
    const { error: userlevelError } = await supabase.from('userlevel').upsert({
      id: userId,
      user_level: 'Client',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id',
      ignoreDuplicates: false
    });
    if (userlevelError) {
      console.error('Error upsert en userlevel:', userlevelError);
    // No fallar completamente, el usuario ya está creado en Auth
    }
    // 4. Devolver respuesta exitosa
    return new Response(JSON.stringify({
      success: true,
      message: 'Usuario registrado exitosamente en todos los sistemas',
      user: {
        id: userId,
        email: userEmail,
        full_name: userName,
        auth_created_at: authData.user.created_at,
        clients_inserted: !clientsError,
        userlevel_upserted: !userlevelError
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 201
    });
  } catch (err) {
    console.error('Error inesperado:', err);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor',
      details: err.message
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 500
    });
  }
});
