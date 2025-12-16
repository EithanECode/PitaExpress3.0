import { NextRequest, NextResponse } from 'next/server';
import { getAllApiHealthStats, saveApiHealthLog } from '@/lib/supabase/api-health-logs';
import { getLatestValidExchangeRate, getLatestExchangeRate } from '@/lib/supabase/exchange-rates';

export const revalidate = 0; // Deshabilitar cache para este endpoint

// Función para probar todas las APIs de BCV individualmente y generar logs
async function testAllBcvApis(): Promise<void> {
  // 1. Probar ExchangeRate-API
  const api1StartTime = Date.now();
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MornaProject/1.0'
      },
      signal: AbortSignal.timeout(3000),
      cache: 'no-store'
    });
    const responseTime = Date.now() - api1StartTime;
    
    if (response.ok) {
      const data = await response.json();
      if (data?.rates?.VES) {
        const rate = parseFloat(data.rates.VES);
        await saveApiHealthLog('exchangerate-api', 'success', responseTime, undefined, rate);
      } else {
        await saveApiHealthLog('exchangerate-api', 'failed', responseTime, 'VES rate not found in response');
      }
    } else {
      await saveApiHealthLog('exchangerate-api', 'failed', responseTime, `API Error: ${response.status}`);
    }
  } catch (error: any) {
    const responseTime = Date.now() - api1StartTime;
    await saveApiHealthLog('exchangerate-api', 'failed', responseTime, error.message || 'Unknown error');
  }

  // 2. Probar Fawazahmed0 Currency API
  const api2StartTime = Date.now();
  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MornaProject/1.0'
      },
      signal: AbortSignal.timeout(3000)
    });
    const responseTime = Date.now() - api2StartTime;
    
    if (response.ok) {
      const data = await response.json();
      if (data?.usd?.ves) {
        const rate = parseFloat(data.usd.ves.toString());
        await saveApiHealthLog('fawazahmed0_currency_api', 'success', responseTime, undefined, rate);
      } else {
        await saveApiHealthLog('fawazahmed0_currency_api', 'failed', responseTime, 'VES rate not found in response');
      }
    } else {
      await saveApiHealthLog('fawazahmed0_currency_api', 'failed', responseTime, `API Error: ${response.status}`);
    }
  } catch (error: any) {
    const responseTime = Date.now() - api2StartTime;
    await saveApiHealthLog('fawazahmed0_currency_api', 'failed', responseTime, error.message || 'Unknown error');
  }

  // 3. Probar DollarVzla.com
  const api3StartTime = Date.now();
  try {
    const response = await fetch('https://api.dollarvzla.com/v1/exchange-rates', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MornaProject/1.0'
      },
      signal: AbortSignal.timeout(3000)
    });
    const responseTime = Date.now() - api3StartTime;
    
    if (response.ok) {
      const data = await response.json();
      if (data?.exchangeRates && Array.isArray(data.exchangeRates)) {
        const bcvRate = data.exchangeRates.find((rate: any) =>
          rate.sourceCode && rate.sourceCode.toLowerCase() === 'bcv'
        );
        if (bcvRate?.value) {
          const rate = parseFloat(bcvRate.value.toString());
          await saveApiHealthLog('dollarvzla.com', 'success', responseTime, undefined, rate);
        } else {
          await saveApiHealthLog('dollarvzla.com', 'failed', responseTime, 'BCV rate not found in response');
        }
      } else {
        await saveApiHealthLog('dollarvzla.com', 'failed', responseTime, 'Invalid response format');
      }
    } else {
      await saveApiHealthLog('dollarvzla.com', 'failed', responseTime, `API Error: ${response.status}`);
    }
  } catch (error: any) {
    const responseTime = Date.now() - api3StartTime;
    await saveApiHealthLog('dollarvzla.com', 'failed', responseTime, error.message || 'Unknown error');
  }
}


export async function GET(request: NextRequest) {
  try {
    // Obtener estadísticas de todas las APIs (igual que simple-test que funciona)
    console.log('[Health Endpoint] Llamando a getAllApiHealthStats()...');
    const apiStats = await getAllApiHealthStats();
    console.log('[Health Endpoint] getAllApiHealthStats retornó:', apiStats?.length || 0, 'APIs');
    console.log('[Health Endpoint] Tipo:', typeof apiStats, Array.isArray(apiStats) ? '(es array)' : '(NO es array)');
    if (apiStats && apiStats.length > 0) {
      console.log('[Health Endpoint] Primeras 2 APIs:', apiStats.slice(0, 2).map(a => ({ name: a.api_name, status: a.status })));
    }
    
    // Obtener la fuente actual (última tasa válida o de BD)
    const currentRate = await getLatestValidExchangeRate();
    const anyRate = await getLatestExchangeRate();

    // Determinar estado general
    const hasWorkingApi = apiStats.some(stat => stat.status === 'up');
    const hasDegradedApi = apiStats.some(stat => stat.status === 'degraded');
    
    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (!hasWorkingApi && !hasDegradedApi) {
      overallStatus = 'down';
    } else if (!hasWorkingApi || hasDegradedApi) {
      overallStatus = 'degraded';
    }

    // Determinar fuente actual
    let currentSource: {
      type: 'api' | 'database';
      rate: number;
      age_hours: number;
      source_name: string;
    };

    if (currentRate) {
      currentSource = {
        type: 'database',
        rate: currentRate.rate,
        age_hours: Math.floor(currentRate.age_minutes / 60),
        source_name: currentRate.source
      };
    } else if (anyRate) {
      const ageMinutes = anyRate.timestamp || anyRate.created_at
        ? Math.floor((new Date().getTime() - new Date(anyRate.timestamp || anyRate.created_at || '').getTime()) / (1000 * 60))
        : 0;
      currentSource = {
        type: 'database',
        rate: anyRate.rate,
        age_hours: Math.floor(ageMinutes / 60),
        source_name: anyRate.source || 'Base de Datos'
      };
    } else {
      // Tasa por defecto
      currentSource = {
        type: 'database',
        rate: 166.58,
        age_hours: 999,
        source_name: 'Tasa por Defecto'
      };
    }

    const responseData = {
      overall_status: overallStatus,
      apis: apiStats || [], // Asegurar que siempre sea un array
      current_source: currentSource,
      last_update: new Date().toISOString()
    };
    
    console.log('[Health Endpoint] Retornando respuesta con', responseData.apis.length, 'APIs');
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('Error in health endpoint:', error);
    return NextResponse.json({
      overall_status: 'unknown',
      error: error.message || 'Error al obtener estado de APIs',
      last_update: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Health Endpoint POST] Iniciando pruebas de todas las APIs...');
    
    // Obtener la URL base del servidor
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Probar todas las APIs de BCV individualmente para generar logs
    await testAllBcvApis();
    
    // Probar APIs de Binance (esto generará logs de todas las APIs de Binance)
    try {
      await fetch(`${baseUrl}/api/exchange-rate/binance?force=true&tradeType=BUY`, { 
        cache: 'no-store',
        headers: { 'User-Agent': 'MornaProject/1.0' }
      });
    } catch (error) {
      console.error('Error probando Binance BUY:', error);
    }
    
    try {
      await fetch(`${baseUrl}/api/exchange-rate/binance?force=true&tradeType=SELL`, { 
        cache: 'no-store',
        headers: { 'User-Agent': 'MornaProject/1.0' }
      });
    } catch (error) {
      console.error('Error probando Binance SELL:', error);
    }
    
    // Probar APIs de CNY (esto generará logs de todas las APIs de CNY)
    try {
      await fetch(`${baseUrl}/api/exchange-rate/cny?force=true`, { 
        cache: 'no-store',
        headers: { 'User-Agent': 'MornaProject/1.0' }
      });
    } catch (error) {
      console.error('Error probando CNY:', error);
    }
    
    // Esperar un momento para que se registren los logs
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Retornar las estadísticas actualizadas
    const apiStats = await getAllApiHealthStats();
    
    return NextResponse.json({
      success: true,
      message: 'Todas las APIs han sido probadas',
      apis: apiStats || [],
      last_update: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error probando APIs:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al probar APIs',
      last_update: new Date().toISOString()
    }, { status: 500 });
  }
}

