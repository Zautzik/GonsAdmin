import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CostReport = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalCost: 0,
    materialCost: 0,
    laborCost: 0,
    machineCost: 0,
    orderCount: 0,
  });
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchCostData();
  }, []);

  const fetchCostData = async () => {
    // Fetch work orders with their operations for cost breakdown
    const { data: orders, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error loading cost data');
      return;
    }

    // Fetch operations to calculate category costs
    const { data: operations } = await supabase
      .from('operations')
      .select('*');

    setWorkOrders(orders || []);

    // Calculate costs from operations
    const materialCost = (operations || [])
      .filter(op => op.category === 'MATERIALS')
      .reduce((sum, op) => sum + (op.total_cost_actual || op.total_cost_budgeted || 0), 0);
    
    const laborCost = (operations || [])
      .filter(op => ['PRINTING', 'FINISHING'].includes(op.category))
      .reduce((sum, op) => sum + (op.total_cost_actual || op.total_cost_budgeted || 0), 0);
    
    const machineCost = (operations || [])
      .filter(op => op.category === 'OTHER')
      .reduce((sum, op) => sum + (op.total_cost_actual || op.total_cost_budgeted || 0), 0);

    const totalCost = materialCost + laborCost + machineCost;

    setStats({
      totalCost,
      materialCost,
      laborCost,
      machineCost,
      orderCount: orders?.length || 0,
    });
  };

  const exportToPDF = () => {
    toast.success('PDF export functionality would be implemented here');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{t('costReport')}</h2>
        <Button onClick={exportToPDF} variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          {t('exportPDF')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('totalCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatCurrency(stats.totalCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.orderCount} OTs</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('materialCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatCurrency(stats.materialCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalCost > 0 ? ((stats.materialCost / stats.totalCost) * 100).toFixed(0) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('laborCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatCurrency(stats.laborCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalCost > 0 ? ((stats.laborCost / stats.totalCost) * 100).toFixed(0) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('machineCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatCurrency(stats.machineCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalCost > 0 ? ((stats.machineCost / stats.totalCost) * 100).toFixed(0) : 0}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle>{t('costBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">OT</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Producto</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Costo Presup.</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Costo Real</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.slice(0, 20).map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium">OT-{order.ot_number}</td>
                    <td className="py-3 px-4 text-muted-foreground">{order.client_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{order.product_name}</td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(order.cost_budgeted || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCurrency(order.cost_actual || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostReport;