import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

function getSupabaseClient() {
  // Usamos Service Role en el servidor para evitar problemas de variables ausentes y políticas RLS
  return getSupabaseServiceRoleClient();
}

// Esta función obtiene los pedidos con el nombre del cliente
async function getOrdersWithClientName(asignedEVzla?: string) {
  const supabase = getSupabaseClient();

  // Traer pedidos
  let ordersQuery = supabase
    .from('orders')
    .select('id, quantity, productName, deliveryType, shippingType, state, client_id, asignedEVzla, description, pdfRoutes')
    .order('id', { ascending: false });

  if (asignedEVzla) {
    ordersQuery = ordersQuery.eq('asignedEVzla', asignedEVzla);
  }

  const { data: orders, error: ordersError } = await ordersQuery;
  if (ordersError) throw ordersError;

  // Traer clientes
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('user_id, name');
  if (clientsError) throw clientsError;

  // Join manual en JS
  return orders.map(order => {
    const client = clients.find(c => c.user_id === order.client_id);
    return {
      id: order.id,
      quantity: order.quantity,
      productName: order.productName,
      deliveryType: order.deliveryType,
      shippingType: order.shippingType,
      state: order.state,
      asignedEVzla: order.asignedEVzla,
      clientName: client ? client.name : null,
      client_id: order.client_id, // Aseguramos que se incluya el client_id
      description: order.description ?? '',
      pdfRoutes: order.pdfRoutes ?? '',
    };
  });
}

// API Route para Next.js App Router (app router)
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const asignedEVzla = request.nextUrl.searchParams.get('asignedEVzla') || undefined;
    const orders = await getOrdersWithClientName(asignedEVzla);
    return Response.json(orders);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
