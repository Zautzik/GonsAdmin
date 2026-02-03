import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Clock, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface Machine {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface MachineStats {
  machine: Machine;
  hoursUsed: number;
  jobsCompleted: number;
  revenue: number;
  costPerHour: number;
}

export function MachineCostAnalysis() {
  const [machineStats, setMachineStats] = useState<MachineStats[]>([]);
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
      // Simulate machine stats (in production, this would come from production_activity)
      const stats = machines.map((machine) => ({
        machine,
        hoursUsed: Math.floor(Math.random() * 200) + 50,
        jobsCompleted: Math.floor(Math.random() * 50) + 10,
        revenue: Math.floor(Math.random() * 5000000) + 1000000,
        costPerHour: Math.floor(Math.random() * 50000) + 10000,
      }));
      setMachineStats(stats);
    }
    
    setLoading(false);
  };

  const totalRevenue = machineStats.reduce((sum, s) => sum + s.revenue, 0);
  const totalHours = machineStats.reduce((sum, s) => sum + s.hoursUsed, 0);

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
              <Settings className="h-4 w-4" /> Machines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{machineStats.length}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalHours.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" /> Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Machine Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Hours Used</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Cost/Hour</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machineStats.map((stat) => (
                <TableRow key={stat.machine.id}>
                  <TableCell className="font-medium">{stat.machine.name}</TableCell>
                  <TableCell>{stat.machine.type}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      stat.machine.status === 'running' ? 'bg-green-500/20 text-green-500' :
                      stat.machine.status === 'maintenance' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {stat.machine.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{stat.hoursUsed}</TableCell>
                  <TableCell className="text-right">{stat.jobsCompleted}</TableCell>
                  <TableCell className="text-right">{formatCurrency(stat.costPerHour)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(stat.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}