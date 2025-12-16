import { NextRequest, NextResponse } from 'next/server';
import {
  saveExchangeRate,
  getLatestValidExchangeRate,
  getLatestExchangeRate,
  isValidExchangeRate,
  cleanupOldExchangeRates,
  type LatestRateResult,
  type ExchangeRateRecord
} from '@/lib/supabase/exchange-rates';
import { saveApiHealthLog } from '@/lib/supabase/api-health-logs';

// Función para obtener la tasa de cambio oficial del BCV
async function fetchExchangeRate(): Promise<number> {
  const startTime = Date.now();
  
  try {
    // PRIMERA OPCIÓN: ExchangeRate-API (funcionando actualmente)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MornaProject/1.0'
      },
      signal: AbortSignal.timeout(3000),
      cache: 'no-store'
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      await saveApiHealthLog(
        'exchangerate-api',
        'failed',
        responseTime,
        `API Error: ${response.status} ${response.statusText}`
      );
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || !data.rates || !data.rates.VES) {
      await saveApiHealthLog(
        'exchangerate-api',
        'failed',
        responseTime,
        'VES rate not found in response'
      );
      throw new Error('VES rate not found in response');
    }

    const rate = parseFloat(data.rates.VES);

    if (!isValidExchangeRate(rate)) {
      await saveApiHealthLog(
        'exchangerate-api',
        'failed',
        responseTime,
        `Invalid BCV exchange rate value: ${rate}`
      );
      throw new Error(`Invalid BCV exchange rate value: ${rate}`);
    }

    await saveApiHealthLog(
      'exchangerate-api',
      'success',
      responseTime,
      undefined,
      rate
    );

    return rate;

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.warn('Warning: Primary BCV API (ExchangeRate-API) failed (using fallback):', error.message);

    // FALLBACK 1: Fawazahmed0 Currency API (via jsDelivr) - funciona sin API key
    const fallback1StartTime = Date.now();
    try {
      const fallback1Response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MornaProject/1.0'
        },
        signal: AbortSignal.timeout(3000)
      });

      const fallback1ResponseTime = Date.now() - fallback1StartTime;

      if (fallback1Response.ok) {
        const fallback1Data = await fallback1Response.json();
        
        // La estructura es: { usd: { ves: 269.06 } }
        if (fallback1Data?.usd?.ves) {
          const fallback1Rate = parseFloat(fallback1Data.usd.ves.toString());
          
          if (isValidExchangeRate(fallback1Rate)) {
            await saveApiHealthLog(
              'fawazahmed0_currency_api',
              'success',
              fallback1ResponseTime,
              undefined,
              fallback1Rate
            );
            return fallback1Rate;
          }
        }
      }
      
      await saveApiHealthLog(
        'fawazahmed0_currency_api',
        'failed',
        fallback1ResponseTime,
        fallback1Response.ok ? 'VES rate not found in response' : `API Error: ${fallback1Response.status}`
      );
    } catch (fallback1Error: any) {
      const fallback1ResponseTime = Date.now() - fallback1StartTime;
      await saveApiHealthLog(
        'fawazahmed0_currency_api',
        'failed',
        fallback1ResponseTime,
        fallback1Error.message || 'Unknown error'
      );
      console.error('Fallback 1 (Fawazahmed0) API also failed:', fallback1Error);
    }

    // FALLBACK 2: Intentar con DollarVzla API para obtener BCV oficial
    const fallback2StartTime = Date.now();
    try {
      const fallback2Response = await fetch('https://api.dollarvzla.com/v1/exchange-rates', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MornaProject/1.0'
        },
        signal: AbortSignal.timeout(3000)
      });

      const fallback2ResponseTime = Date.now() - fallback2StartTime;

      if (fallback2Response.ok) {
        const fallback2Data = await fallback2Response.json();
        
        if (fallback2Data && fallback2Data.exchangeRates && Array.isArray(fallback2Data.exchangeRates)) {
          const bcvRate = fallback2Data.exchangeRates.find((rate: any) =>
            rate.sourceCode && rate.sourceCode.toLowerCase() === 'bcv'
          );

          if (bcvRate && bcvRate.value) {
            const fallback2Rate = parseFloat(bcvRate.value);
            if (isValidExchangeRate(fallback2Rate)) {
              await saveApiHealthLog(
                'dollarvzla.com',
                'success',
                fallback2ResponseTime,
                undefined,
                fallback2Rate
              );
              return fallback2Rate;
            }
          }
        }
      }
      
      await saveApiHealthLog(
        'dollarvzla.com',
        'failed',
        fallback2ResponseTime,
        fallback2Response.ok ? 'BCV rate not found in response' : `API Error: ${fallback2Response.status}`
      );
    } catch (fallback2Error: any) {
      const fallback2ResponseTime = Date.now() - fallback2StartTime;
      await saveApiHealthLog(
        'dollarvzla.com',
        'failed',
        fallback2ResponseTime,
        fallback2Error.message || 'Unknown error'
      );
      console.error('Fallback 2 (DollarVzla) API also failed:', fallback2Error);
    }

    throw error;
  }
}

// GET: Obtener tasa de cambio actual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('force') === 'true';
    
    // 1. Intentar obtener de APIs externas primero
    let apiRate: number | null = null;
    let apiSource = 'BCV Oficial';
    let apiError: any = null;

    // Si forceRefresh está activado, siempre intentar obtener de API
    // Si no, intentar obtener de BD primero (para evitar llamadas innecesarias)
    if (forceRefresh) {
      try {
        console.log('[GET /api/exchange-rate] Force refresh activado, llamando a fetchExchangeRate()...');
        apiRate = await fetchExchangeRate();
      } catch (error) {
        apiError = error;
        console.error('[ExchangeRate] All APIs failed:', error);
      }
    } else {
      // Intentar obtener de API solo si no hay tasa reciente en BD
      const lastValidRate = await getLatestValidExchangeRate();
      const shouldFetchFromAPI = !lastValidRate || lastValidRate.age_minutes > 30;
      
      if (shouldFetchFromAPI) {
        try {
          console.log('[GET /api/exchange-rate] No hay tasa reciente, llamando a fetchExchangeRate()...');
          apiRate = await fetchExchangeRate();
        } catch (error) {
          apiError = error;
          console.error('[ExchangeRate] All APIs failed:', error);
        }
      } else {
        console.log('[GET /api/exchange-rate] Usando tasa de BD (edad:', lastValidRate.age_minutes, 'minutos)');
      }
    }

    // Si forceRefresh y no obtuvimos tasa, intentar de nuevo sin forceRefresh
    if (forceRefresh && !apiRate) {
      try {
        apiRate = await fetchExchangeRate();
      } catch (error) {
        apiError = error;
        console.error('[ExchangeRate] All APIs failed:', error);
      }
    }

    // 2. Si obtuvimos tasa de API, guardarla y retornarla
    if (apiRate && isValidExchangeRate(apiRate)) {
      // Guardar tasa exitosa en BD
      await saveExchangeRate(apiRate, apiSource, false, {
        success: true,
        apis_used: ['exchangerate-api', 'fawazahmed0_currency_api', 'dollarvzla']
      });

      // Limpiar registros antiguos ocasionalmente (1 de cada 50 requests)
      if (Math.random() < 0.02) {
        cleanupOldExchangeRates().catch(console.error);
      }

      return NextResponse.json({
        success: true,
        rate: apiRate,
        timestamp: new Date().toISOString(),
        source: apiSource,
        from_database: false
      });
    }

    // 3. APIs fallaron, intentar usar última tasa válida de BD
    let lastValidRate: LatestRateResult | null = null;
    try {
      lastValidRate = await getLatestValidExchangeRate();
    } catch (dbError: any) {
      console.error('[ExchangeRate] Error getting rate from database:', dbError);
      // Continuar con el siguiente fallback
    }

    if (lastValidRate) {
      // Guardar registro de que usamos fallback (solo si no es muy antiguo)
      if (lastValidRate.age_minutes < 1440) { // Solo si tiene menos de 24 horas
        try {
      await saveExchangeRate(lastValidRate.rate, lastValidRate.source, true, {
        fallback_reason: 'APIs failed',
        original_error: apiError?.message,
        age_minutes: lastValidRate.age_minutes
      });
        } catch (saveError) {
          console.warn('[ExchangeRate] Could not save fallback record:', saveError);
          // Continuar aunque falle el guardado
        }
      }

      return NextResponse.json({
        success: true,
        rate: lastValidRate.rate,
        timestamp: lastValidRate.timestamp,
        source: lastValidRate.source,
        from_database: true,
        age_minutes: lastValidRate.age_minutes,
        warning: `Usando última tasa conocida de ${lastValidRate.source} (${lastValidRate.age_minutes} minutos de antigüedad) debido a errores en las APIs`
      });
    }

    // 4. No hay tasa válida en BD, usar cualquier tasa (incluso fallback anterior)
    let anyLastRate: ExchangeRateRecord | null = null;
    try {
      anyLastRate = await getLatestExchangeRate();
    } catch (dbError: any) {
      console.error('[ExchangeRate] Error getting any rate from database:', dbError);
      // Continuar con el siguiente fallback
    }

    if (anyLastRate && isValidExchangeRate(anyLastRate.rate)) {
      return NextResponse.json({
        success: true,
        rate: anyLastRate.rate,
        timestamp: anyLastRate.timestamp || anyLastRate.created_at || new Date().toISOString(),
        source: anyLastRate.source || 'Base de Datos',
        from_database: true,
        warning: 'Usando tasa de respaldo de la base de datos debido a errores en todas las APIs'
      });
    }

    // 5. Último recurso: tasa por defecto y guardarla
    console.warn('[ExchangeRate] No rates available anywhere, using hardcoded default');
    const defaultRate = 166.58;

    // Intentar guardar la tasa por defecto, pero no fallar si no se puede
    try {
    await saveExchangeRate(defaultRate, 'Hardcoded Default', true, {
      fallback_reason: 'No rates available in APIs or database',
      api_error: apiError?.message
    });
    } catch (saveError) {
      console.warn('[ExchangeRate] Could not save default rate:', saveError);
      // Continuar aunque falle el guardado
    }

    return NextResponse.json({
      success: true,
      rate: defaultRate,
      timestamp: new Date().toISOString(),
      source: 'Tasa por Defecto',
      from_database: false,
      warning: 'Usando tasa por defecto debido a errores en todas las APIs y ausencia de datos históricos'
    });

  } catch (error: any) {
    console.error('Critical error in exchange rate endpoint:', error);

    return NextResponse.json({
      success: false,
      error: 'Error crítico al obtener tasa de cambio',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST: Actualizar tasa de cambio (para uso interno)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { manualRate, forceRefresh } = body;

    // Si hay tasa manual, guardarla y usarla
    if (manualRate && isValidExchangeRate(parseFloat(manualRate))) {
      const rate = parseFloat(manualRate);

      // Guardar tasa manual en BD
      await saveExchangeRate(rate, 'Manual', false, {
        manual_update: true,
        updated_by: 'admin_user'
      });

      return NextResponse.json({
        success: true,
        rate: rate,
        timestamp: new Date().toISOString(),
        source: 'Manual',
        from_database: true
      });
    }

    // Si no hay tasa manual, obtener de API y guardar
    try {
      console.log('[POST /api/exchange-rate] Llamando a fetchExchangeRate()...');
      const apiRate = await fetchExchangeRate();
      console.log('[POST /api/exchange-rate] Tasa obtenida:', apiRate);

      // Guardar tasa de API en BD
      await saveExchangeRate(apiRate, 'BCV Oficial (Manual Refresh)', false, {
        manual_refresh: true,
        force_refresh: forceRefresh || false
      });

      return NextResponse.json({
        success: true,
        rate: apiRate,
        timestamp: new Date().toISOString(),
        source: 'BCV Oficial (Manual Refresh)',
        from_database: false
      });
    } catch (apiError: any) {
      // Si falla API, usar última tasa válida de BD
      let lastValidRate: LatestRateResult | null = null;
      try {
        lastValidRate = await getLatestValidExchangeRate();
      } catch (dbError: any) {
        console.error('[ExchangeRate] Error getting rate from database:', dbError);
      }

      if (lastValidRate) {
        return NextResponse.json({
          success: true,
          rate: lastValidRate.rate,
          timestamp: lastValidRate.timestamp,
          source: lastValidRate.source,
          from_database: true,
          age_minutes: lastValidRate.age_minutes,
          warning: `API falló durante actualización manual. Usando última tasa válida de ${lastValidRate.source}`
        });
      }

      // Si no hay nada en BD, retornar error
      throw new Error(`Failed to fetch from API and no valid rates in database: ${apiError.message}`);
    }

  } catch (error: any) {
    console.error('Error in POST exchange rate:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update exchange rate',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
