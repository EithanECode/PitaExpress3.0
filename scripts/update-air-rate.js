const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function updateAirRate() {
    console.log('🚀 Actualizando tarifa de envío aéreo a 100...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('❌ Error: Faltan variables de entorno en .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
        // Primero intentamos actualizar la fila existente (asumiendo id=1 o la única fila)
        const { data: existing, error: fetchError } = await supabase
            .from('business_config')
            .select('id')
            .limit(1)
            .single();

        let result;
        if (existing) {
            console.log(`📝 Actualizando registro existente (ID: ${existing.id})...`);
            result = await supabase
                .from('business_config')
                .update({
                    air_shipping_rate: 100,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
        } else {
            console.log('📝 No se encontró registro, creando uno nuevo...');
            // Si no hay registro, insertamos uno con valores por defecto y la tarifa solicitada
            result = await supabase
                .from('business_config')
                .insert([{
                    air_shipping_rate: 100,
                    usd_rate: 36.50, // valor por defecto
                    cny_rate: 7.25,   // valor por defecto
                    sea_shipping_rate: 180.00,
                    profit_margin: 25,
                    updated_at: new Date().toISOString()
                }]);
        }

        if (result.error) {
            throw result.error;
        }

        console.log('✅ Tarifa de envío aéreo actualizada exitosamente a 100.');
    } catch (err) {
        console.error('❌ Error al actualizar:', err.message);
        process.exit(1);
    }
}

updateAirRate();
