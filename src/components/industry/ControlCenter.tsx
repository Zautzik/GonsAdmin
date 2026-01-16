import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useProductionStats, useProductionIssues } from '@/hooks/useProductionTracking';
import { useInventoryStats, useInventoryAlerts, useInventoryTransactions } from '@/hooks/useInventoryData';
import { supabase } from '@/integrations/supabase/client';
import { 
  Factory, Package, AlertTriangle, TrendingUp, 
  Maximize2, Volume2, VolumeX, RotateCw, Bell,
  AlertCircle, CheckCircle2, Clock, Truck, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OTProgress {
  id: string;
  ot_number: string;
  client_name: string;
  quantity: number;
  produced: number;
  progress: number;
  status: string;
}

export default function ControlCenter() {
  const { stats: productionStats, refetch: refetchProduction } = useProductionStats();
  const { stats: inventoryStats, refetch: refetchInventory } = useInventoryStats();
  const { issues } = useProductionIssues(false);
  const { alerts: inventoryAlerts } = useInventoryAlerts();
  const { transactions } = useInventoryTransactions();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [currentView, setCurrentView] = useState(0);
  const [otsInProduction, setOtsInProduction] = useState<OTProgress[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch OTs in production
  useEffect(() => {
    const fetchOtsInProduction = async () => {
      const { data: ots } = await supabase
        .from('ots')
        .select('*')
        .neq('status', 'completed')
        .order('priority', { ascending: false });

      if (ots) {
        const otsWithProgress = await Promise.all(
          ots.map(async (ot) => {
            const { data: reports } = await supabase
              .from('production_reports')
              .select('units_produced')
              .eq('work_order_id', ot.id);
            
            const produced = reports?.reduce((sum, r) => sum + (r.units_produced || 0), 0) || 0;
            const progress = ot.quantity > 0 ? Math.min((produced / ot.quantity) * 100, 100) : 0;
            
            return {
              id: ot.id,
              ot_number: ot.ot_number,
              client_name: ot.client_name,
              quantity: ot.quantity,
              produced,
              progress,
              status: ot.status,
            };
          })
        );
        setOtsInProduction(otsWithProgress);
      }
    };

    fetchOtsInProduction();
    const interval = setInterval(() => {
      fetchOtsInProduction();
      refetchProduction();
      refetchInventory();
      setLastUpdate(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, [refetchProduction, refetchInventory]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('control-center-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_reports' }, () => {
        refetchProduction();
        setLastUpdate(new Date());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_issues' }, () => {
        if (soundEnabled) {
          const audio = new Audio('/alert.mp3');
          audio.play().catch(() => {});
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        refetchInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, refetchProduction, refetchInventory]);

  // Auto-rotate views in kiosk mode
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setCurrentView((prev) => (prev + 1) % 4);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRotate]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const totalOutputRate = Math.round((productionStats?.unitsProducedToday || 0) / 8);
  const runningMachines = otsInProduction.length;
  const totalMachines = 10;
  
  const oee = 85;
  const laborEfficiency = 92;
  const onTimeDelivery = 94;
  const costVariance = -2.5;

  return (
    <div className={`p-4 space-y-4 ${isFullscreen ? 'bg-background' : ''}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary animate-pulse" />
          <h1 className="text-2xl font-bold">Control Center</h1>
          <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-600 border-green-500/30">
            LIVE
          </Badge>
          <span className="text-xs text-muted-foreground ml-2">
            Última actualización: {format(lastUpdate, 'HH:mm:ss', { locale: es })}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-rotate"
              checked={autoRotate}
              onCheckedChange={setAutoRotate}
            />
            <Label htmlFor="auto-rotate" className="text-sm">
              <RotateCw className="h-4 w-4 inline mr-1" />
              Auto-rotar
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="sound"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
            <Label htmlFor="sound" className="text-sm">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4 mr-1" />
            {isFullscreen ? 'Salir' : 'Pantalla completa'}
          </Button>
        </div>
      </div>

      {/* 4 Quadrant Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-180px)]">
        {/* TOP LEFT - Production Status */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Factory className="h-5 w-5 text-primary" />
              Estado de Producción
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-primary">
                  {runningMachines}/{totalMachines}
                </div>
                <div className="text-sm text-muted-foreground">Máquinas Activas</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-green-600">
                  {productionStats?.unitsProducedToday?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-muted-foreground">Unidades Hoy</div>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <span className="text-2xl font-semibold">{totalOutputRate}</span>
              <span className="text-muted-foreground ml-2">unidades/hora</span>
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {otsInProduction.map((ot) => (
                  <div key={ot.id} className="bg-card border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{ot.ot_number}</span>
                      <Badge variant={ot.progress >= 100 ? 'default' : 'secondary'}>
                        {ot.progress.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">{ot.client_name}</div>
                    <Progress value={ot.progress} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {ot.produced.toLocaleString()} / {ot.quantity.toLocaleString()} unidades
                    </div>
                  </div>
                ))}
                {otsInProduction.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No hay OTs en producción actualmente
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* TOP RIGHT - Inventory Status */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-orange-500/5 py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-orange-600" />
              Estado de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-yellow-500/10 rounded-lg p-4 text-center border border-yellow-500/20">
                <div className="text-3xl font-bold text-yellow-600">
                  {inventoryStats?.lowStock || 0}
                </div>
                <div className="text-sm text-muted-foreground">Stock Bajo</div>
              </div>
              <div className={`rounded-lg p-4 text-center border ${
                (inventoryStats?.outOfStock || 0) > 0 
                  ? 'bg-red-500/10 border-red-500/20' 
                  : 'bg-muted/50'
              }`}>
                <div className={`text-3xl font-bold ${
                  (inventoryStats?.outOfStock || 0) > 0 ? 'text-red-600' : 'text-muted-foreground'
                }`}>
                  {inventoryStats?.outOfStock || 0}
                </div>
                <div className="text-sm text-muted-foreground">Sin Stock</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Transacciones Recientes
              </h4>
              <ScrollArea className="h-[120px]">
                <div className="space-y-1">
                  {transactions.slice(0, 10).map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between text-sm py-1 border-b">
                      <span className="truncate flex-1">{tx.inventory_item_id?.slice(0, 8)}...</span>
                      <Badge variant={tx.transaction_type === 'purchase' ? 'default' : 'secondary'} className="text-xs">
                        {tx.transaction_type === 'purchase' ? '+' : '-'}{tx.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Próxima Entrega</span>
              </div>
              <div className="text-lg font-semibold mt-1">Mañana - 10:00 AM</div>
              <div className="text-sm text-muted-foreground">Proveedor: Papel y Más</div>
            </div>
          </CardContent>
        </Card>

        {/* BOTTOM LEFT - Issues & Alerts */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-red-500/5 py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Incidencias y Alertas
              {(issues.length + inventoryAlerts.length) > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {issues.length + inventoryAlerts.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/20">
                <div className="text-3xl font-bold text-red-600">
                  {issues.length}
                </div>
                <div className="text-sm text-muted-foreground">Incidencias Activas</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">
                  45 min
                </div>
                <div className="text-sm text-muted-foreground">Tiempo Promedio Resolución</div>
              </div>
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {issues.map((issue: any) => (
                  <div key={issue.id} className="bg-card border rounded-lg p-3 flex items-start gap-3">
                    <AlertCircle className={`h-5 w-5 shrink-0 ${
                      issue.severity === 'critical' ? 'text-red-600' :
                      issue.severity === 'high' ? 'text-orange-600' :
                      'text-yellow-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {issue.issue_type}
                        </Badge>
                        <Badge 
                          variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1 truncate">{issue.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(issue.created_at), 'dd/MM HH:mm')}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Bell className="h-3 w-3 mr-1" />
                      Notificar
                    </Button>
                  </div>
                ))}
                {issues.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                    <p className="text-muted-foreground">Sin incidencias activas</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* BOTTOM RIGHT - Performance Metrics */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-green-500/5 py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Métricas de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* OEE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">OEE (Eficiencia Global)</span>
                <span className="text-2xl font-bold text-green-600">{oee}%</span>
              </div>
              <Progress value={oee} className="h-3" />
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>Disponibilidad: 90%</div>
                <div>Rendimiento: 95%</div>
                <div>Calidad: 99%</div>
              </div>
            </div>

            {/* Labor Efficiency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Eficiencia Laboral</span>
                <span className="text-2xl font-bold text-blue-600">{laborEfficiency}%</span>
              </div>
              <Progress value={laborEfficiency} className="h-3" />
            </div>

            {/* On-Time Delivery */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Entregas a Tiempo</span>
                <span className="text-2xl font-bold text-purple-600">{onTimeDelivery}%</span>
              </div>
              <Progress value={onTimeDelivery} className="h-3" />
            </div>

            {/* Cost Variance */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Variación de Costos</span>
                <span className={`text-2xl font-bold ${costVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {costVariance > 0 ? '+' : ''}{costVariance}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {costVariance < 0 ? 'Por debajo del presupuesto' : 'Por encima del presupuesto'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
