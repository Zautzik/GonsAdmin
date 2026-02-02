import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Edit, Copy, Printer, FileText, 
  Calculator, TrendingUp, History, Save, Bookmark
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Tables, Json } from '@/integrations/supabase/types';

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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  approved: { label: 'Aprobada', color: 'bg-success/20 text-success' },
  in_production: { label: 'En Producción', color: 'bg-warning/20 text-warning' },
  completed: { label: 'Completada', color: 'bg-info/20 text-info' },
  delivered: { label: 'Entregada', color: 'bg-primary/20 text-primary' },
  cancelled: { label: 'Cancelada', color: 'bg-destructive/20 text-destructive' },
};

export default function OTDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOperation, setEditingOperation] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchWorkOrder();
      setupRealtimeSubscription();
    }
  }, [id]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`work_order_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `id=eq.${id}` }, () => fetchWorkOrder())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operations', filter: `work_order_id=eq.${id}` }, () => fetchOperations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchWorkOrder = async () => {
    setLoading(true);
    const { data: wo, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (!error && wo) {
      setWorkOrder(wo);
    }

    await fetchOperations();
    setLoading(false);
  };

  const fetchOperations = async () => {
    const { data: ops } = await supabase
      .from('operations')
      .select('*')
      .eq('work_order_id', id)
      .order('sequence_order');
    
    if (ops) setOperations(ops);
  };

  const handleUpdateActual = async (opId: string, field: 'quantity_actual' | 'unit_cost_actual', value: number) => {
    const op = operations.find(o => o.id === opId);
    if (!op) return;

    const updates: Partial<Operation> = { [field]: value };
    if (field === 'quantity_actual') {
      updates.total_cost_actual = value * (op.unit_cost_actual || op.unit_cost_budgeted);
    } else {
      updates.total_cost_actual = (op.quantity_actual || op.quantity_budgeted) * value;
    }

    await supabase.from('operations').update(updates).eq('id', opId);
    fetchOperations();
  };

  const handleDuplicate = async () => {
    navigate('/ots/create', { state: { duplicateFrom: id } });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
  };

  const getDeviation = (budgeted: number, actual: number | null) => {
    if (actual === null) return null;
    return ((actual - budgeted) / budgeted) * 100;
  };

  const getDeviationColor = (deviation: number | null) => {
    if (deviation === null) return '';
    if (Math.abs(deviation) < 5) return 'text-success';
    if (Math.abs(deviation) < 15) return 'text-warning';
    return 'text-destructive';
  };

  // Parse JSONB fields
  const specifications: Specifications = workOrder?.specifications as Specifications || {};
  const calculations: Calculations = workOrder?.calculations as Calculations || {};

  if (loading || !workOrder) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const totalBudgeted = operations.reduce((sum, op) => sum + op.total_cost_budgeted, 0);
  const totalActual = operations.reduce((sum, op) => sum + (op.total_cost_actual || 0), 0);
  const overallDeviation = totalBudgeted > 0 ? ((totalActual - totalBudgeted) / totalBudgeted) * 100 : 0;

  const chartData = operations.map(op => ({
    name: op.operation_code,
    Presupuesto: op.total_cost_budgeted,
    Real: op.total_cost_actual || 0,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ots/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">OT #{workOrder.ot_number}</h1>
              <Badge className={cn('text-sm', STATUS_CONFIG[workOrder.status || 'draft']?.color)}>
                {STATUS_CONFIG[workOrder.status || 'draft']?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">{workOrder.client_name} • {workOrder.product_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDuplicate}>
            <Copy className="h-4 w-4" /> Duplicar
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/ots/${id}/pdf`)}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
          <Button size="sm" className="gap-2" onClick={() => navigate(`/ots/${id}/edit`)}>
            <Edit className="h-4 w-4" /> Editar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="gap-2"><FileText className="h-4 w-4" /> Resumen</TabsTrigger>
          <TabsTrigger value="operations" className="gap-2"><Calculator className="h-4 w-4" /> Operaciones</TabsTrigger>
          <TabsTrigger value="costs" className="gap-2"><TrendingUp className="h-4 w-4" /> Costos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Trabajo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{workOrder.client_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Producto</span><span className="font-medium">{workOrder.product_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cantidad</span><span className="font-medium">{workOrder.quantity.toLocaleString()}</span></div>
                {workOrder.delivery_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entrega</span>
                    <span className="font-medium">{format(new Date(workOrder.delivery_date), 'dd/MM/yyyy', { locale: es })}</span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Prioridad</span><span className="font-medium">{workOrder.priority || 'Normal'}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Especificaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensiones</span>
                  <span className="font-medium">
                    {specifications.dimensions?.width_cm || 0}×{specifications.dimensions?.height_cm || 0} cm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sustrato</span>
                  <span className="font-medium">
                    {specifications.substrate?.type || '-'} {specifications.substrate?.weight_gsm || 0}g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Colores</span>
                  <span className="font-medium">
                    {specifications.colors?.front || 0}/{specifications.colors?.back || 0}
                  </span>
                </div>
                {specifications.finishing && specifications.finishing.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Terminaciones:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {specifications.finishing.map((op: string) => (
                        <Badge key={op} variant="secondary" className="text-xs">{op}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles Técnicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Formato Hoja</span><span className="font-medium">{calculations.sheet_format || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bocas</span><span className="font-medium">{calculations.bocas_per_sheet || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Hojas</span><span className="font-medium">{calculations.total_sheets?.toLocaleString() || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sustrato</span><span className="font-medium">{calculations.substrate_kg || 0} kg</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CTP</span><span className="font-medium">{calculations.ctp_plates || 0} planchas</span></div>
              </CardContent>
            </Card>
          </div>

          {/* Price Summary */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Precio Unitario</p>
                  <p className="text-2xl font-bold">{formatCurrency(workOrder.unit_price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total OT</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(workOrder.total_price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Costo Real</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalActual)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Desvío</p>
                  <p className={cn('text-2xl font-bold', getDeviationColor(overallDeviation))}>
                    {overallDeviation > 0 ? '+' : ''}{overallDeviation.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Operaciones</CardTitle>
              <CardDescription>Seguimiento de presupuesto vs real</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cant. Presup.</TableHead>
                    <TableHead>Cant. Real</TableHead>
                    <TableHead className="text-right">Costo Presup.</TableHead>
                    <TableHead className="text-right">Costo Real</TableHead>
                    <TableHead className="text-right">Desvío</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((op) => {
                    const deviation = getDeviation(op.total_cost_budgeted, op.total_cost_actual);
                    const isEditable = ['in_production', 'completed'].includes(workOrder.status || '');
                    
                    return (
                      <TableRow key={op.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{op.operation_code}</Badge>
                        </TableCell>
                        <TableCell>{op.quantity_budgeted}</TableCell>
                        <TableCell>
                          {isEditable ? (
                            <Input
                              type="number"
                              value={op.quantity_actual ?? ''}
                              onChange={(e) => handleUpdateActual(op.id, 'quantity_actual', parseFloat(e.target.value))}
                              className="w-20 h-8"
                            />
                          ) : (
                            op.quantity_actual ?? '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(op.total_cost_budgeted)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(op.total_cost_actual)}</TableCell>
                        <TableCell className={cn('text-right font-medium', getDeviationColor(deviation))}>
                          {deviation !== null ? `${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={op.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {op.status || 'pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparativo Presupuesto vs Real</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="Presupuesto" fill="hsl(var(--primary))" />
                    <Bar dataKey="Real" fill="hsl(var(--warning))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen de Costos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span>Total Presupuestado</span>
                  <span className="font-bold">{formatCurrency(totalBudgeted)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Total Real</span>
                  <span className="font-bold">{formatCurrency(totalActual)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span>Diferencia</span>
                  <span className={cn('font-bold', getDeviationColor(overallDeviation))}>
                    {formatCurrency(totalActual - totalBudgeted)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rentabilidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span>Precio Venta</span>
                  <span className="font-bold">{formatCurrency(workOrder.total_price)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Costo Real</span>
                  <span className="font-bold">{formatCurrency(totalActual)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span>Margen</span>
                  <span className={cn('font-bold', (workOrder.total_price || 0) > totalActual ? 'text-success' : 'text-destructive')}>
                    {formatCurrency((workOrder.total_price || 0) - totalActual)} 
                    ({workOrder.total_price ? (((workOrder.total_price - totalActual) / workOrder.total_price) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}