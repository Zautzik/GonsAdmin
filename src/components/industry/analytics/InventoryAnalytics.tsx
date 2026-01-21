import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useInventoryStats, useInventoryItems } from '@/hooks/useInventoryData';
import { supabase } from '@/integrations/supabase/client';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  Package, TrendingUp, TrendingDown, Download, Calendar,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface MovementData {
  date: string;
  inbound: number;
  outbound: number;
  net: number;
}

interface ItemMovement {
  id: string;
  name: string;
  sku: string;
  category: string;
  movements: number;
  lastMovement: string;
  turnoverRate: number;
  value: number;
}

export default function InventoryAnalytics() {
  const { stats } = useInventoryStats();
  const { items } = useInventoryItems();
  const [timeRange, setTimeRange] = useState('month');
  const [movementData, setMovementData] = useState<MovementData[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; count: number }[]>([]);
  const [topItems, setTopItems] = useState<ItemMovement[]>([]);
  const [slowMovers, setSlowMovers] = useState<ItemMovement[]>([]);
  const [forecast, setForecast] = useState<{ name: string; current: number; daysRemaining: number; reorderDate: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const startDate = subDays(new Date(), days);

      // Fetch transactions
      const { data: transactions } = await supabase
        .from('inventory_transactions')
        .select('*, inventory(*)')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Group by date
      const byDate: Record<string, MovementData> = {};
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'dd/MM');
        byDate[date] = { date, inbound: 0, outbound: 0, net: 0 };
      }

      transactions?.forEach(tx => {
        const date = format(new Date(tx.created_at!), 'dd/MM');
        if (byDate[date]) {
          if (tx.transaction_type === 'purchase' || tx.transaction_type === 'adjustment') {
            byDate[date].inbound += tx.quantity;
          } else {
            byDate[date].outbound += Math.abs(tx.quantity);
          }
          byDate[date].net = byDate[date].inbound - byDate[date].outbound;
        }
      });
      setMovementData(Object.values(byDate));

      // Category distribution
      const categories: Record<string, { value: number; count: number }> = {};
      items?.forEach(item => {
        const cat = item.category || 'Sin categoría';
        if (!categories[cat]) categories[cat] = { value: 0, count: 0 };
        categories[cat].value += (item.current_stock || 0) * (item.unit_cost || 0);
        categories[cat].count++;
      });
      setCategoryData(Object.entries(categories).map(([name, data]) => ({ name, ...data })));

      // Item movements analysis
      const itemMovements: Record<string, { movements: number; lastDate: string }> = {};
      transactions?.forEach(tx => {
        const itemId = tx.inventory_id;
        if (!itemMovements[itemId]) {
          itemMovements[itemId] = { movements: 0, lastDate: tx.created_at! };
        }
        itemMovements[itemId].movements++;
        if (new Date(tx.created_at!) > new Date(itemMovements[itemId].lastDate)) {
          itemMovements[itemId].lastDate = tx.created_at!;
        }
      });

      const itemsWithMovements = items?.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category || 'Sin categoría',
        movements: itemMovements[item.id]?.movements || 0,
        lastMovement: itemMovements[item.id]?.lastDate || 'Nunca',
        turnoverRate: item.current_stock && item.current_stock > 0 
          ? (itemMovements[item.id]?.movements || 0) / item.current_stock * 100 
          : 0,
        value: (item.current_stock || 0) * (item.unit_cost || 0)
      })) || [];

      // Top movers
      setTopItems(itemsWithMovements.sort((a, b) => b.movements - a.movements).slice(0, 10));
      
      // Slow movers
      setSlowMovers(itemsWithMovements
        .filter(i => i.movements === 0 || i.turnoverRate < 5)
        .sort((a, b) => a.movements - b.movements)
        .slice(0, 10));

      // Forecast
      const forecastData = items?.filter(item => (item.current_stock || 0) > 0).map(item => {
        const avgDailyUsage = (itemMovements[item.id]?.movements || 1) / days;
        const daysRemaining = avgDailyUsage > 0 ? Math.floor((item.current_stock || 0) / avgDailyUsage) : 999;
        return {
          name: item.name,
          current: item.current_stock || 0,
          daysRemaining: Math.min(daysRemaining, 365),
          reorderDate: format(addDays(new Date(), Math.max(0, daysRemaining - (item.reorder_point || 7))), 'dd/MM/yyyy')
        };
      }).sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 10) || [];
      setForecast(forecastData);

      setLoading(false);
    };

    fetchData();
  }, [timeRange, items]);

  const stockHealthData = [
    { name: 'En Stock', value: stats?.totalItems || 0, color: 'hsl(var(--chart-1))' },
    { name: 'Stock Bajo', value: stats?.itemsToReorder || 0, color: 'hsl(var(--chart-4))' },
    { name: 'Sin Stock', value: stats?.outOfStock || 0, color: 'hsl(var(--destructive))' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics de Inventario</h1>
          <p className="text-muted-foreground">Análisis de stock, movimientos y proyecciones</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Último Mes</SelectItem>
              <SelectItem value="quarter">Último Trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Salud del Stock</TabsTrigger>
          <TabsTrigger value="movement">Movimientos</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="forecast">Proyección</TabsTrigger>
        </TabsList>

        {/* Stock Health */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stockHealthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {stockHealthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Valor por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" name="Valor Total" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ABC Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Análisis ABC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <h3 className="font-semibold text-green-600">Clase A (Alto Valor)</h3>
                  <p className="text-3xl font-bold mt-2">{Math.floor((items?.length || 0) * 0.2)}</p>
                  <p className="text-sm text-muted-foreground">20% items = 80% valor</p>
                  <Progress value={80} className="mt-2 h-2" />
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <h3 className="font-semibold text-yellow-600">Clase B (Medio)</h3>
                  <p className="text-3xl font-bold mt-2">{Math.floor((items?.length || 0) * 0.3)}</p>
                  <p className="text-sm text-muted-foreground">30% items = 15% valor</p>
                  <Progress value={15} className="mt-2 h-2" />
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <h3 className="font-semibold text-blue-600">Clase C (Bajo)</h3>
                  <p className="text-3xl font-bold mt-2">{Math.floor((items?.length || 0) * 0.5)}</p>
                  <p className="text-sm text-muted-foreground">50% items = 5% valor</p>
                  <Progress value={5} className="mt-2 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Items by Value */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 por Valor</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items?.sort((a, b) => ((b.current_stock || 0) * (b.unit_cost || 0)) - ((a.current_stock || 0) * (a.unit_cost || 0)))
                    .slice(0, 10)
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.current_stock}</TableCell>
                        <TableCell className="font-semibold">
                          ${((item.current_stock || 0) * (item.unit_cost || 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movement Analysis */}
        <TabsContent value="movement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos de Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={movementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="inbound" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" name="Entradas" />
                  <Area type="monotone" dataKey="outbound" stackId="2" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" name="Salidas" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Movimiento Rápido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Movimientos</TableHead>
                      <TableHead>Rotación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topItems.slice(0, 5).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/20 text-green-600">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            {item.movements}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.turnoverRate.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                  Movimiento Lento / Stock Muerto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Movimientos</TableHead>
                      <TableHead>Valor Inmovilizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowMovers.slice(0, 5).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            {item.movements}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-orange-600">${item.value.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Neto de Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={movementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="net" stroke="hsl(var(--primary))" name="Balance Neto" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Proyección de Agotamiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Días Restantes</TableHead>
                    <TableHead>Fecha Reorden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.current}</TableCell>
                      <TableCell>
                        <Badge variant={item.daysRemaining < 7 ? 'destructive' : item.daysRemaining < 14 ? 'secondary' : 'default'}>
                          {item.daysRemaining} días
                        </Badge>
                      </TableCell>
                      <TableCell>{item.reorderDate}</TableCell>
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
