'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Database,
  Loader2,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/use-toast';

interface ApiHealthStats {
  api_name: string;
  status: 'up' | 'down' | 'degraded';
  last_success?: string;
  last_failure?: string;
  response_time_avg?: number;
  success_rate_24h: number;
  total_attempts_24h: number;
  successful_attempts_24h: number;
  current_rate?: number;
}

interface HealthResponse {
  overall_status: 'healthy' | 'degraded' | 'down';
  apis: ApiHealthStats[];
  current_source: {
    type: 'api' | 'database';
    rate: number;
    age_hours: number;
    source_name: string;
  };
  last_update: string;
}

export default function ApiHealthMonitor() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const fetchHealthData = async () => {
    try {
      // Agregar timestamp para evitar caché del navegador
      const timestamp = Date.now();
      const response = await fetch(`/api/exchange-rate/health?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch health data');
      const data = await response.json();
      console.log('[Frontend] Health data recibida:', data);
      console.log('[Frontend] Número de APIs:', data.apis?.length || 0);
      console.log('[Frontend] Tipo de apis:', typeof data.apis, Array.isArray(data.apis) ? '(es array)' : '(NO es array)');
      if (data.apis && data.apis.length > 0) {
        console.log('[Frontend] Primeras 2 APIs:', data.apis.slice(0, 2));
      }
      setHealthData(data);
    } catch (error: any) {
      console.error('Error fetching health data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo obtener el estado de las APIs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealthData();
  };

  const handleTestAllApis = async () => {
    try {
      setRefreshing(true);
      
      toast({
        title: 'Probando APIs...',
        description: 'Por favor espera mientras se prueban todas las APIs.',
      });

      // Llamar al endpoint de health POST que probará todas las APIs individualmente
      const response = await fetch('/api/exchange-rate/health', {
        method: 'POST',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al probar APIs');
      }
      
      const result = await response.json();
      
      console.log('[Frontend] Resultados de pruebas:', {
        success: result.success,
        apis_tested: result.apis?.length || 0,
        message: result.message
      });
      
      // Refrescar los datos
      await fetchHealthData();
      
      toast({
        title: 'Pruebas completadas',
        description: result.success 
          ? 'Todas las APIs han sido probadas. Revisa el estado actualizado arriba.'
          : 'Error al probar algunas APIs. Revisa el estado actualizado arriba.',
      });
    } catch (error: any) {
      console.error('Error probando APIs:', error);
      toast({
        title: 'Error',
        description: 'Error al probar las APIs: ' + (error.message || 'Error desconocido'),
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <WifiOff className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return <Badge className="bg-green-500">Funcionando</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500">Inestable</Badge>;
      case 'down':
        return <Badge className="bg-red-500">Caída</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace menos de 1 minuto';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  };

  const getApiDisplayName = (apiName: string): string => {
    const nameMap: Record<string, string> = {
      'dollarvzla.com': 'DollarVzla.com',
      'exchangerate-api': 'ExchangeRate-API',
      'fawazahmed0_currency_api': 'Fawazahmed0 Currency API',
      'binance_p2p_direct': 'Binance P2P Direct',
      'pydolarvenezuela_binance': 'PyDolarVenezuela (Binance)',
      'dollarvzla_binance': 'DollarVzla (Binance)',
      'exchangerate_api_cny': 'ExchangeRate-API (CNY)',
      'fixer_free_cny': 'Fixer-Free (CNY)'
    };
    return nameMap[apiName] || apiName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (!healthData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No se pudo cargar el estado de las APIs
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado General */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(healthData.overall_status)}
              <CardTitle>Estado General del Sistema</CardTitle>
            </div>
            <div className="flex gap-2">
              <Dialog open={infoModalOpen} onOpenChange={setInfoModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Información
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Información sobre el Estado de las APIs
                    </DialogTitle>
                    <DialogDescription>
                      Guía de referencia para entender el estado de las APIs de tasas de cambio
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-sm mb-1">APIs Caídas Durante Días Hábiles</h4>
                          <p className="text-sm text-muted-foreground">
                            Si todas las APIs de un tipo específico (BCV, Binance o CNY) permanecen inactivas durante días hábiles (lunes a viernes), 
                            por favor contacte con el equipo de desarrollo del sistema para realizar una verificación técnica y resolver el problema.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <Clock className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-sm mb-1">Mantenimiento Programado - APIs BCV</h4>
                          <p className="text-sm text-muted-foreground">
                            Las tasas de cambio oficiales del Banco Central de Venezuela (BCV) no cotizan durante los fines de semana 
                            ni días festivos. Si las APIs de BCV aparecen como &quot;caídas&quot; durante estos períodos, esto es completamente 
                            normal y corresponde a un mantenimiento programado del sistema bancario.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-sm mb-1">Cuándo Contactar al Equipo de Desarrollo</h4>
                          <p className="text-sm text-muted-foreground">
                            Se recomienda contactar con el equipo de desarrollo si el problema persiste durante días hábiles o 
                            se extiende más allá de un fin de semana completo. El equipo técnico podrá realizar una revisión 
                            exhaustiva y aplicar las correcciones necesarias.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <Database className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-sm mb-1">Discrepancia entre Estado de API y Montos del Sistema</h4>
                          <p className="text-sm text-muted-foreground">
                            Si la API de BCV aparece como &quot;caída&quot; en el panel de monitoreo, pero los montos mostrados en el módulo 
                            de finanzas son correctos, esto puede indicar una discrepancia temporal entre el sistema de monitoreo 
                            y el funcionamiento real de la API. En este caso, verifique la tasa de cambio actual en la página 
                            oficial del Banco Central de Venezuela y compare con los valores que aparecen en el sistema. Si las 
                            tasas coinciden, es probable que se trate de un problema de visualización en los logs de monitoreo o 
                            en el frontend, mientras que la API continúa funcionando correctamente. Se recomienda esperar un día 
                            para verificar si el estado se actualiza automáticamente. Si el problema persiste después de este período, 
                            contacte con el equipo de desarrollo para una revisión técnica del sistema de monitoreo.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-xs text-muted-foreground italic">
                        Para soporte técnico adicional, comuníquese con el equipo de desarrollo del sistema.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAllApis}
                disabled={refreshing}
                className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
              >
                <Activity className="w-4 h-4 mr-2" />
                Probar APIs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
          <CardDescription>
            Última actualización: {formatTimeAgo(healthData.last_update)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {getStatusBadge(healthData.overall_status)}
            <span className="text-sm text-muted-foreground">
              {healthData.apis.filter(a => a.status === 'up').length} de {healthData.apis.length} APIs funcionando
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Estado de cada API */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthData.apis
          .sort((a, b) => {
            // Orden de prioridad predefinido (de más importante a menos importante)
            const priorityOrder: Record<string, number> = {
      // BCV APIs (orden de uso)
      'exchangerate-api': 1,
      'fawazahmed0_currency_api': 2,
      'dollarvzla.com': 3,
              // Binance APIs (orden de uso)
              'binance_p2p_direct': 4,
              'pydolarvenezuela_binance': 5,
              'dollarvzla_binance': 6,
              // CNY APIs (orden de uso)
              'exchangerate_api_cny': 7,
              'fixer_free_cny': 8
            };

            // Primero ordenar por status: 'up' primero, luego 'down'
            const statusOrder = { 'up': 0, 'degraded': 1, 'down': 2 };
            const statusDiff = (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
            
            // Si tienen el mismo status, ordenar por prioridad
            if (statusDiff === 0) {
              const priorityA = priorityOrder[a.api_name] || 99;
              const priorityB = priorityOrder[b.api_name] || 99;
              return priorityA - priorityB;
            }
            
            return statusDiff;
          })
          .map((api) => (
          <Card key={api.api_name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{getApiDisplayName(api.api_name)}</CardTitle>
                {getStatusIcon(api.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado:</span>
                {getStatusBadge(api.status)}
              </div>
              
              {api.last_success && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Último éxito:</span>
                  <span className="text-green-600 dark:text-green-400">{formatTimeAgo(api.last_success)}</span>
                </div>
              )}
              
              {api.last_failure && !api.last_success && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Último intento:</span>
                  <span className="text-red-600 dark:text-red-400">{formatTimeAgo(api.last_failure)} (fallido)</span>
                </div>
              )}
              
              {api.last_failure && api.last_success && new Date(api.last_failure) > new Date(api.last_success) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Último fallo:</span>
                  <span className="text-yellow-600 dark:text-yellow-400">{formatTimeAgo(api.last_failure)}</span>
                </div>
              )}
              
              {api.response_time_avg && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tiempo promedio:</span>
                  <span>{Math.round(api.response_time_avg)}ms</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tasa de éxito (24h):</span>
                <span className="font-semibold">{api.success_rate_24h.toFixed(1)}%</span>
              </div>
              
              {api.current_rate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasa actual:</span>
                  <span className="font-semibold">{api.current_rate.toFixed(2)} VES/USD</span>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground pt-2 border-t">
                {api.successful_attempts_24h} exitosos de {api.total_attempts_24h} intentos
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fuente Actual */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            <CardTitle>Fuente Actual de Tasa de Cambio</CardTitle>
          </div>
          <CardDescription>
            Información sobre la tasa de cambio que se está utilizando actualmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Fuente:</span>
            <Badge variant="outline">{healthData.current_source.source_name}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tipo:</span>
            <Badge variant={healthData.current_source.type === 'api' ? 'default' : 'secondary'}>
              {healthData.current_source.type === 'api' ? 'API Externa' : 'Base de Datos'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tasa:</span>
            <span className="text-lg font-bold">{healthData.current_source.rate.toFixed(2)} VES/USD</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Antigüedad:</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {healthData.current_source.age_hours < 1 
                  ? 'Menos de 1 hora'
                  : healthData.current_source.age_hours < 24
                  ? `${healthData.current_source.age_hours} hora${healthData.current_source.age_hours > 1 ? 's' : ''}`
                  : `${Math.floor(healthData.current_source.age_hours / 24)} día${Math.floor(healthData.current_source.age_hours / 24) > 1 ? 's' : ''}`
                }
              </span>
            </div>
          </div>
          
          {healthData.current_source.age_hours > 24 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                La tasa actual tiene más de 24 horas de antigüedad. Se recomienda actualizar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

