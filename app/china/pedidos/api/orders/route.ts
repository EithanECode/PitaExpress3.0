import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Esta función obtiene los pedidos con el nombre del cliente
async function getOrdersWithClientName() {
  const supabase = getSupabaseClient();

  // Traer pedidos
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, quantity, productName, deliveryType, shippingType, state, client_id, asignedEChina, created_at, description, pdfRoutes, totalQuote')
    // Incluir también estado 1 (creado) para que la vista de China y el dashboard coincidan
    .gte('state', 1);
  if (ordersError) throw ordersError;

  // Traer clientes
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('user_id, name');
  if (clientsError) throw clientsError;

  // Traer TODAS las alternativas (no solo pendientes) para mostrar historial
  const { data: alternatives, error: alternativesError } = await supabase
    .from('product_alternatives')
    .select('order_id, status, client_response_notes')
    .order('created_at', { ascending: false }); // Ordenar por fecha para tomar la más reciente si hay varias

  if (alternativesError) console.error('Error fetching alternatives:', alternativesError);

  // Join manual en JS
  return orders.map(order => {
    const client = clients.find(c => c.user_id === order.client_id);

    // Buscar alternativas para este pedido
    const orderAlternatives = alternatives?.filter(a => a.order_id === order.id) || [];

    // Determinar el estado de la alternativa a mostrar
    // Prioridad: 1. Pending (hay una activa) -> 2. Accepted (se aceptó una) -> 3. Rejected (se rechazó la última)
    let alternativeStatus: 'pending' | 'accepted' | 'rejected' | null = null;
    let rejectionReason: string | null = null;

    const pendingAlt = orderAlternatives.find(a => a.status === 'pending');
    const acceptedAlt = orderAlternatives.find(a => a.status === 'accepted');
    const rejectedAlt = orderAlternatives.find(a => a.status === 'rejected');

    if (pendingAlt) {
      alternativeStatus = 'pending';
    } else if (acceptedAlt) {
      alternativeStatus = 'accepted';
    } else if (rejectedAlt) {
      alternativeStatus = 'rejected';
      rejectionReason = rejectedAlt.client_response_notes;
    }

    return {
      id: order.id,
      quantity: order.quantity,
      productName: order.productName,
      deliveryType: order.deliveryType,
      shippingType: order.shippingType,
      state: order.state,
      asignedEChina: order.asignedEChina,
      clientName: client ? client.name : null,
      created_at: order.created_at,
      specifications: order.description,
      pdfRoutes: order.pdfRoutes ?? '',
      totalQuote: order.totalQuote ?? null,
      hasAlternative: alternativeStatus === 'pending', // Mantener compatibilidad
      alternativeStatus: alternativeStatus, // Nuevo campo con el estado específico
      alternativeRejectionReason: rejectionReason, // Razón del rechazo si aplica
    };
  });
}

// API Route para Next.js App Router (app router)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const empleadoId = url.searchParams.get('asignedEChina');

    let orders = await getOrdersWithClientName();
    if (empleadoId) {
      orders = orders.filter(order => order.asignedEChina === empleadoId);
    } else {
      // Si no se pasa el parámetro, solo mostrar los que tienen asignedEChina no null
      orders = orders.filter(order => order.asignedEChina);
    }
    return Response.json(orders);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
