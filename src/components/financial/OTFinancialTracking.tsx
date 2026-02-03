import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface WorkOrderFinancial {
  id: string;
  ot_number: number;
  client_name: string;
  product_name: string;
  quantity: number;
  cost_budgeted: number | null;
  cost_actual: number | null;
  total_price: number | null;
  status: string | null;
}

export function OTFinancialTracking() {
  const [workOrders, setWorkOrders] = useState<WorkOrderFinancial[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    revenue: 0,
    budgetedCost: 0,
    actualCost: 0,
    margin: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_orders')
      .select('id, ot_number, client_name, product_name, quantity, cost_budgeted, cost_actual, total_price, status')
      .order('ot_number', { ascending: false })
      .limit(50);

    if (!error && data) {
      setWorkOrders(data);
      
      const revenue = data.reduce((sum, wo) => sum + (wo.total_price || 0), 0);
      const budgetedCost = data.reduce((sum, wo) => sum + (wo.cost_budgeted || 0), 0);
      const actualCost = data.reduce((sum, wo) => sum + (wo.cost_actual || 0), 0);
      const margin = revenue > 0 ? ((revenue - actualCost) / revenue) * 100 : 0;

      setTotals({ revenue, budgetedCost, actualCost, margin });
    }
    setLoading(false);
  };

  const getVariance = (budgeted: number | null, actual: number | null) => {
    if (!budgeted || !actual) return null;
    return ((actual - budgeted) / budgeted) * 100;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.revenue)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Budgeted Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.budgetedCost)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Actual Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.actualCost)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.margin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Work Order Financial Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OT</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((wo) => {
                const variance = getVariance(wo.cost_budgeted, wo.cost_actual);
                return (
                  <TableRow key={wo.id}>
                    <TableCell className="font-medium">OT-{wo.ot_number}</TableCell>
                    <TableCell>{wo.client_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{wo.product_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(wo.cost_budgeted || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(wo.cost_actual || 0)}</TableCell>
                    <TableCell className="text-right">
                      {variance !== null ? (
                        <span className={variance > 0 ? 'text-destructive' : 'text-green-500'}>
                          {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(wo.total_price || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={wo.status === 'completed' ? 'default' : 'secondary'}>
                        {wo.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}