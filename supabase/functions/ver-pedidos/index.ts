import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
const IA_SUPERAPI_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGMyMGIzMWNkZDc2Zjc0NjhiNThkN2UiLCJpYXQiOjE3NTgwNTA4MTcsImV4cCI6MzMxMzI1MDgxN30.Ub5Moztkfkp4dGpYpdaw78z04okQ5f5qm6oZBxDN9d8";
const RECIPIENT_PHONE_NUMBER = "584122884386@c.us";
const messages = {
  '1': "Estamos revisando tu pedido.",
  '2': "Tu pedido ha sido revisado y será cotizado en las próximas 48 horas.",
  '3': "Tu cotización está lista. Por favor, realiza el pago para continuar.",
  '4': "Estamos validando tu pago. Te notificaremos cuando esté procesado.",
  '5': "¡Pago validado! Tu pedido está listo para ser empaquetado.",
  '6': "Tu pedido está siendo empaquetado en una caja.",
  '7': "Tu pedido está siendo empaquetado en un contenedor.",
  '9': "Tu pedido ya va en camino a Venezuela.",
  '10': "Hemos recibido tu contenedor. En breve tus pedidos serán procesados en nuestras oficinas.",
  '11': "Tu paquete ha sido recibido en nuestras oficinas. Espera el mensaje de que ya está disponible para retirar.",
  '12': "¡Tu pedido está listo para ser retirado en la tienda!",
  '13': "Tu pedido ha sido entregado exitosamente. ¡Gracias por tu compra!"
};
serve(async (req)=>{
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405
    });
  }
  if (!IA_SUPERAPI_TOKEN || !RECIPIENT_PHONE_NUMBER) {
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
    // Obtenemos el mensaje personalizado según el nuevo estado.
    // Usamos el '1' como mensaje por defecto si el estado no está en el objeto.
    const message = messages[new_state] || messages['1'];
    // Preparamos la carga útil para la API de mensajes
    const payload = JSON.stringify({
      chatId: RECIPIENT_PHONE_NUMBER,
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
    return new Response(JSON.stringify({
      error: "Internal Server Error"
    }), {
      status: 500
    });
  }
});
