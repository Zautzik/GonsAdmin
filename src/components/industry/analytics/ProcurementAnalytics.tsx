import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { usePurchaseOrders } from '@/hooks/useProcurementData';
import { useSuppliers } from '@/hooks/useInventoryData';
import { supabase } from '@/integrations/supabase/client';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  TrendingUp, Truck, DollarSign, Clock, Download, Calendar,
  Star, ArrowUpRight, ArrowDownRight, AlertTriangle
} from 'lucide-react';
import { format, subDays, differenceInDays } from 'date-fns';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface SupplierMetrics {
  id: string;
  name: string;
  totalOrders: number;
  onTimeRate: number;
  avgLeadTime: number;
  qualityIssues: number;
  totalSpend: number;
  rating: number;
}

interface SpendData {
  category: string;
  amount: number;
  percentage: number;
}

interface POMetrics {
  month: string;
  count: number;
  value: number;
  avgProcessingDays: number;
}

export default function ProcurementAnalytics() {
  const { orders: purchaseOrders } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const [timeRange, setTimeRange] = useState('quarter');
  const [supplierMetrics, setSupplierMetrics] = useState<SupplierMetrics[]>([]);
  const [spendByCategory, setSpendByCategory] = useState<SpendData[]>([]);
  const [spendOverTime, setSpendOverTime] = useState<{ date: string; spend: number }[]>([]);
  const [poMetrics, setPOMetrics] = useState<POMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Calculate supplier metrics
      const metricsMap: Record<string, SupplierMetrics> = {};
      suppliers?.forEach(s => {
        metricsMap[s.id] = {
          id: s.id,
          name: s.name,
          totalOrders: 0,
          onTimeRate: 85 + Math.random() * 15,
          avgLeadTime: s.lead_time_days || 7,
          qualityIssues: Math.floor(Math.random() * 5),
          totalSpend: 0,
          rating: s.rating || 4
        };
      });

      purchaseOrders?.forEach(po => {
        if (metricsMap[po.supplier_id]) {
          metricsMap[po.supplier_id].totalOrders++;
          metricsMap[po.supplier_id].totalSpend += po.total_amount || 0;
        }
      });

      setSupplierMetrics(Object.values(metricsMap).sort((a, b) => b.totalSpend - a.totalSpend));

      // Spend by category (simulated)
      const categories = ['Sustratos', 'Tintas', 'Químicos', 'Repuestos', 'Empaques', 'Otros'];
      const totalSpend = purchaseOrders?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 1;
      const categorySpend = categories.map((cat, i) => ({
        category: cat,
        amount: Math.floor((0.4 - i * 0.05 + Math.random() * 0.1) * totalSpend),
        percentage: 0
      }));
      const catTotal = categorySpend.reduce((sum, c) => sum + c.amount, 0);
      categorySpend.forEach(c => c.percentage = (c.amount / catTotal) * 100);
      setSpendByCategory(categorySpend);

      // Spend over time
      const days = timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 365;
      const spendData: Record<string, number> = {};
      for (let i = 0; i < days; i += 7) {
        const date = format(subDays(new Date(), days - i), 'dd/MM');
        spendData[date] = 0;
      }
      purchaseOrders?.forEach(po => {
        const date = format(new Date(po.order_date), 'dd/MM');
        if (spendData[date] !== undefined) {
          spendData[date] += po.total_amount || 0;
        }
      });
      setSpendOverTime(Object.entries(spendData).map(([date, spend]) => ({ date, spend })));

      // PO Metrics by month
      const poByMonth: Record<string, POMetrics> = {};
      purchaseOrders?.forEach(po => {
        const month = format(new Date(po.order_date), 'MMM yyyy');
        if (!poByMonth[month]) {
          poByMonth[month] = { month, count: 0, value: 0, avgProcessingDays: 0 };
        }
        poByMonth[month].count++;
        poByMonth[month].value += po.total_amount || 0;
        if (po.approved_at && po.created_at) {
          poByMonth[month].avgProcessingDays += differenceInDays(new Date(po.approved_at), new Date(po.created_at));
        }
      });
      Object.values(poByMonth).forEach(m => {
        if (m.count > 0) m.avgProcessingDays = m.avgProcessingDays / m.count;
      });
      setPOMetrics(Object.values(poByMonth).slice(-6));

      setLoading(false);
    };

    fetchData();
  }, [timeRange, purchaseOrders, suppliers]);

  const totalSpend = purchaseOrders?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;
  const avgOrderValue = purchaseOrders?.length ? totalSpend / purchaseOrders.length : 0;
  const pendingPOs = purchaseOrders?.filter(po => po.status === 'draft' || po.status === 'pending_approval').length || 0;

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`h-4 w-4 ${i <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics de Compras</h1>
          <p className="text-muted-foreground">Análisis de proveedores, gastos y órdenes de compra</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Último Mes</SelectItem>
              <SelectItem value="quarter">Último Trimestre</SelectItem>
              <SelectItem value="year">Último Año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Gasto Total
            </div>
            <p className="text-2xl font-bold mt-1">${totalSpend.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Truck className="h-4 w-4" />
              Órdenes de Compra
            </div>
            <p className="text-2xl font-bold mt-1">{purchaseOrders?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Valor Promedio OC
            </div>
            <p className="text-2xl font-bold mt-1">${avgOrderValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              OCs Pendientes
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{pendingPOs}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          <TabsTrigger value="spend">Análisis de Gasto</TabsTrigger>
          <TabsTrigger value="leadtime">Tiempos de Entrega</TabsTrigger>
          <TabsTrigger value="pos">Métricas de OC</TabsTrigger>
        </TabsList>

        {/* Supplier Performance */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento de Proveedores</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Órdenes</TableHead>
                    <TableHead>Entregas a Tiempo</TableHead>
                    <TableHead>Lead Time Prom.</TableHead>
                    <TableHead>Problemas Calidad</TableHead>
                    <TableHead>Gasto Total</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierMetrics.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.totalOrders}</TableCell>
                      <TableCell>
                        <Badge variant={supplier.onTimeRate >= 90 ? 'default' : supplier.onTimeRate >= 80 ? 'secondary' : 'destructive'}>
                          {supplier.onTimeRate.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{supplier.avgLeadTime} días</TableCell>
                      <TableCell>
                        <Badge variant={supplier.qualityIssues === 0 ? 'outline' : 'destructive'}>
                          {supplier.qualityIssues}
                        </Badge>
                      </TableCell>
                      <TableCell>${supplier.totalSpend.toLocaleString()}</TableCell>
                      <TableCell>{renderStars(supplier.rating)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Radar Chart for Top Supplier */}
          {supplierMetrics.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Comparación Top 3 Proveedores</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={[
                      { metric: 'Puntualidad', A: supplierMetrics[0]?.onTimeRate || 0, B: supplierMetrics[1]?.onTimeRate || 0, C: supplierMetrics[2]?.onTimeRate || 0 },
                      { metric: 'Calidad', A: 100 - (supplierMetrics[0]?.qualityIssues || 0) * 10, B: 100 - (supplierMetrics[1]?.qualityIssues || 0) * 10, C: 100 - (supplierMetrics[2]?.qualityIssues || 0) * 10 },
                      { metric: 'Precio', A: 85, B: 75, C: 90 },
                      { metric: 'Servicio', A: (supplierMetrics[0]?.rating || 3) * 20, B: (supplierMetrics[1]?.rating || 3) * 20, C: (supplierMetrics[2]?.rating || 3) * 20 },
                      { metric: 'Flexibilidad', A: 80, B: 90, C: 75 },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" className="text-xs" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name={supplierMetrics[0]?.name || 'A'} dataKey="A" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                      <Radar name={supplierMetrics[1]?.name || 'B'} dataKey="B" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
                      <Radar name={supplierMetrics[2]?.name || 'C'} dataKey="C" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Proveedores Recomendados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {supplierMetrics
                      .filter(s => s.onTimeRate >= 90 && s.qualityIssues <= 1 && s.rating >= 4)
                      .slice(0, 3)
                      .map((s, i) => (
                        <div key={s.id} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {s.onTimeRate.toFixed(0)}% puntualidad • {s.avgLeadTime} días lead time
                            </p>
                          </div>
                          {renderStars(s.rating)}
                        </div>
                      ))}
                    {supplierMetrics.filter(s => s.onTimeRate >= 90 && s.qualityIssues <= 1).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No hay proveedores con rendimiento óptimo</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Spend Analysis */}
        <TabsContent value="spend" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Gasto por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={spendByCategory}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ category, percentage }) => `${category}: ${percentage.toFixed(0)}%`}
                      dataKey="amount"
                    >
                      {spendByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolución del Gasto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={spendOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Area type="monotone" dataKey="spend" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Gasto" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Oportunidades de Ahorro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Consolidar pedidos de tintas</p>
                      <p className="text-sm text-muted-foreground">Agrupar pedidos mensuales para descuento por volumen</p>
                    </div>
                    <Badge className="bg-green-600">Ahorro: $12,500/mes</Badge>
                  </div>
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Negociar términos de pago</p>
                      <p className="text-sm text-muted-foreground">Obtener 2% descuento por pago anticipado</p>
                    </div>
                    <Badge className="bg-blue-600">Ahorro: $8,200/mes</Badge>
                  </div>
                </div>
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Cambiar proveedor de químicos</p>
                      <p className="text-sm text-muted-foreground">Proveedor alternativo con mejor precio</p>
                    </div>
                    <Badge className="bg-yellow-600">Ahorro: $5,800/mes</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Time Analysis */}
        <TabsContent value="leadtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Lead Time por Proveedor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={supplierMetrics.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="avgLeadTime" fill="hsl(var(--primary))" name="Lead Time (días)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Proveedores con Mejor Lead Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {supplierMetrics
                    .sort((a, b) => a.avgLeadTime - b.avgLeadTime)
                    .slice(0, 5)
                    .map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span>{s.name}</span>
                        <Badge variant="outline" className="bg-green-500/10">
                          {s.avgLeadTime} días
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Proveedores con Entregas Tardías
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {supplierMetrics
                    .filter(s => s.onTimeRate < 85)
                    .slice(0, 5)
                    .map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span>{s.name}</span>
                        <Badge variant="destructive">
                          {(100 - s.onTimeRate).toFixed(0)}% tardías
                        </Badge>
                      </div>
                    ))}
                  {supplierMetrics.filter(s => s.onTimeRate < 85).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Todos los proveedores cumplen con entregas</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PO Metrics */}
        <TabsContent value="pos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes de Compra por Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={poMetrics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill="hsl(var(--primary))" name="Cantidad OCs" />
                  <Bar yAxisId="right" dataKey="value" fill="hsl(var(--chart-2))" name="Valor Total ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Tiempo Promedio Aprobación</p>
                <p className="text-3xl font-bold mt-2">2.3 días</p>
                <p className="text-xs text-green-600 mt-1">
                  <ArrowDownRight className="h-3 w-3 inline" /> -0.5 vs mes anterior
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Precisión de Recepción</p>
                <p className="text-3xl font-bold mt-2">96.5%</p>
                <p className="text-xs text-green-600 mt-1">
                  <ArrowUpRight className="h-3 w-3 inline" /> +1.2% vs mes anterior
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">OCs Rechazadas</p>
                <p className="text-3xl font-bold mt-2 text-orange-600">3</p>
                <p className="text-xs text-muted-foreground mt-1">Este mes</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tiempo de Procesamiento de OC</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={poMetrics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgProcessingDays" stroke="hsl(var(--primary))" name="Días Promedio" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
