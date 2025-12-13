// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// Nota: Generaremos PDF usando pdf-lib (compatible con Deno) de forma dinámica tras crear el pedido
serve(async (req)=>{
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
      status: 200
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({
        error: 'Configuración incompleta en el servidor'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      });
    }
    const body = await req.json();
    const requiredFields = [
      'email',
      'password',
      'shippingType',
      'deliveryType',
      'productName',
      'estimatedBudget',
      'quantity'
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
        status: 200
      });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    // ✅ Llamar a la función verificar-correo para obtener user.id validando credenciales
    const verificarCorreoUrl = 'https://bgzsodcydkjqehjafbkv.supabase.co/functions/v1/verificar-correo';
    let userId = null;
    try {
      const vcRes = await fetch(`${verificarCorreoUrl}?email=${encodeURIComponent(body.email)}&password=${encodeURIComponent(body.password)}`, {
        method: 'GET'
      });
      const vcJson = await vcRes.json().catch(()=>({}));
      if (!vcRes.ok) {
        return new Response(JSON.stringify({
          error: 'Error verificando credenciales',
          details: vcJson?.error || 'Respuesta no OK'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 200
        });
      }
      if (!vcJson.exists) {
        return new Response(JSON.stringify({
          error: 'Usuario no encontrado'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 200
        });
      }
      if (!vcJson.valid_password) {
        return new Response(JSON.stringify({
          error: 'Credenciales inválidas'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 200
        });
      }
      userId = vcJson?.user?.id || null;
      if (!userId) {
        return new Response(JSON.stringify({
          error: 'No se pudo obtener el ID del usuario'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 200
        });
      }
    } catch (verErr) {
      console.error('Error llamando verificar-correo:', verErr);
      return new Response(JSON.stringify({
        error: 'Fallo al verificar usuario'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      });
    }
    // ✅ Función para convertir string de links a array
    const processLinks = (linksString)=>{
      if (!linksString) return null;
      if (Array.isArray(linksString)) return linksString; // Si ya es array, devolver tal cual
      // Dividir por comas y limpiar espacios
      return linksString.split(',').map((link)=>link.trim()).filter((link)=>link !== '' && link !== null);
    };
    // Ya tenemos userId validado por credenciales
    // ✅ Insertar el nuevo pedido con links convertido a array
    const { data, error } = await supabase.from('orders').insert([
      {
        client_id: userId,
        shippingType: body.shippingType,
        deliveryType: body.deliveryType,
        productName: body.productName,
        estimatedBudget: body.estimatedBudget,
        quantity: body.quantity,
        description: body.description || null,
        links: processLinks(body.links),
        created_at: new Date().toISOString()
      }
    ]).select().single();
    if (error) {
      console.error('Error insertando pedido:', error);
      return new Response(JSON.stringify({
        error: 'Error al crear el pedido',
        details: error.message
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      });
    }
    // === Generar y subir PDF (estilo exacto jsPDF/autotable) ===
    let pdfUrl = null;
    try {
      const { jsPDF } = await import('https://esm.sh/jspdf@2.5.1');
      const autoTable = (await import('https://esm.sh/jspdf-autotable@3.8.2')).default;
      const sanitize = (v)=>(v || '').normalize('NFD').replace(/[^a-zA-Z0-9-_\.\s]/g, '').trim().replace(/\s+/g, '_').substring(0, 60) || 'pedido';
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const fechaLegible = `${dd}-${mm}-${yyyy}`;
      let folder = String(body.shippingType || '').toLowerCase();
      if (folder === 'doortodoor' || folder === 'door_to_door' || folder === 'door-to-door') folder = 'door-to-door';
      if (![
        'air',
        'maritime',
        'door-to-door'
      ].includes(folder)) folder = 'air';
      const productSafe = sanitize(body.productName || 'producto');
      const fileName = `${productSafe}_${fechaLegible}_${data.id}_${userId}_${folder}.pdf`;
      const pdfPath = `${folder}/${fileName}`;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const colors = {
        primary: [
          22,
          120,
          187
        ],
        secondary: [
          44,
          62,
          80
        ],
        light: [
          245,
          248,
          255
        ],
        border: [
          180,
          200,
          220
        ],
        text: [
          33,
          37,
          41
        ]
      };
      // Header corporativo
      doc.setFillColor(...colors.primary);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setFontSize(12);
      doc.setTextColor(...colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 8, 20, 20, 2, 2, 'F');
      doc.text('PITA', margin + 10, 20, {
        align: 'center'
      });
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text('RESUMEN DE PEDIDO', pageWidth / 2, 22, {
        align: 'center'
      });
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`Pedido: #${data.id}`, pageWidth - margin, 15, {
        align: 'right'
      });
      doc.text(`Fecha: ${fechaLegible}`, pageWidth - margin, 21, {
        align: 'right'
      });
      // Tabla principal (igual estructura a versión link)
      const pedidoTable = [
        [
          'ID Pedido',
          `${data.id}`
        ],
        [
          'Cliente ID',
          `${userId}`
        ],
        [
          'Email Cliente',
          `${body.email}`
        ],
        [
          'Fecha Creación',
          new Date(data.created_at || now).toLocaleString('es-ES')
        ],
        [
          'Tipo de Shipping',
          `${body.shippingType}`
        ],
        [
          'Tipo de Entrega',
          `${body.deliveryType}`
        ],
        [
          'Producto',
          `${body.productName}`
        ],
        [
          'Cantidad',
          `${body.quantity}`
        ],
        [
          'Presupuesto Estimado',
          `$${body.estimatedBudget}`
        ],
        [
          'Descripción',
          body.description || '-'
        ]
      ];
      const linksArray = Array.isArray(data.links) ? data.links : Array.isArray(body.links) ? body.links : null;
      if (linksArray && linksArray.length > 0) {
        linksArray.forEach((lnk, idx)=>{
          pedidoTable.push([
            `Link ${idx + 1}`,
            lnk
          ]);
        });
      }
      autoTable(doc, {
        startY: 45,
        body: pedidoTable,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: colors.border,
          lineWidth: 0.1,
          textColor: colors.text,
          font: 'helvetica'
        },
        columnStyles: {
          0: {
            cellWidth: 55,
            fontStyle: 'bold',
            textColor: colors.secondary
          },
          1: {
            cellWidth: 'auto'
          }
        },
        didDrawPage: ()=>{}
      });
      // Footer profesional
      const footerY = pageHeight - 25;
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      doc.setFontSize(9);
      doc.setTextColor(...colors.secondary);
      doc.text('PITA | Sistema de Logística y Pedidos', pageWidth / 2, footerY, {
        align: 'center'
      });
      doc.setFontSize(8);
      doc.setTextColor(...colors.primary);
      doc.text('info@pita.com   |   +58 424-1234567   |   www.pita.com', pageWidth / 2, footerY + 7, {
        align: 'center'
      });
      doc.setFontSize(7);
      doc.setTextColor(...colors.secondary);
      doc.text(`Generado: ${now.toLocaleString('es-ES')}`, margin, footerY + 13);
      doc.text('Página 1 de 1', pageWidth - margin, footerY + 13, {
        align: 'right'
      });
      const pdfBlob = doc.output('blob');
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const { error: uploadErr } = await supabase.storage.from('orders').upload(pdfPath, arrayBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });
      if (uploadErr) {
        console.error('Error subiendo PDF:', uploadErr);
      } else {
        const { data: pub } = supabase.storage.from('orders').getPublicUrl(pdfPath);
        pdfUrl = pub?.publicUrl || null;
        if (pdfUrl) {
          const { error: updErr } = await supabase.from('orders').update({
            pdfRoutes: pdfUrl
          }).eq('id', data.id);
          if (updErr) console.error('Error actualizando pdfRoutes:', updErr);
        }
      }
    } catch (pdfE) {
      console.error('Error generando PDF:', pdfE);
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'Pedido creado exitosamente',
      order: {
        ...data,
        client_id: userId,
        pdfRoutes: pdfUrl
      },
      pdfUrl
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 200
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
      status: 200
    });
  }
});
