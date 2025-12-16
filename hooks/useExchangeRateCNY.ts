import { useState, useEffect, useRef, useCallback } from 'react';

interface ExchangeRateDataCNY {
  rate: number;
  timestamp: string;
  source: string;
  from_database: boolean;
  warning?: string;
  error?: string;
}

interface UseExchangeRateCNYOptions {
  autoUpdate?: boolean;
  interval?: number; // en milisegundos
  onRateUpdate?: (rate: number) => void;
}

export const useExchangeRateCNY = (options: UseExchangeRateCNYOptions = {}) => {
  const {
    autoUpdate = false,
    interval = 30 * 60 * 1000, // 30 minutos por defecto
    onRateUpdate
  } = options;

  const [rate, setRate] = useState<number | null>(null); // Sin valor inicial hasta cargar desde API
  const [loading, setLoading] = useState<boolean>(true); // Empezar en true para mostrar loading inicial
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [source, setSource] = useState<string>('');
  const [fromDatabase, setFromDatabase] = useState<boolean>(false);
  const [ageMinutes, setAgeMinutes] = useState<number | null>(null);
  const [isAutoUpdating, setIsAutoUpdating] = useState<boolean>(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const onRateUpdateRef = useRef(onRateUpdate);

  // Actualizar ref cuando cambie
  useEffect(() => {
    onRateUpdateRef.current = onRateUpdate;
  }, [onRateUpdate]);

  // Función estable para obtener la tasa actual (sin useCallback para evitar loops)
  const fetchRate = async (showLoading = true) => {


    if (!isMountedRef.current) {

      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {

      const response = await fetch('/api/exchange-rate/cny', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });



      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();


      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch CNY exchange rate');
      }

      const newRate = parseFloat(data.rate?.toString() || '0');

      if (isNaN(newRate) || newRate <= 0) {
        throw new Error(`Invalid CNY rate received from API: ${data.rate}`);
      }


      setRate(newRate);
      setLastUpdated(new Date());
      setSource(data.source || 'API');

      // Callback para notificar cambio de tasa
      if (onRateUpdate) {

        onRateUpdate(newRate);
      }

      // Mostrar warning si existe
      if (data.warning) {
        console.warn('[CNY ExchangeRate]', data.warning);
      }

    } catch (err: any) {

      if (!isMountedRef.current) return;

      const errorMessage = err.message || 'Error al obtener tasa CNY';
      setError(errorMessage);
      console.error('[CNY ExchangeRate] Error:', err);
    } finally {

      setLoading(false);
    }
  };

  // Función pública para refrescar manualmente
  const refreshRate = useCallback(() => {
    fetchRate(true);
  }, []); // Sin dependencias para evitar loops

  // Función para obtener tiempo desde última actualización
  const getTimeSinceUpdate = useCallback(() => {
    if (!lastUpdated) return 'Nunca';

    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return 'Hace menos de 1 minuto';
    } else if (diffMinutes < 60) {
      return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    }
  }, [lastUpdated]);

  // Configurar/limpiar intervalos para auto-actualización
  useEffect(() => {
    if (autoUpdate) {
      setIsAutoUpdating(true);

      console.log(`[useExchangeRateCNY] Iniciando auto-actualización cada ${interval / 1000 / 60} minutos`);

      // Obtener tasa inicial con force=true
      fetch('/api/exchange-rate/cny?force=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then((data: any) => {
          if (data.success && data.rate) {
            setRate(data.rate);
            setLastUpdated(new Date(data.timestamp || new Date().toISOString()));
            setSource(data.source || 'API');
            setFromDatabase(data.from_database || false);
            setAgeMinutes(data.age_minutes || null);
            
            if (onRateUpdateRef.current) {
              onRateUpdateRef.current(data.rate);
            }
          }
        })
        .catch(error => {
          console.error('[useExchangeRateCNY] Error en fetch inicial:', error);
        });

      // Configurar intervalo para actualizar cada 30 minutos con force=true
      intervalRef.current = setInterval(() => {
        console.log(`[useExchangeRateCNY] Auto-actualización ejecutándose...`);
        
        // Usar force=true para forzar actualización desde API, no desde BD
        fetch('/api/exchange-rate/cny?force=true', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
          .then(response => response.json())
          .then((data: any) => {
            if (data.success && data.rate) {
              setRate(data.rate);
              setLastUpdated(new Date(data.timestamp || new Date().toISOString()));
              setSource(data.source || 'API');
              setFromDatabase(data.from_database || false);
              setAgeMinutes(data.age_minutes || null);
              
              if (onRateUpdateRef.current) {
                onRateUpdateRef.current(data.rate);
              }
              
              console.log(`[useExchangeRateCNY] ✅ Tasa CNY actualizada automáticamente: ${data.rate} CNY/USD`);
            }
          })
          .catch(error => {
            console.error('[useExchangeRateCNY] ❌ Error en auto-actualización:', error);
          });
      }, interval);

    } else {
      setIsAutoUpdating(false);
      setLoading(false); // Desactivar loading cuando no hay auto-update

      console.log('[useExchangeRateCNY] Auto-actualización desactivada');

      // Limpiar intervalo
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // NO obtener tasa de API cuando autoUpdate está desactivado
      // El valor manual debe mantenerse desde localStorage/config
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoUpdate, interval]); // Solo depende de autoUpdate e interval

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    rate,
    loading,
    error,
    lastUpdated,
    source,
    refreshRate,
    getTimeSinceUpdate,
    isAutoUpdating: isAutoUpdating && autoUpdate
  };
};
