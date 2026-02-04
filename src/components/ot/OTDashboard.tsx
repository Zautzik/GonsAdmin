import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText } from 'lucide-react';
import { useOTFormStore } from '@/stores/otFormStore';
import { OTQuickFilters } from './OTQuickFilters';
import { OTCard } from './OTCard';
import { OTAdvancedFilters } from './OTAdvancedFilters';
import type { Tables } from '@/integrations/supabase/types';

type WorkOrder = Tables<'work_orders'>;

export default function OTDashboard() {
  const navigate = useNavigate();
  const resetForm = useOTFormStore((state) => state.resetForm);
  
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    fetchWorkOrders();
    
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

  const counts = useMemo(() => {
    const now = new Date();
    return {
      all: workOrders.length,
      draft: workOrders.filter((o) => o.status === 'draft').length,
      inProduction: workOrders.filter((o) => o.status === 'in_production').length,
      completed: workOrders.filter((o) => ['completed', 'delivered'].includes(o.status || '')).length,
      overdue: workOrders.filter((o) => {
        if (!o.delivery_date || o.status === 'completed' || o.status === 'delivered') return false;
        return new Date(o.delivery_date) < now;
      }).length,
    };
  }, [workOrders]);

  const filteredOrders = useMemo(() => {
    return workOrders.filter((order) => {
      // Search filter
      const matchesSearch = 
        !searchTerm ||
        order.ot_number.toString().includes(searchTerm) ||
        order.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Quick filter
      const now = new Date();
      switch (quickFilter) {
        case 'draft':
          if (order.status !== 'draft') return false;
          break;
        case 'in_production':
          if (order.status !== 'in_production') return false;
          break;
        case 'completed':
          if (!['completed', 'delivered'].includes(order.status || '')) return false;
          break;
        case 'overdue':
          if (!order.delivery_date || order.status === 'completed' || order.status === 'delivered') return false;
          if (new Date(order.delivery_date) >= now) return false;
          break;
      }

      // Priority filter
      if (priorityFilter !== 'all' && order.priority !== priorityFilter) {
        return false;
      }

      // Date range filter
      if (dateRange.from && order.delivery_date) {
        const deliveryDate = new Date(order.delivery_date);
        if (deliveryDate < dateRange.from) return false;
        if (dateRange.to && deliveryDate > dateRange.to) return false;
      }
      
      return true;
    });
  }, [workOrders, searchTerm, quickFilter, priorityFilter, dateRange]);

  const handleCreateNew = () => {
    resetForm();
    navigate('/ots/create');
  };

  const handleDuplicate = async (order: WorkOrder) => {
    console.log('Duplicating order:', order.ot_number);
  };

  const handleClearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setPriorityFilter('all');
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Trabajo</h1>
          <Button onClick={handleCreateNew} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nueva OT
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de OT, cliente o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Quick Filters */}
      <OTQuickFilters
        activeFilter={quickFilter}
        onFilterChange={setQuickFilter}
        counts={counts}
        onAdvancedFilters={() => setShowAdvancedFilters(true)}
      />

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No hay órdenes de trabajo</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {searchTerm || quickFilter !== 'all'
              ? 'No se encontraron OTs con los filtros seleccionados'
              : 'Crea tu primera orden de trabajo para comenzar'}
          </p>
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Crear primera OT
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.map((order) => (
            <OTCard
              key={order.id}
              order={order}
              onView={() => navigate(`/ots/${order.id}`)}
              onEdit={() => navigate(`/ots/${order.id}/edit`)}
              onDuplicate={() => handleDuplicate(order)}
              onPrint={() => window.print()}
            />
          ))}
        </div>
      )}

      {/* Advanced Filters Sheet */}
      <OTAdvancedFilters
        open={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        priority={priorityFilter}
        onPriorityChange={setPriorityFilter}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
