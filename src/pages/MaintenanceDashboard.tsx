import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, AlertCircle, CheckCircle, Wrench, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface WorkOrder {
  id: string;
  machine_id: string;
  status: string;
  priority: number;
  scheduled_date: string;
  machines: { name: string; type: string };
  maintenance_checklists: { name: string; frequency: string };
}

export default function MaintenanceDashboard() {
  const { role } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    const { data, error } = await supabase
      .from('maintenance_work_orders')
      .select(`
        *,
        machines(name, type),
        maintenance_checklists(name, frequency)
      `)
      .order('priority', { ascending: false })
      .order('scheduled_date', { ascending: true });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch work orders',
        variant: 'destructive',
      });
    } else {
      setWorkOrders(data || []);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (priority >= 3) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const filterOrders = (status?: string) => {
    if (!status) return workOrders;
    return workOrders.filter(wo => wo.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
              <Wrench className="h-10 w-10 text-primary" />
              Asset Maintenance
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage preventive, corrective, and predictive maintenance
            </p>
          </div>
          {(role === 'admin' || role === 'supervisor') && (
            <Button size="lg">
              <FileText className="mr-2 h-5 w-5" />
              New Work Order
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 border-border/40 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-foreground">
                  {filterOrders('pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </Card>

          <Card className="p-6 border-border/40 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-foreground">
                  {filterOrders('in_progress').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-400" />
            </div>
          </Card>

          <Card className="p-6 border-border/40 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-foreground">
                  {filterOrders('completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-6 border-border/40 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold text-foreground">
                  {workOrders.length}
                </p>
              </div>
              <Wrench className="h-8 w-8 text-primary" />
            </div>
          </Card>
        </div>

        {/* Work Orders Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-card border border-border/40">
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          {['all', 'pending', 'in_progress', 'completed'].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4 mt-6">
              {filterOrders(tab === 'all' ? undefined : tab).map(order => (
                <Card key={order.id} className="p-6 border-border/40 bg-card/50 backdrop-blur hover:bg-card/70 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-foreground">
                          {order.machines?.name}
                        </h3>
                        <Badge variant="outline" className={getPriorityColor(order.priority)}>
                          Priority {order.priority}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {order.maintenance_checklists?.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(order.scheduled_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          {order.maintenance_checklists?.frequency}
                        </div>
                      </div>
                    </div>

                    <Button variant="outline">
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}

              {filterOrders(tab === 'all' ? undefined : tab).length === 0 && (
                <Card className="p-12 border-border/40 bg-card/50 backdrop-blur">
                  <div className="text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No work orders found</p>
                  </div>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}