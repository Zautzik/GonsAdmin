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
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
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
  total_price: number;
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
  const [pricing, setPricing] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
    const startDate = subDays(new Date(), daysAgo).toISOString();

    const [woResult, opsResult, pricingResult] = await Promise.all([
      supabase.from('work_orders').select('*').gte('created_at', startDate),
      supabase.from('ot_operations').select('*').gte('created_at', startDate),
      supabase.from('ot_pricing').select('*').gte('created_at', startDate),
    ]);

    if (woResult.data) setWorkOrders(woResult.data);
    if (opsResult.data) setOperations(opsResult.data);
    if (pricingResult.data) setPricing(pricingResult.data);
    
    setLastUpdated(new Date());
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
  };

  // Calculate metrics
  const totalRevenue = workOrders.reduce((sum, wo) => sum + (wo.total_price || 0), 0);
  const totalCosts = pricing.reduce((sum, p) => sum + (p.subtotal || 0), 0);
  const avgMargin = pricing.length > 0 
    ? pricing.reduce((sum, p) => sum + (p.margin_percent || 0), 0) / pricing.length 
    : 0;
  
  const totalBudgeted = operations.reduce((sum, op) => sum + (op.total_cost_budgeted || 0), 0);
  const totalActual = operations.reduce((sum, op) => sum + (op.total_cost_actual || 0), 0);
  const avgDeviation = totalBudgeted > 0 ? ((totalActual - totalBudgeted) / totalBudgeted) * 100 : 0;

  const metrics: MetricCard[] = [
    {
      title: 'Total OTs',
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
      title: 'Margen Promedio',
      value: `${avgMargin.toFixed(1)}%`,
      change: -2.3,
      trend: 'down',
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

  // Cost categories over time (monthly)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subDays(new Date(), i * 30);
    const monthPricing = pricing.filter(p => {
      const pDate = new Date(p.created_at);
      return pDate.getMonth() === date.getMonth();
    });
    return {
      month: format(date, 'MMM', { locale: es }),
      Materiales: monthPricing.reduce((s, p) => s + (p.materials_cost || 0), 0) / 1000,
      'Mano de Obra': monthPricing.reduce((s, p) => s + (p.labor_cost || 0), 0) / 1000,
      Terceros: monthPricing.reduce((s, p) => s + (p.third_party_cost || 0), 0) / 1000,
      Otros: monthPricing.reduce((s, p) => s + (p.other_cost || 0), 0) / 1000,
    };
  }).reverse();

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
      budget: op.total_cost_budgeted / 1000,
      actual: op.total_cost_actual / 1000,
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

      <Tabs defaultValue="costs">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="costs" className="gap-2"><BarChart3 className="h-4 w-4" /> Costos</TabsTrigger>
          <TabsTrigger value="operations" className="gap-2"><Package className="h-4 w-4" /> Operaciones</TabsTrigger>
          <TabsTrigger value="products" className="gap-2"><PieChart className="h-4 w-4" /> Productos</TabsTrigger>
          <TabsTrigger value="clients" className="gap-2"><Users className="h-4 w-4" /> Clientes</TabsTrigger>
        </TabsList>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Costos por Categoría</CardTitle>
                <CardDescription>Evolución mensual (miles $CLP)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `$${v}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value * 1000)} />
                      <Legend />
                      <Bar dataKey="Materiales" stackId="a" fill={CATEGORY_COLORS[0]} />
                      <Bar dataKey="Mano de Obra" stackId="a" fill={CATEGORY_COLORS[1]} />
                      <Bar dataKey="Terceros" stackId="a" fill={CATEGORY_COLORS[2]} />
                      <Bar dataKey="Otros" stackId="a" fill={CATEGORY_COLORS[3]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

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
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value * 1000)}
                        content={({ payload }) => {
                          if (!payload?.[0]) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded p-2 shadow-lg text-sm">
                              <p className="font-medium">{data.code}</p>
                              <p>Presup: {formatCurrency(data.budget * 1000)}</p>
                              <p>Real: {formatCurrency(data.actual * 1000)}</p>
                              <p className={cn(getDeviationColor(data.deviation).replace('hsl(var(--', 'text-').replace('))', ''))}>
                                Desvío: {data.deviation.toFixed(1)}%
                              </p>
                            </div>
                          );
                        }}
                      />
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
          </div>
        </TabsContent>

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
                  {topOperations.map((op: any) => (
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="h-80">
            <Card>
              <CardHeader>
                <CardTitle>Desvío por Operación</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topOperations} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                    <YAxis type="category" dataKey="operation_code" width={60} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="deviation_percent" fill="hsl(var(--primary))">
                      {topOperations.map((entry: any, index: number) => (
                        <Cell key={index} fill={getDeviationColor(entry.deviation_percent)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Productos Más Rentables</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right"># OTs</TableHead>
                      <TableHead className="text-right">Ingresos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((p: any, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.type}</TableCell>
                        <TableCell className="text-right">{p.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={topProducts.slice(0, 5)}
                        dataKey="revenue"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {topProducts.slice(0, 5).map((_: any, index: number) => (
                          <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
              <CardTitle>Rentabilidad por Cliente</CardTitle>
              <CardDescription>Análisis de clientes por volumen y margen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-sm font-medium">Alto Valor, Alto Margen</span>
                  </div>
                  <p className="text-2xl font-bold text-success">
                    {Object.values(productProfitability).filter((c: any) => c.revenue > 1000000).length}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <span className="text-sm font-medium">Alto Valor, Bajo Margen</span>
                  </div>
                  <p className="text-2xl font-bold text-warning">0</p>
                </div>
                <div className="p-4 rounded-lg bg-info/10 border border-info/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-info" />
                    <span className="text-sm font-medium">Bajo Valor, Alto Margen</span>
                  </div>
                  <p className="text-2xl font-bold text-info">0</p>
                </div>
                <div className="p-4 rounded-lg bg-muted border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                    <span className="text-sm font-medium">Bajo Valor, Bajo Margen</span>
                  </div>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right"># OTs</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Segmento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.slice(0, 10).map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell className="font-medium">{wo.client_name}</TableCell>
                      <TableCell className="text-right">1</TableCell>
                      <TableCell className="text-right">{formatCurrency(wo.total_price)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-success/10 text-success">Premium</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
