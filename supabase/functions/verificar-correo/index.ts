// @deno-types="https://deno.land/x/types.deno/v1.37.1/mod.d.ts" // pista opcional si el editor no reconoce Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: baseHeaders
  });
}
function validateEmail(email) {
  // Regex simple y suficiente para validación básica
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
// Lazy init (evita recrear cliente por request)
let supabaseSingleton = null;
function getSupabase() {
  if (supabaseSingleton) return supabaseSingleton;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (Deno.env.get('DEBUG')) {
    console.log('[DEBUG] Supabase URL presente?', Boolean(supabaseUrl));
    console.log('[DEBUG] Service role key presente?', Boolean(serviceRoleKey));
  }
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuración incompleta (variables de entorno)');
  }
  supabaseSingleton = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  return supabaseSingleton;
}
serve(async (req)=>{
  try {
    // Preflight CORS
    if (req.method === 'OPTIONS') return json({}, 200);
    if (req.method !== 'GET') {
      return json({
        error: 'Método no permitido. Usa GET'
      }, 405);
    }
    const url = new URL(req.url);
    const rawEmail = url.searchParams.get('email');
    const password = url.searchParams.get('password');
    if (!rawEmail) return json({
      error: 'Falta el parámetro email'
    }, 400);
    if (!password) return json({
      error: 'Falta el parámetro password'
    }, 400);
    const email = rawEmail.trim().toLowerCase();
    if (!validateEmail(email)) return json({
      error: 'Email inválido'
    }, 400);
    // Para verificación de credenciales NO debemos usar la service role key; creamos un cliente público (anon key) seguro.
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!anonKey) return json({
      error: 'Configuración incompleta (falta SUPABASE_ANON_KEY)'
    }, 500);
    // Cliente público aislado para auth de usuario final
    const supabasePublic = createClient(Deno.env.get('SUPABASE_URL'), anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    const { data, error: signInError } = await supabasePublic.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      if (Deno.env.get('DEBUG')) console.log('[DEBUG] Fallo de signIn', signInError.message);
      // Distinguimos: ¿existe el email?
      try {
        const adminClient = getSupabase();
        // Buscar en una o dos páginas máximo para minimizar coste
        let found = false;
        for(let page = 1; page <= 2 && !found; page++){
          const { data: usersData, error: luError } = await adminClient.auth.admin.listUsers({
            page,
            perPage: 1000
          });
          if (luError) {
            console.error('[ERROR] listUsers durante verificación existencia:', luError);
            break; // No seguimos; evitamos filtrar información en caso de error
          }
          found = usersData.users.some((u)=>u.email?.toLowerCase() === email);
          if (usersData.users.length < 1000) break; // última página
        }
        if (found) {
          return json({
            exists: true,
            valid_password: false,
            user: null
          });
        }
      } catch (inner) {
        console.error('[ERROR] Verificando existencia tras fallo signIn:', inner);
      }
      return json({
        exists: false,
        valid_password: false,
        user: null
      });
    }
    if (data.user) {
      return json({
        exists: true,
        valid_password: true,
        user: {
          id: data.user.id
        }
      });
    }
    return json({
      exists: false,
      valid_password: false,
      user: null
    });
  } catch (err) {
    console.error('Fallo inesperado:', err);
    if (Deno.env.get('DEBUG')) {
      try {
        return json({
          error: 'Error interno del servidor',
          detail: String(err)
        }, 500);
      } catch (_) {
        return json({
          error: 'Error interno del servidor'
        }, 500);
      }
    }
    return json({
      error: 'Error interno del servidor'
    }, 500);
  }
});
