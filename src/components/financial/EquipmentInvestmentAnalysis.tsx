import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface Investment {
  id: string;
  name: string;
  type: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  depreciation: number;
  roi: number;
}

export function EquipmentInvestmentAnalysis() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: machines } = await supabase
      .from('machines')
      .select('*')
      .order('name');

    if (machines) {
      // Simulate investment data (in production, this would come from a dedicated table)
      const investmentData = machines.map((machine) => {
        const purchasePrice = Math.floor(Math.random() * 50000000) + 10000000;
        const depreciation = Math.floor(Math.random() * 30) + 10;
        const currentValue = purchasePrice * (1 - depreciation / 100);
        const roi = Math.floor(Math.random() * 50) + 5;
        
        return {
          id: machine.id,
          name: machine.name,
          type: machine.type,
          purchaseDate: '2022-01-15',
          purchasePrice,
          currentValue,
          depreciation,
          roi,
        };
      });
      setInvestments(investmentData);
    }
    
    setLoading(false);
  };

  const totalInvestment = investments.reduce((sum, i) => sum + i.purchasePrice, 0);
  const totalCurrentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const avgROI = investments.length > 0 
    ? investments.reduce((sum, i) => sum + i.roi, 0) / investments.length 
    : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-48">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total Investment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalInvestment)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Current Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalCurrentValue)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Avg ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgROI.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Investment Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Purchase Price</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">Depreciation</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.name}</TableCell>
                  <TableCell>{inv.type}</TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.purchasePrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.currentValue)}</TableCell>
                  <TableCell className="text-right text-destructive">-{inv.depreciation}%</TableCell>
                  <TableCell className="text-right">
                    <span className={inv.roi > 20 ? 'text-green-500' : 'text-muted-foreground'}>
                      {inv.roi}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}