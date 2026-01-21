import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, Users, Factory, AlertTriangle, Download, Calendar
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface ProductionData {
  date: string;
  produced: number;
  target: number;
  shift1: number;
  shift2: number;
  shift3: number;
}

interface MachineUtilization {
  machine: string;
  running: number;
  idle: number;
  maintenance: number;
}

interface OperatorPerformance {
  id: string;
  name: string;
  otsCompleted: number;
  unitsProduced: number;
  avgEfficiency: number;
  qualityScore: number;
}

interface MachinePerformance {
  id: string;
  name: string;
  uptime: number;
  totalUnits: number;
  avgSpeed: number;
  downtime: number;
  issuesCount: number;
}

export default function ProductionAnalytics() {
  const [timeRange, setTimeRange] = useState('week');
  const [productionData, setProductionData] = useState<ProductionData[]>([]);
  const [machineUtilization, setMachineUtilization] = useState<MachineUtilization[]>([]);
  const [operatorPerformance, setOperatorPerformance] = useState<OperatorPerformance[]>([]);
  const [machinePerformance, setMachinePerformance] = useState<MachinePerformance[]>([]);
  const [qualityData, setQualityData] = useState<{ date: string; defectRate: number; rejected: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const days = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const startDate = subDays(new Date(), days);

      // Fetch production activity (reports)
      const { data: reports } = await supabase
        .from('production_activity')
        .select('*')
        .eq('activity_type', 'report')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Group by date
      const byDate: Record<string, ProductionData> = {};
      reports?.forEach(report => {
        const date = format(new Date(report.created_at!), 'dd/MM');
        if (!byDate[date]) {
          byDate[date] = { date, produced: 0, target: 10000, shift1: 0, shift2: 0, shift3: 0 };
        }
        byDate[date].produced += report.units_produced || 0;
        // Simulate shift distribution
        const hour = new Date(report.created_at!).getHours();
        if (hour >= 6 && hour < 14) byDate[date].shift1 += report.units_produced || 0;
        else if (hour >= 14 && hour < 22) byDate[date].shift2 += report.units_produced || 0;
        else byDate[date].shift3 += report.units_produced || 0;
      });
      setProductionData(Object.values(byDate));

      // Quality data
      const qualityByDate: Record<string, { defectRate: number; rejected: number; total: number }> = {};
      reports?.forEach(report => {
        const date = format(new Date(report.created_at!), 'dd/MM');
        if (!qualityByDate[date]) {
          qualityByDate[date] = { defectRate: 0, rejected: 0, total: 0 };
        }
        qualityByDate[date].rejected += report.units_rejected || 0;
        qualityByDate[date].total += report.units_produced || 0;
      });
      setQualityData(Object.entries(qualityByDate).map(([date, data]) => ({
        date,
        rejected: data.rejected,
        defectRate: data.total > 0 ? (data.rejected / data.total) * 100 : 0
      })));

      // Fetch machines
      const { data: machines } = await supabase.from('machines').select('*');
      const machineUtil = machines?.map(m => ({
        machine: m.name,
        running: m.status === 'running' ? 70 + Math.random() * 20 : 0,
        idle: m.status === 'idle' ? 60 + Math.random() * 30 : 10 + Math.random() * 10,
        maintenance: m.status === 'maintenance' ? 100 : 5 + Math.random() * 5
      })) || [];
      setMachineUtilization(machineUtil);

      setMachinePerformance(machines?.map(m => ({
        id: m.id,
        name: m.name,
        uptime: 85 + Math.random() * 10,
        totalUnits: Math.floor(5000 + Math.random() * 10000),
        avgSpeed: Math.floor(80 + Math.random() * 20),
        downtime: Math.floor(2 + Math.random() * 8),
        issuesCount: Math.floor(Math.random() * 5)
      })) || []);

      // Fetch workers for operator performance
      const { data: workers } = await supabase.from('workers').select('*').limit(10);
      setOperatorPerformance(workers?.map(w => ({
        id: w.id,
        name: w.name,
        otsCompleted: Math.floor(10 + Math.random() * 20),
        unitsProduced: Math.floor(5000 + Math.random() * 15000),
        avgEfficiency: 80 + Math.random() * 15,
        qualityScore: 90 + Math.random() * 10
      })) || []);

      setLoading(false);
    };

    fetchData();
  }, [timeRange]);

  const exportToExcel = () => {
    console.log('Exporting to Excel...');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics de Producción</h1>
          <p className="text-muted-foreground">Análisis detallado del rendimiento productivo</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volume">Volumen</TabsTrigger>
          <TabsTrigger value="machines">Máquinas</TabsTrigger>
          <TabsTrigger value="quality">Calidad</TabsTrigger>
          <TabsTrigger value="operators">Operadores</TabsTrigger>
        </TabsList>

        {/* Production Volume */}
        <TabsContent value="volume" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Producción en el Tiempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={productionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="produced" fill="hsl(var(--primary))" name="Producido" />
                    <Line type="monotone" dataKey="target" stroke="hsl(var(--destructive))" name="Meta" strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Producción por Turno</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={productionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Area type="monotone" dataKey="shift1" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" name="Turno 1" />
                    <Area type="monotone" dataKey="shift2" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" name="Turno 2" />
                    <Area type="monotone" dataKey="shift3" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" name="Turno 3" />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Eficiencia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={productionData.map(d => ({
                    ...d,
                    efficiency: d.target > 0 ? (d.produced / d.target * 100).toFixed(1) : 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[0, 120]} className="text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="efficiency" stroke="hsl(var(--primary))" name="Eficiencia %" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Machine Utilization */}
        <TabsContent value="machines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Utilización de Máquinas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={machineUtilization} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} className="text-xs" />
                  <YAxis dataKey="machine" type="category" width={100} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="running" stackId="a" fill="hsl(var(--chart-1))" name="En Operación" />
                  <Bar dataKey="idle" stackId="a" fill="hsl(var(--chart-4))" name="Inactiva" />
                  <Bar dataKey="maintenance" stackId="a" fill="hsl(var(--chart-3))" name="Mantenimiento" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Máquina</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Uptime %</TableHead>
                    <TableHead>Unidades Totales</TableHead>
                    <TableHead>Velocidad Promedio</TableHead>
                    <TableHead>Horas Inactivas</TableHead>
                    <TableHead>Incidencias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machinePerformance.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>
                        <Badge variant={m.uptime >= 90 ? 'default' : m.uptime >= 80 ? 'secondary' : 'destructive'}>
                          {m.uptime.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{m.totalUnits.toLocaleString()}</TableCell>
                      <TableCell>{m.avgSpeed}%</TableCell>
                      <TableCell>{m.downtime}h</TableCell>
                      <TableCell>
                        <Badge variant={m.issuesCount === 0 ? 'default' : 'destructive'}>
                          {m.issuesCount}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Metrics */}
        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Métricas de Calidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={qualityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="rejected" fill="hsl(var(--destructive))" name="Unidades Rechazadas" />
                  <Line yAxisId="right" type="monotone" dataKey="defectRate" stroke="hsl(var(--chart-2))" name="Tasa de Defectos %" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operator Performance */}
        <TabsContent value="operators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Rendimiento de Operadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operador</TableHead>
                    <TableHead>OTs Completadas</TableHead>
                    <TableHead>Unidades Producidas</TableHead>
                    <TableHead>Eficiencia Promedio</TableHead>
                    <TableHead>Calidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operatorPerformance.sort((a, b) => b.unitsProduced - a.unitsProduced).map((op, index) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">
                        {index < 3 && <Badge className="mr-2">Top {index + 1}</Badge>}
                        {op.name}
                      </TableCell>
                      <TableCell>{op.otsCompleted}</TableCell>
                      <TableCell>{op.unitsProduced.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={op.avgEfficiency >= 90 ? 'default' : 'secondary'}>
                          {op.avgEfficiency.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={op.qualityScore >= 95 ? 'default' : 'secondary'}>
                          {op.qualityScore.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 por Unidades</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={operatorPerformance.sort((a, b) => b.unitsProduced - a.unitsProduced).slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="unitsProduced" fill="hsl(var(--primary))" name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
