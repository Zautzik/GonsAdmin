import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Edit, Copy, Printer, Trash2, FileText, Package, 
  Calculator, Clock, TrendingUp, TrendingDown, History, AlertTriangle,
  CheckCircle, XCircle, Save, Bookmark
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface WorkOrderDetail {
  id: string;
  ot_number: number;
  client_name: string;
  product_name: string;
  product_description: string | null;
  quantity: number;
  status: string;
  priority: number;
  delivery_date: string | null;
  total_price: number;
  unit_price: number;
  budget_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OTOperation {
  id: string;
  operation_code: string;
  sequence_order: number;
  quantity_budgeted: number;
  quantity_actual: number | null;
  unit_cost_budgeted: number;
  unit_cost_actual: number | null;
  total_cost_budgeted: number;
  total_cost_actual: number | null;
  unit_of_measure: string | null;
  status: string;
  notes: string | null;
}

interface OTSpecification {
  finished_width_cm: number | null;
  finished_height_cm: number | null;
  substrate_type: string | null;
  substrate_weight_gsm: number | null;
  colors_front: number | null;
  colors_back: number | null;
  pantone_colors: string[];
  finishing_operations: string[];
}

interface OTCalculation {
  sheet_format: string | null;
  bocas_per_sheet: number | null;
  total_sheets: number | null;
  substrate_kg: number | null;
  ctp_plates: number | null;
}

interface OTHistory {
  id: string;
  action: string;
  field_changed: string | null;
  old_value: any;
  new_value: any;
  changed_at: string;
  notes: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  approved: { label: 'Aprobada', color: 'bg-success/20 text-success' },
  in_production: { label: 'En Producción', color: 'bg-warning/20 text-warning' },
  completed: { label: 'Completada', color: 'bg-info/20 text-info' },
  delivered: { label: 'Entregada', color: 'bg-primary/20 text-primary' },
  cancelled: { label: 'Cancelada', color: 'bg-destructive/20 text-destructive' },
};

const DEVIATION_REASONS = [
  'Aumento precio material',
  'Setup adicional',
  'Mayor desperdicio',
  'Falla de máquina',
  'Cambios de diseño',
  'Personalizado',
];

export default function OTDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [specifications, setSpecifications] = useState<OTSpecification | null>(null);
  const [calculations, setCalculations] = useState<OTCalculation | null>(null);
  const [operations, setOperations] = useState<OTOperation[]>([]);
  const [history, setHistory] = useState<OTHistory[]>([]);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ot_operations', filter: `work_order_id=eq.${id}` }, () => fetchOperations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchWorkOrder = async () => {
    setLoading(true);
    const { data: wo } = await supabase.from('work_orders').select('*').eq('id', id).single();
    if (wo) setWorkOrder(wo);

    const { data: specs } = await supabase.from('ot_specifications').select('*').eq('work_order_id', id).single();
    if (specs) setSpecifications({
      ...specs,
      pantone_colors: (specs.pantone_colors as string[]) || [],
      finishing_operations: (specs.finishing_operations as string[]) || [],
    });

    const { data: calcs } = await supabase.from('ot_calculations').select('*').eq('work_order_id', id).single();
    if (calcs) setCalculations(calcs);

    await fetchOperations();
    await fetchHistory();
    setLoading(false);
  };

  const fetchOperations = async () => {
    const { data: ops } = await supabase.from('ot_operations').select('*').eq('work_order_id', id).order('sequence_order');
    if (ops) setOperations(ops);
  };

  const fetchHistory = async () => {
    const { data: hist } = await supabase.from('ot_history').select('*').eq('work_order_id', id).order('changed_at', { ascending: false });
    if (hist) setHistory(hist);
  };

  const handleUpdateActual = async (opId: string, field: 'quantity_actual' | 'unit_cost_actual', value: number) => {
    const op = operations.find(o => o.id === opId);
    if (!op) return;

    const updates: any = { [field]: value };
    if (field === 'quantity_actual') {
      updates.total_cost_actual = value * (op.unit_cost_actual || op.unit_cost_budgeted);
    } else {
      updates.total_cost_actual = (op.quantity_actual || op.quantity_budgeted) * value;
    }

    await supabase.from('ot_operations').update(updates).eq('id', opId);
    fetchOperations();
  };

  const handleSaveAsTemplate = async () => {
    if (!workOrder || !specifications) return;

    const { error } = await supabase.from('ot_templates').insert({
      name: workOrder.product_name,
      description: workOrder.product_description,
      product_type: specifications.substrate_type,
      specifications: specifications as any,
      operations: operations.map(op => ({ code: op.operation_code, quantity: op.quantity_budgeted })) as any,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Plantilla guardada', description: 'La OT se ha guardado como plantilla' });
    }
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
              <Badge className={cn('text-sm', STATUS_CONFIG[workOrder.status]?.color)}>
                {STATUS_CONFIG[workOrder.status]?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">{workOrder.client_name} • {workOrder.product_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleSaveAsTemplate}>
            <Bookmark className="h-4 w-4" /> Guardar Plantilla
          </Button>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2"><FileText className="h-4 w-4" /> Resumen</TabsTrigger>
          <TabsTrigger value="operations" className="gap-2"><Calculator className="h-4 w-4" /> Operaciones</TabsTrigger>
          <TabsTrigger value="costs" className="gap-2"><TrendingUp className="h-4 w-4" /> Costos</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Historial</TabsTrigger>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Prioridad</span><span className="font-medium">{workOrder.priority}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Especificaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {specifications && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Dimensiones</span><span className="font-medium">{specifications.finished_width_cm}×{specifications.finished_height_cm} cm</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sustrato</span><span className="font-medium">{specifications.substrate_type} {specifications.substrate_weight_gsm}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Colores</span><span className="font-medium">{specifications.colors_front}/{specifications.colors_back}</span></div>
                    {specifications.finishing_operations && specifications.finishing_operations.length > 0 && (
                      <div><span className="text-muted-foreground">Terminaciones:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {specifications.finishing_operations.map((op: string) => (
                            <Badge key={op} variant="secondary" className="text-xs">{op}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles Técnicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {calculations && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Formato Hoja</span><span className="font-medium">{calculations.sheet_format}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Bocas</span><span className="font-medium">{calculations.bocas_per_sheet}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Hojas</span><span className="font-medium">{calculations.total_sheets?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sustrato</span><span className="font-medium">{calculations.substrate_kg} kg</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">CTP</span><span className="font-medium">{calculations.ctp_plates} planchas</span></div>
                  </>
                )}
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
                    const isEditable = ['in_production', 'completed'].includes(workOrder.status);
                    
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
                              onChange={(e) => handleUpdateActual(op.id, 'quantity_actual', parseFloat(e.target.value) || 0)}
                              className="w-20"
                              placeholder="-"
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
                          <Badge variant="outline" className="text-xs">
                            {op.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Operaciones</p>
                <p className="text-2xl font-bold">{operations.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-2xl font-bold text-success">
                  {operations.filter(o => o.status === 'completed').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">En Proceso</p>
                <p className="text-2xl font-bold text-warning">
                  {operations.filter(o => o.status === 'in_progress').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {operations.filter(o => o.status === 'pending').length}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cost Analysis Tab */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Presupuesto vs Real</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={60} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="Presupuesto" fill="hsl(var(--chart-1))" />
                      <Bar dataKey="Real" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis de Desvíos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {operations
                  .filter(op => {
                    const dev = getDeviation(op.total_cost_budgeted, op.total_cost_actual);
                    return dev !== null && Math.abs(dev) > 10;
                  })
                  .map(op => {
                    const dev = getDeviation(op.total_cost_budgeted, op.total_cost_actual)!;
                    return (
                      <div key={op.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{op.operation_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(op.total_cost_budgeted)} → {formatCurrency(op.total_cost_actual)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Motivo" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEVIATION_REASONS.map(reason => (
                                <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge className={cn(getDeviationColor(dev))}>
                            {dev > 0 ? '+' : ''}{dev.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                {operations.filter(op => {
                  const dev = getDeviation(op.total_cost_budgeted, op.total_cost_actual);
                  return dev !== null && Math.abs(dev) > 10;
                }).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
                    <p>Sin desvíos significativos (&gt;10%)</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Cambios</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-2" />
                  <p>No hay historial de cambios</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 p-3 rounded-lg border">
                      <div className="p-2 rounded-full bg-muted">
                        <History className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.action}</p>
                        {item.field_changed && (
                          <p className="text-sm text-muted-foreground">
                            Campo: {item.field_changed}
                          </p>
                        )}
                        {item.notes && <p className="text-sm mt-1">{item.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.changed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}