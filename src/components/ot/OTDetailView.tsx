import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, MoreVertical, Edit, Copy, FileDown, Trash2,
  Package, CalendarDays, Clock, User, CheckCircle2, Circle,
  TrendingUp, TrendingDown, Minus, ChevronDown
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Tables } from '@/integrations/supabase/types';

type WorkOrder = Tables<'work_orders'>;
type Operation = Tables<'operations'>;

interface Specifications {
  dimensions?: { width_cm?: number; height_cm?: number };
  substrate?: { type?: string; weight_gsm?: number; brand?: string };
  colors?: { front?: number; back?: number; pantones?: string[] };
  finishing?: string[];
}

interface Calculations {
  sheet_format?: string;
  bocas_per_sheet?: number;
  total_sheets?: number;
  substrate_kg?: number;
  ink_kg?: number;
  ctp_plates?: number;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Aprobada', className: 'bg-success/10 text-success' },
  in_production: { label: 'En Producción', className: 'bg-info/10 text-info' },
  completed: { label: 'Completada', className: 'bg-success/10 text-success' },
  delivered: { label: 'Entregada', className: 'bg-primary/10 text-primary' },
  cancelled: { label: 'Cancelada', className: 'bg-destructive/10 text-destructive' },
};

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'produccion', label: 'Producción' },
  { id: 'costos', label: 'Costos' },
  { id: 'historial', label: 'Historial' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function OTDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWorkOrder();
      const channel = supabase
        .channel(`work_order_${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `id=eq.${id}` }, () => fetchWorkOrder())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'operations', filter: `work_order_id=eq.${id}` }, () => fetchOperations())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [id]);

  const fetchWorkOrder = async () => {
    setLoading(true);
    const { data: wo } = await supabase.from('work_orders').select('*').eq('id', id).single();
    if (wo) setWorkOrder(wo);
    await fetchOperations();
    setLoading(false);
  };

  const fetchOperations = async () => {
    const { data: ops } = await supabase.from('operations').select('*').eq('work_order_id', id).order('sequence_order');
    if (ops) setOperations(ops);
  };

  const handleDuplicate = () => navigate('/ots/create', { state: { duplicateFrom: id } });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
  };

  const getDeviation = (budgeted: number, actual: number | null) => {
    if (actual === null || budgeted === 0) return null;
    return ((actual - budgeted) / budgeted) * 100;
  };

  const getDeviationColor = (deviation: number | null) => {
    if (deviation === null) return 'text-muted-foreground';
    if (Math.abs(deviation) < 5) return 'text-success';
    if (Math.abs(deviation) < 15) return 'text-warning';
    return 'text-destructive';
  };

  if (loading || !workOrder) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const specifications: Specifications = workOrder.specifications as Specifications || {};
  const calculations: Calculations = workOrder.calculations as Calculations || {};
  const statusConfig = STATUS_CONFIG[workOrder.status || 'draft'] || STATUS_CONFIG.draft;

  const totalBudgeted = operations.reduce((sum, op) => sum + op.total_cost_budgeted, 0);
  const totalActual = operations.reduce((sum, op) => sum + (op.total_cost_actual || 0), 0);
  const overallDeviation = totalBudgeted > 0 ? ((totalActual - totalBudgeted) / totalBudgeted) * 100 : 0;

  const daysUntilDelivery = workOrder.delivery_date
    ? Math.ceil((new Date(workOrder.delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Build specs list
  const specItems: string[] = [];
  if (specifications.substrate?.type) specItems.push(`${specifications.substrate.type} ${specifications.substrate.weight_gsm || ''}gsm`);
  if (specifications.dimensions?.width_cm) specItems.push(`${specifications.dimensions.width_cm}×${specifications.dimensions.height_cm} cm`);
  if (specifications.colors?.front !== undefined) specItems.push(`Colores ${specifications.colors.front}/${specifications.colors.back || 0}`);
  if (specifications.finishing) specifications.finishing.forEach(f => specItems.push(f));
  if (calculations.sheet_format) specItems.push(`Formato ${calculations.sheet_format}`);
  if (calculations.bocas_per_sheet) specItems.push(`${calculations.bocas_per_sheet} bocas/pliego`);
  if (calculations.total_sheets) specItems.push(`${calculations.total_sheets.toLocaleString()} pliegos`);
  if (calculations.ctp_plates) specItems.push(`${calculations.ctp_plates} placas CTP`);

  const visibleSpecs = showAllSpecs ? specItems : specItems.slice(0, 5);

  // Mock production data (from production_activity in real usage)
  const unitsProduced = 850;
  const progressPercent = Math.min(100, Math.round((unitsProduced / workOrder.quantity) * 100));

  // Chart data for costs tab
  const chartData = operations.map(op => ({
    name: op.operation_code,
    Presupuesto: op.total_cost_budgeted,
    Real: op.total_cost_actual || 0,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <header className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-2" onClick={() => navigate('/ots/dashboard')}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>

        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">OT #{workOrder.ot_number}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2" onClick={() => navigate(`/ots/${id}/edit`)}>
                    <Edit className="h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" onClick={handleDuplicate}>
                    <Copy className="h-4 w-4" /> Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <FileDown className="h-4 w-4" /> Descargar PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-lg text-muted-foreground">{workOrder.product_name} para {workOrder.client_name}</p>
            <Badge className={cn('text-xs font-medium', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Package className="h-4 w-4" /> {workOrder.quantity.toLocaleString()} unidades
          </span>
          {workOrder.delivery_date && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> Entrega: {format(new Date(workOrder.delivery_date), 'd MMM yyyy', { locale: es })}
            </span>
          )}
          {daysUntilDelivery !== null && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {daysUntilDelivery > 0 ? `${daysUntilDelivery} días` : 'Vencida'}
            </span>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex gap-1 border-b">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'resumen' && <ResumenTab workOrder={workOrder} specifications={specifications} specItems={visibleSpecs} allSpecsCount={specItems.length} showAllSpecs={showAllSpecs} onToggleSpecs={() => setShowAllSpecs(!showAllSpecs)} daysUntilDelivery={daysUntilDelivery} formatCurrency={formatCurrency} totalBudgeted={totalBudgeted} totalActual={totalActual} />}
        {activeTab === 'produccion' && <ProduccionTab workOrder={workOrder} unitsProduced={unitsProduced} progressPercent={progressPercent} />}
        {activeTab === 'costos' && <CostosTab operations={operations} totalBudgeted={totalBudgeted} totalActual={totalActual} overallDeviation={overallDeviation} chartData={chartData} formatCurrency={formatCurrency} getDeviation={getDeviation} getDeviationColor={getDeviationColor} workOrder={workOrder} />}
        {activeTab === 'historial' && <HistorialTab workOrder={workOrder} />}
      </div>
    </div>
  );
}

/* ── Resumen Tab ── */
function ResumenTab({ workOrder, specifications, specItems, allSpecsCount, showAllSpecs, onToggleSpecs, daysUntilDelivery, formatCurrency, totalBudgeted, totalActual }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard label="Cliente" value={workOrder.client_name} />
        <InfoCard label="Producto" value={workOrder.product_name} sub={specifications.dimensions ? `${specifications.dimensions.width_cm}×${specifications.dimensions.height_cm} cm` : undefined} />
        <InfoCard
          label="Entrega"
          value={workOrder.delivery_date ? format(new Date(workOrder.delivery_date), 'd MMMM yyyy', { locale: es }) : 'Sin fecha'}
          sub={daysUntilDelivery !== null ? (daysUntilDelivery > 0 ? `En ${daysUntilDelivery} días` : 'Vencida') : undefined}
          subColor={daysUntilDelivery !== null && daysUntilDelivery <= 0 ? 'text-destructive' : undefined}
        />
      </div>

      {/* Specifications */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Especificaciones</h3>
          <ul className="space-y-2.5">
            {specItems.map((item: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {allSpecsCount > 5 && (
            <button onClick={onToggleSpecs} className="mt-3 text-sm text-primary hover:underline">
              {showAllSpecs ? 'Ver menos' : `Ver todo + (${allSpecsCount - 5} más)`}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Price Summary */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <PriceStat label="Precio Unitario" value={formatCurrency(workOrder.unit_price)} />
            <PriceStat label="Total OT" value={formatCurrency(workOrder.total_price)} highlight />
            <PriceStat label="Costo Presupuestado" value={formatCurrency(totalBudgeted)} />
            <PriceStat label="Costo Real" value={formatCurrency(totalActual)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
        {sub && <p className={cn('text-sm mt-0.5', subColor || 'text-muted-foreground')}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PriceStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-xl font-semibold', highlight && 'text-primary')}>{value}</p>
    </div>
  );
}

/* ── Producción Tab ── */
function ProduccionTab({ workOrder, unitsProduced, progressPercent }: any) {
  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Progreso de Producción</h3>
            <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {unitsProduced.toLocaleString()} / {workOrder.quantity.toLocaleString()} unidades
          </p>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-6">Actividad de Producción</h3>
          <div className="space-y-0">
            <TimelineItem
              time="08:00"
              title="Inicio de producción"
              detail="500 unidades producidas"
              user="Juan Pérez"
              isFirst
            />
            <TimelineItem
              time="10:30"
              title="Reporte de avance"
              detail="+350 unidades"
              user="Juan Pérez"
            />
            <TimelineItem
              time="13:45"
              title="En progreso..."
              detail="Última actualización hace 15 min"
              isActive
              isLast
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineItem({ time, title, detail, user, isFirst, isLast, isActive }: { time: string; title: string; detail: string; user?: string; isFirst?: boolean; isLast?: boolean; isActive?: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-3 h-3 rounded-full border-2 shrink-0',
          isActive ? 'border-primary bg-primary animate-pulse' : 'border-muted-foreground/40 bg-background'
        )} />
        {!isLast && <div className="w-px h-full bg-border min-h-[3rem]" />}
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-mono text-muted-foreground">{time}</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{detail}</p>
        {user && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <User className="h-3 w-3" /> {user}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Costos Tab ── */
function CostosTab({ operations, totalBudgeted, totalActual, overallDeviation, chartData, formatCurrency, getDeviation, getDeviationColor, workOrder }: any) {
  const margin = (workOrder.total_price || 0) - totalActual;
  const marginPercent = workOrder.total_price ? ((margin / workOrder.total_price) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Budget vs Actual columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Presupuestado</p>
            <p className="text-3xl font-bold">{formatCurrency(totalBudgeted)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Real</p>
            <p className="text-3xl font-bold">{formatCurrency(totalActual)}</p>
            <div className={cn('flex items-center justify-center gap-1 mt-1 text-sm font-medium', getDeviationColor(overallDeviation))}>
              {overallDeviation > 0 ? <TrendingUp className="h-4 w-4" /> : overallDeviation < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              {overallDeviation > 0 ? '+' : ''}{overallDeviation.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Comparativo por Operación</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="Presupuesto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Real" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operations breakdown */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Desglose de Operaciones</h3>
          <div className="space-y-3">
            {operations.map((op: Operation) => {
              const dev = getDeviation(op.total_cost_budgeted, op.total_cost_actual);
              return (
                <div key={op.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{op.operation_name}</p>
                    <p className="text-xs text-muted-foreground">{op.operation_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(op.total_cost_actual)} <span className="text-muted-foreground font-normal">/ {formatCurrency(op.total_cost_budgeted)}</span></p>
                    {dev !== null && (
                      <p className={cn('text-xs font-medium', getDeviationColor(dev))}>
                        {dev > 0 ? '+' : ''}{dev.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Margin */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Precio Venta</p>
              <p className="text-lg font-semibold">{formatCurrency(workOrder.total_price)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Costo Real</p>
              <p className="text-lg font-semibold">{formatCurrency(totalActual)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Margen</p>
              <p className={cn('text-lg font-semibold', margin >= 0 ? 'text-success' : 'text-destructive')}>
                {formatCurrency(margin)} ({marginPercent}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Historial Tab ── */
function HistorialTab({ workOrder }: { workOrder: WorkOrder }) {
  const events = [
    { icon: Circle, action: 'Orden de trabajo creada', user: 'Sistema', time: workOrder.created_at, color: 'text-primary' },
    ...(workOrder.status !== 'draft' ? [{ icon: CheckCircle2, action: 'Orden aprobada', user: 'Administrador', time: workOrder.updated_at, color: 'text-success' }] : []),
    ...(workOrder.status === 'in_production' ? [{ icon: TrendingUp, action: 'Producción iniciada', user: 'Supervisor', time: workOrder.updated_at, color: 'text-info' }] : []),
    ...(workOrder.completed_at ? [{ icon: CheckCircle2, action: 'Producción completada', user: 'Sistema', time: workOrder.completed_at, color: 'text-success' }] : []),
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-6">Historial de Cambios</h3>
          <div className="space-y-4">
            {events.map((event, i) => (
              <div key={i} className="flex items-start gap-3">
                <event.icon className={cn('h-5 w-5 mt-0.5 shrink-0', event.color)} />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{event.user}</span>{' '}
                    <span className="text-muted-foreground">{event.action}</span>
                  </p>
                  {event.time && (
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.time), { addSuffix: true, locale: es })}
                      {' · '}
                      {format(new Date(event.time), 'dd MMM yyyy HH:mm', { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No hay historial disponible</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
