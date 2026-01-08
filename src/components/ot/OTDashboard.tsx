import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Plus, Search, FileText, Calendar as CalendarIcon, 
  Eye, Edit, Copy, Printer, Package, TrendingUp, TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useOTFormStore } from '@/stores/otFormStore';

interface WorkOrder {
  id: string;
  ot_number: number;
  client_name: string;
  product_name: string;
  quantity: number;
  status: string;
  priority: number;
  delivery_date: string | null;
  total_price: number;
  unit_price: number;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  approved: { label: 'Aprobada', color: 'bg-success/20 text-success' },
  in_production: { label: 'En Producción', color: 'bg-warning/20 text-warning' },
  completed: { label: 'Completada', color: 'bg-info/20 text-info' },
  delivered: { label: 'Entregada', color: 'bg-primary/20 text-primary' },
  cancelled: { label: 'Cancelada', color: 'bg-destructive/20 text-destructive' },
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Urgente', color: 'text-destructive' },
  2: { label: 'Alta', color: 'text-warning' },
  3: { label: 'Normal', color: 'text-muted-foreground' },
  4: { label: 'Baja', color: 'text-info' },
  5: { label: 'Mínima', color: 'text-muted' },
};

export default function OTDashboard() {
  const navigate = useNavigate();
  const resetForm = useOTFormStore((state) => state.resetForm);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    fetchWorkOrders();
    
    // Real-time subscription
    const channel = supabase
      .channel('work_orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_orders' },
        () => fetchWorkOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWorkOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setWorkOrders(data);
    }
    setLoading(false);
  };

  const filteredOrders = workOrders.filter((order) => {
    const matchesSearch = 
      order.ot_number.toString().includes(searchTerm) ||
      order.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateRange.from && order.delivery_date) {
      const deliveryDate = new Date(order.delivery_date);
      matchesDate = deliveryDate >= dateRange.from;
      if (dateRange.to) {
        matchesDate = matchesDate && deliveryDate <= dateRange.to;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleCreateNew = () => {
    resetForm();
    navigate('/ots/create');
  };

  const handleDuplicate = async (order: WorkOrder) => {
    // TODO: Implement duplication logic
    console.log('Duplicating order:', order.ot_number);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const stats = {
    total: workOrders.length,
    draft: workOrders.filter((o) => o.status === 'draft').length,
    inProduction: workOrders.filter((o) => o.status === 'in_production').length,
    completed: workOrders.filter((o) => ['completed', 'delivered'].includes(o.status)).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground">Gestiona las OTs de producción</p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva OT
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total OTs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Edit className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-xs text-muted-foreground">Borradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Package className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProduction}</p>
                <p className="text-xs text-muted-foreground">En Producción</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por OT#, cliente o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd/MM', { locale: es })} - {format(dateRange.to, 'dd/MM', { locale: es })}
                      </>
                    ) : (
                      format(dateRange.from, 'dd/MM/yyyy', { locale: es })
                    )
                  ) : (
                    'Fecha entrega'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* OT Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-4" />
                <div className="h-6 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay órdenes de trabajo</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron OTs con los filtros seleccionados'
                : 'Crea tu primera OT para comenzar'}
            </p>
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear primera OT
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="card-hover group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">OT #{order.ot_number}</p>
                    <CardTitle className="text-lg mt-1">{order.product_name}</CardTitle>
                  </div>
                  <Badge className={cn('text-xs', STATUS_CONFIG[order.status]?.color)}>
                    {STATUS_CONFIG[order.status]?.label || order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{order.client_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cantidad</span>
                    <span className="font-medium">{order.quantity.toLocaleString()}</span>
                  </div>
                  {order.delivery_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Entrega</span>
                      <span className="font-medium">
                        {format(new Date(order.delivery_date), 'dd/MM/yyyy', { locale: es })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prioridad</span>
                    <span className={cn('font-medium', PRIORITY_CONFIG[order.priority]?.color)}>
                      {PRIORITY_CONFIG[order.priority]?.label || 'Normal'}
                    </span>
                  </div>
                </div>

                {/* Budget vs Actual Indicator */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{formatCurrency(order.total_price)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(order.unit_price)}/u
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => navigate(`/ots/${order.id}`)}
                  >
                    <Eye className="h-3 w-3" /> Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => navigate(`/ots/${order.id}/edit`)}
                  >
                    <Edit className="h-3 w-3" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicate(order)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
