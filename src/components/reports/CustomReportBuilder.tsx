import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  FileDown, Table2, BarChart3, Filter, RefreshCw, 
  Database, Calendar, ChevronRight, X, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

interface ReportField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'status';
}

interface DataSource {
  id: string;
  name: string;
  table: string;
  fields: ReportField[];
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'workers',
    name: 'Workers',
    table: 'workers',
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'quality_score', label: 'Quality Score', type: 'number' },
      { name: 'speed_score', label: 'Speed Score', type: 'number' },
      { name: 'overall_rating', label: 'Overall Rating', type: 'number' },
      { name: 'attendance_score', label: 'Attendance', type: 'number' },
    ],
  },
  {
    id: 'ots',
    name: 'Work Orders',
    table: 'ots',
    fields: [
      { name: 'ot_number', label: 'OT Number', type: 'text' },
      { name: 'client_name', label: 'Client', type: 'text' },
      { name: 'status', label: 'Status', type: 'status' },
      { name: 'quantity', label: 'Quantity', type: 'number' },
      { name: 'priority', label: 'Priority', type: 'number' },
      { name: 'created_at', label: 'Created', type: 'date' },
    ],
  },
  {
    id: 'machines',
    name: 'Machines',
    table: 'machines',
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'type', label: 'Type', type: 'text' },
      { name: 'status', label: 'Status', type: 'status' },
    ],
  },
  {
    id: 'progress',
    name: 'Progress Submissions',
    table: 'progress_submissions',
    fields: [
      { name: 'worker_phone', label: 'Worker Phone', type: 'text' },
      { name: 'submission_type', label: 'Type', type: 'status' },
      { name: 'units_reported', label: 'Units', type: 'number' },
      { name: 'time_reported_minutes', label: 'Time (min)', type: 'number' },
      { name: 'status', label: 'Status', type: 'status' },
      { name: 'submitted_at', label: 'Submitted', type: 'date' },
    ],
  },
];

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--supervisor))',
  'hsl(var(--manager))',
  'hsl(var(--accent))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
];

export function CustomReportBuilder() {
  const { language } = useLanguage();
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [groupByField, setGroupByField] = useState<string>('');
  const [chartType, setChartType] = useState<'table' | 'bar' | 'pie' | 'line'>('table');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleSourceChange = (sourceId: string) => {
    const source = DATA_SOURCES.find(s => s.id === sourceId);
    setSelectedSource(source || null);
    setSelectedFields([]);
    setGroupByField('');
    setData([]);
  };

  const toggleField = (fieldName: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldName)
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const generateReport = async () => {
    if (!selectedSource || selectedFields.length === 0) {
      toast.error(language === 'es' ? 'Selecciona campos para el reporte' : 'Select fields for the report');
      return;
    }

    setLoading(true);

    try {
      let query = supabase
        .from(selectedSource.table as any)
        .select(selectedFields.join(','));

      // Apply date filters for tables with date fields
      const hasDateField = selectedSource.fields.some(f => f.type === 'date');
      if (hasDateField && dateFrom) {
        const dateField = selectedSource.fields.find(f => f.type === 'date')?.name || 'created_at';
        query = query.gte(dateField, dateFrom);
      }
      if (hasDateField && dateTo) {
        const dateField = selectedSource.fields.find(f => f.type === 'date')?.name || 'created_at';
        query = query.lte(dateField, dateTo);
      }

      const { data: result, error } = await query.limit(500);

      if (error) throw error;

      // Group data if groupBy is selected
      if (groupByField && result) {
        const grouped = result.reduce((acc: any, item: any) => {
          const key = item[groupByField] || 'Unknown';
          if (!acc[key]) {
            acc[key] = { [groupByField]: key, count: 0 };
            // Initialize numeric aggregations
            selectedFields.forEach(f => {
              const fieldDef = selectedSource.fields.find(fd => fd.name === f);
              if (fieldDef?.type === 'number') {
                acc[key][`sum_${f}`] = 0;
                acc[key][`avg_${f}`] = 0;
              }
            });
          }
          acc[key].count++;
          // Aggregate numeric fields
          selectedFields.forEach(f => {
            const fieldDef = selectedSource.fields.find(fd => fd.name === f);
            if (fieldDef?.type === 'number' && item[f]) {
              acc[key][`sum_${f}`] += Number(item[f]);
              acc[key][`avg_${f}`] = Math.round(acc[key][`sum_${f}`] / acc[key].count);
            }
          });
          return acc;
        }, {});
        setData(Object.values(grouped));
      } else {
        setData(result || []);
      }

      toast.success(language === 'es' ? 'Reporte generado' : 'Report generated');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${selectedSource?.id}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(language === 'es' ? 'CSV exportado' : 'CSV exported');
  };

  const renderChart = () => {
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-3 opacity-50" />
          <p>{language === 'es' ? 'Genera un reporte para ver datos' : 'Generate a report to see data'}</p>
        </div>
      );
    }

    const numericField = selectedFields.find(f => 
      selectedSource?.fields.find(fd => fd.name === f)?.type === 'number'
    );
    const dataKey = groupByField ? `avg_${numericField}` : numericField;
    const nameKey = groupByField || selectedFields[0];

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={nameKey} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              {groupByField ? (
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              ) : (
                <Bar dataKey={dataKey || 'count'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.slice(0, 8)}
                dataKey="count"
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, count }) => `${name}: ${count}`}
              >
                {data.slice(0, 8).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.slice(0, 30)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={nameKey} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey={groupByField ? 'count' : (dataKey || 'count')} 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ScrollArea className="h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  {Object.keys(data[0] || {}).map(key => (
                    <th key={key} className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                    {Object.entries(row).map(([key, value], j) => (
                      <td key={j} className="py-2.5 px-4">
                        {key === 'status' || key === 'submission_type' ? (
                          <Badge variant="secondary" className="font-normal">
                            {String(value)}
                          </Badge>
                        ) : typeof value === 'number' ? (
                          <span className="font-medium">{value.toLocaleString()}</span>
                        ) : (
                          String(value || '-')
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Source Selection */}
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              {language === 'es' ? 'Fuente de Datos' : 'Data Source'}
            </CardTitle>
            <CardDescription>
              {language === 'es' ? 'Selecciona qué datos analizar' : 'Select what data to analyze'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select onValueChange={handleSourceChange} value={selectedSource?.id}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'es' ? 'Elegir fuente...' : 'Choose source...'} />
              </SelectTrigger>
              <SelectContent>
                {DATA_SOURCES.map(source => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedSource && (
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {language === 'es' ? 'Campos disponibles' : 'Available Fields'}
                </Label>
                <div className="space-y-2">
                  {selectedSource.fields.map(field => (
                    <div key={field.name} className="flex items-center gap-2">
                      <Checkbox
                        id={field.name}
                        checked={selectedFields.includes(field.name)}
                        onCheckedChange={() => toggleField(field.name)}
                      />
                      <label htmlFor={field.name} className="text-sm cursor-pointer flex-1">
                        {field.label}
                      </label>
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {field.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grouping & Filters */}
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              {language === 'es' ? 'Agrupación y Filtros' : 'Grouping & Filters'}
            </CardTitle>
            <CardDescription>
              {language === 'es' ? 'Organiza y filtra los datos' : 'Organize and filter data'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSource && (
              <>
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Agrupar por' : 'Group by'}</Label>
                  <Select value={groupByField} onValueChange={setGroupByField}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'es' ? 'Sin agrupar' : 'No grouping'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{language === 'es' ? 'Sin agrupar' : 'No grouping'}</SelectItem>
                      {selectedSource.fields
                        .filter(f => f.type === 'text' || f.type === 'status')
                        .map(field => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {language === 'es' ? 'Rango de fechas' : 'Date Range'}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      placeholder="To"
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Visualization */}
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {language === 'es' ? 'Visualización' : 'Visualization'}
            </CardTitle>
            <CardDescription>
              {language === 'es' ? 'Elige cómo mostrar los datos' : 'Choose how to display data'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'table', icon: Table2, label: language === 'es' ? 'Tabla' : 'Table' },
                { value: 'bar', icon: BarChart3, label: language === 'es' ? 'Barras' : 'Bar' },
                { value: 'pie', icon: BarChart3, label: language === 'es' ? 'Pastel' : 'Pie' },
                { value: 'line', icon: BarChart3, label: language === 'es' ? 'Línea' : 'Line' },
              ].map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  variant={chartType === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType(value as any)}
                  className="justify-start"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </Button>
              ))}
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={generateReport}
                disabled={!selectedSource || selectedFields.length === 0 || loading}
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {language === 'es' ? 'Generar' : 'Generate'}
              </Button>
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={data.length === 0}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <Card className="card-hover">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">
              {language === 'es' ? 'Resultados' : 'Results'}
            </CardTitle>
            <CardDescription>
              {data.length > 0 
                ? `${data.length} ${language === 'es' ? 'registros encontrados' : 'records found'}`
                : language === 'es' ? 'Sin datos' : 'No data'
              }
            </CardDescription>
          </div>
          {selectedFields.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {selectedFields.map(field => (
                <Badge key={field} variant="secondary" className="text-xs">
                  {selectedSource?.fields.find(f => f.name === field)?.label || field}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>
    </div>
  );
}