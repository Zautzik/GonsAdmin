import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOTFormStore } from '@/stores/otFormStore';
import { OTQuickFilters } from './OTQuickFilters';
import { OTCard } from './OTCard';
import { OTAdvancedFilters } from './OTAdvancedFilters';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type WorkOrder = Tables<'work_orders'>;

const ITEMS_PER_PAGE = 10;

export default function OTDashboard() {
  const navigate = useNavigate();
  const resetForm = useOTFormStore((state) => state.resetForm);
  
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, quickFilter, priorityFilter, dateRange]);

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

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const handleCreateNew = () => {
    resetForm();
    navigate('/ots/create');
  };

  const handleDuplicate = async (order: WorkOrder) => {
    console.log('Duplicating order:', order.ot_number);
  };

  const handleDownloadPDF = (order: WorkOrder) => {
    console.log('Downloading PDF for order:', order.ot_number);
  };

  const handleClearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setPriorityFilter('all');
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">
              Órdenes de Trabajo
            </h1>
            <Button 
              onClick={handleCreateNew} 
              size="lg" 
              className="gap-2 h-12 px-6"
            >
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
              className="pl-12 h-12 text-base bg-card border-border focus-visible:ring-primary focus-visible:ring-1"
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
              <div key={i} className="h-64 rounded-lg bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No tienes órdenes de trabajo aún
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md">
              {searchTerm || quickFilter !== 'all'
                ? 'No se encontraron OTs con los filtros seleccionados. Intenta cambiar los filtros.'
                : 'Crea tu primera OT para comenzar a gestionar tus trabajos de impresión.'}
            </p>
            <Button 
              onClick={handleCreateNew} 
              size="lg"
              className="gap-2 h-12 px-8"
            >
              <Plus className="h-5 w-5" />
              Crear Primera OT
            </Button>
          </div>
        ) : (
          <>
            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginatedOrders.map((order) => (
                <OTCard
                  key={order.id}
                  order={order}
                  onView={() => navigate(`/ots/${order.id}`)}
                  onEdit={() => navigate(`/ots/${order.id}/edit`)}
                  onDuplicate={() => handleDuplicate(order)}
                  onDownloadPDF={() => handleDownloadPDF(order)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex items-center gap-1 mx-4">
                  {getPageNumbers().map((page, index) => (
                    page === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors",
                          currentPage === page
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
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
    </div>
  );
}
