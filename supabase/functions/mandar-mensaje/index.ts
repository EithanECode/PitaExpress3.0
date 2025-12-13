import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
// Variables de entorno
const IA_SUPERAPI_TOKEN = Deno.env.get("IA_SUPERAPI_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Definimos los mensajes para cada estado del pedido
const messages = {
  '1': (productName)=>`Tu pedido: ${productName}. Estamos revisándolo.`,
  '2': (productName)=>`Tu pedido: ${productName}. Ha sido revisado y será cotizado en las próximas 48 horas.`,
  '3': (productName)=>`Tu pedido: ${productName}. Tu cotización está lista. Por favor, realiza el pago para continuar.`,
  '4': (productName)=>`Tu pedido: ${productName}. Estamos validando tu pago. Te notificaremos cuando esté procesado.`,
  '5': (productName)=>`Tu pedido: ${productName}. ¡Pago validado! Está listo para ser empaquetado.`,
  '6': (productName)=>`Tu pedido: ${productName}. Está siendo empaquetado en una caja.`,
  '7': (productName)=>`Tu pedido: ${productName}. Está siendo empaquetado en un contenedor.`,
  '9': (productName)=>`Tu pedido: ${productName}. Ya va en camino a Venezuela.`,
  '10': (productName)=>`Tu pedido: ${productName}. El contenedor ha sido recibido. En breve será procesado en nuestras oficinas.`,
  '11': (productName)=>`Tu pedido: ${productName}. Ha sido recibido en nuestras oficinas. Espera un mensaje cuando esté listo para retirar.`,
  '12': (productName)=>`Tu pedido: ${productName}. ¡Está listo para ser retirado en la tienda!`,
  '13': (productName)=>`Tu pedido: ${productName}. Ha sido entregado exitosamente. ¡Gracias por tu compra!`
};
// Inicializamos el cliente de Supabase con el service role key
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});
// Función para obtener el número de teléfono del usuario usando la vista
async function getUserPhoneNumber(userId) {
  const { data, error } = await supabaseClient.from('user_phones') // Consulta la vista
  .select('phone').eq('id', userId).single();
  if (error) {
    console.error("Error al obtener el usuario:", error.message);
    return null;
  }
  if (data && data.phone) {
    return data.phone;
  }
  return null;
}
// Servidor principal de la función
serve(async (req)=>{
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405
    });
  }
  if (!IA_SUPERAPI_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Internal Server Error: Missing credentials", {
      status: 500
    });
  }
  try {
    const body = await req.json();
    const newRecord = body.record;
    const oldRecord = body.old_record;
    const new_state = newRecord.state;
    const old_state = oldRecord.state;
    // Si el estado no ha cambiado, terminamos la ejecución
    if (new_state === old_state) {
      return new Response(JSON.stringify({
        message: "State did not change."
      }), {
        status: 200
      });
    }
    // Obtenemos el nombre del producto y el ID del cliente del nuevo registro
    const productName = newRecord.productName;
    const userId = newRecord.client_id;
    if (!userId) {
      return new Response(JSON.stringify({
        error: "Missing client_id in record"
      }), {
        status: 400
      });
    }
    // Obtenemos el número de teléfono del usuario
    const userPhoneNumber = await getUserPhoneNumber(userId);
    if (!userPhoneNumber) {
      return new Response(JSON.stringify({
        error: "User phone number not found."
      }), {
        status: 404
      });
    }
    // Formateamos el número de teléfono para la API
    const recipientPhoneNumber = `${userPhoneNumber}@c.us`;
    // Obtenemos la función de mensaje y la ejecutamos
    const messageFunction = messages[new_state] || messages['1'];
    const message = messageFunction(productName);
    // Preparamos la carga útil para la API de mensajes
    const payload = JSON.stringify({
      chatId: recipientPhoneNumber,
      message: message
    });
    // Hacemos la llamada a la API
    const apiResponse = await fetch("https://v4.iasuperapi.com/api/v1/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${IA_SUPERAPI_TOKEN}`
      },
      body: payload
    });
    const result = await apiResponse.json();
    if (result.statusCode !== 200) {
      return new Response(JSON.stringify({
        error: "Failed to send message",
        details: result
      }), {
        status: 500
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Message sent"
    }), {
      status: 200
    });
  } catch (error) {
    console.error("Internal Server Error:", error.message);
    return new Response(JSON.stringify({
      error: "Internal Server Error"
    }), {
      status: 500
    });
  }
});
