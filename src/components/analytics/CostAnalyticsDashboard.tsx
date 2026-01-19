import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, DollarSign, Percent, FileText, 
  BarChart3, PieChart, Download, RefreshCw, Users, Package
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ScatterChart, Scatter, ZAxis, Cell, PieChart as RechartsPie, Pie
} from 'recharts';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: typeof DollarSign;
}

interface WorkOrderData {
  id: string;
  ot_number: number;
  client_name: string;
  product_name: string;
  total_price: number | null;
  cost_budgeted: number | null;
  cost_actual: number | null;
  status: string;
  created_at: string;
}

interface OperationStats {
  operation_code: string;
  times_used: number;
  avg_budget: number;
  avg_actual: number;
  deviation_percent: number;
  total_variance: number;
}

const CATEGORY_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function CostAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [workOrders, setWorkOrders] = useState<WorkOrderData[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
    const startDate = subDays(new Date(), daysAgo).toISOString();

    const [woResult, opsResult] = await Promise.all([
      supabase.from('work_orders').select('*').gte('created_at', startDate),
      supabase.from('operations').select('*').gte('created_at', startDate),
    ]);

    if (woResult.data) setWorkOrders(woResult.data);
    if (opsResult.data) setOperations(opsResult.data);
    
    setLastUpdated(new Date());
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
  };

  // Calculate metrics
  const totalRevenue = workOrders.reduce((sum, wo) => sum + (wo.total_price || 0), 0);
  const totalBudgeted = operations.reduce((sum, op) => sum + (op.total_cost_budgeted || 0), 0);
  const totalActual = operations.reduce((sum, op) => sum + (op.total_cost_actual || 0), 0);
  const avgDeviation = totalBudgeted > 0 ? ((totalActual - totalBudgeted) / totalBudgeted) * 100 : 0;

  const metrics: MetricCard[] = [
    {
      title: 'Total Work Orders',
      value: workOrders.length,
      change: 12,
      trend: 'up',
      icon: FileText,
    },
    {
      title: 'Ingresos',
      value: formatCurrency(totalRevenue),
      change: 8.5,
      trend: 'up',
      icon: DollarSign,
    },
    {
      title: 'Costo Presupuestado',
      value: formatCurrency(totalBudgeted),
      change: 5.2,
      trend: 'up',
      icon: Percent,
    },
    {
      title: 'Desvío Promedio',
      value: `${avgDeviation.toFixed(1)}%`,
      change: avgDeviation,
      trend: avgDeviation < 5 ? 'up' : 'down',
      icon: TrendingUp,
    },
  ];

  // Operations analysis
  const operationStats = operations.reduce((acc, op) => {
    const code = op.operation_code;
    if (!acc[code]) {
      acc[code] = { 
        operation_code: code, 
        times_used: 0, 
        total_budget: 0, 
        total_actual: 0,
      };
    }
    acc[code].times_used++;
    acc[code].total_budget += op.total_cost_budgeted || 0;
    acc[code].total_actual += op.total_cost_actual || 0;
    return acc;
  }, {} as Record<string, any>);

  const topOperations = Object.values(operationStats)
    .map((op: any) => ({
      ...op,
      avg_budget: op.total_budget / op.times_used,
      avg_actual: op.total_actual / op.times_used,
      deviation_percent: op.total_budget > 0 
        ? ((op.total_actual - op.total_budget) / op.total_budget) * 100 
        : 0,
      total_variance: op.total_actual - op.total_budget,
    }))
    .sort((a: any, b: any) => Math.abs(b.deviation_percent) - Math.abs(a.deviation_percent))
    .slice(0, 10);

  // Scatter plot data (Budget vs Actual)
  const scatterData = operations
    .filter(op => op.total_cost_actual != null)
    .map(op => ({
      budget: (op.total_cost_budgeted || 0) / 1000,
      actual: (op.total_cost_actual || 0) / 1000,
      deviation: op.total_cost_budgeted > 0 
        ? ((op.total_cost_actual - op.total_cost_budgeted) / op.total_cost_budgeted) * 100 
        : 0,
      code: op.operation_code,
    }));

  const getDeviationColor = (dev: number) => {
    if (Math.abs(dev) < 5) return 'hsl(var(--success))';
    if (Math.abs(dev) < 15) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  // Profitability by product
  const productProfitability = workOrders.reduce((acc, wo) => {
    const type = wo.product_name || 'Otros';
    if (!acc[type]) {
      acc[type] = { type, count: 0, revenue: 0, profit: 0 };
    }
    acc[type].count++;
    acc[type].revenue += wo.total_price || 0;
    return acc;
  }, {} as Record<string, any>);

  const topProducts = Object.values(productProfitability)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><div className="h-80 bg-muted rounded" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics de Costos</h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: {format(lastUpdated, 'HH:mm:ss', { locale: es })}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 días</SelectItem>
              <SelectItem value="30d">30 días</SelectItem>
              <SelectItem value="90d">90 días</SelectItem>
              <SelectItem value="365d">1 año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <p className="text-2xl font-bold mt-1">{metric.value}</p>
                    <div className={cn(
                      'flex items-center gap-1 text-xs mt-1',
                      metric.trend === 'up' ? 'text-success' : metric.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {metric.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="operations">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="operations" className="gap-2"><Package className="h-4 w-4" /> Operaciones</TabsTrigger>
          <TabsTrigger value="products" className="gap-2"><PieChart className="h-4 w-4" /> Productos</TabsTrigger>
          <TabsTrigger value="clients" className="gap-2"><Users className="h-4 w-4" /> Clientes</TabsTrigger>
        </TabsList>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Operaciones por Desvío</CardTitle>
              <CardDescription>Análisis de varianza presupuesto vs real</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operación</TableHead>
                    <TableHead className="text-right">Veces Usado</TableHead>
                    <TableHead className="text-right">Prom. Presup.</TableHead>
                    <TableHead className="text-right">Prom. Real</TableHead>
                    <TableHead className="text-right">Desvío %</TableHead>
                    <TableHead className="text-right">Varianza Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topOperations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No hay datos de operaciones en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    topOperations.map((op: any) => (
                      <TableRow key={op.operation_code}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{op.operation_code}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{op.times_used}</TableCell>
                        <TableCell className="text-right">{formatCurrency(op.avg_budget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(op.avg_actual)}</TableCell>
                        <TableCell className={cn(
                          'text-right font-medium',
                          Math.abs(op.deviation_percent) < 5 ? 'text-success' :
                          Math.abs(op.deviation_percent) < 15 ? 'text-warning' : 'text-destructive'
                        )}>
                          {op.deviation_percent > 0 ? '+' : ''}{op.deviation_percent.toFixed(1)}%
                        </TableCell>
                        <TableCell className={cn(
                          'text-right',
                          op.total_variance > 0 ? 'text-destructive' : 'text-success'
                        )}>
                          {formatCurrency(op.total_variance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {scatterData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Presupuesto vs Real</CardTitle>
                <CardDescription>Scatter plot por operación</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <XAxis type="number" dataKey="budget" name="Presupuesto" unit="k" />
                      <YAxis type="number" dataKey="actual" name="Real" unit="k" />
                      <ZAxis type="number" dataKey="deviation" range={[50, 400]} />
                      <Tooltip formatter={(value: number) => formatCurrency(value * 1000)} />
                      <Scatter data={scatterData}>
                        {scatterData.map((entry, index) => (
                          <Cell key={index} fill={getDeviationColor(entry.deviation)} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos por Producto</CardTitle>
                <CardDescription>Top productos por valor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="type" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por Producto</CardTitle>
                <CardDescription>Cantidad de órdenes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={topProducts}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="count"
                        nameKey="type"
                        label={({ type, count }) => `${type}: ${count}`}
                      >
                        {topProducts.map((_, index) => (
                          <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis por Cliente</CardTitle>
              <CardDescription>Próximamente...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <p>Análisis de clientes en desarrollo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
