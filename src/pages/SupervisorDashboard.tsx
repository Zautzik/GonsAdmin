import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Package, FileText, Factory, MessageSquare } from 'lucide-react';
import MachineList from '@/components/supervisor/MachineList';
import WorkerRoster from '@/components/supervisor/WorkerRoster';
import gonsaLogo from '@/assets/gonsa-logo.jpg';

const SupervisorDashboard = () => {
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user || role !== 'supervisor') {
      navigate('/');
      return;
    }
    
    fetchMachines();
    fetchWorkOrders();
  }, [user, role, navigate]);

  const fetchMachines = async () => {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('name');
    
    if (error) {
      toast.error('Error loading machines');
    } else {
      setMachines(data || []);
    }
  };

  const fetchWorkOrders = async () => {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      toast.error('Error loading work orders');
    } else {
      setWorkOrders(data || []);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-supervisor/5 to-background">
      <header className="bg-card border-b border-supervisor/20 shadow-lg sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={gonsaLogo} alt="Gonsa" className="h-12" />
            <div>
              <h1 className="text-2xl font-bold text-supervisor">{t('supervisorDashboard')}</h1>
              <p className="text-xs text-muted-foreground">Production Management</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/industry')}
              className="bg-supervisor hover:bg-supervisor/90"
            >
              <Factory className="mr-2 h-4 w-4" />
              Industry 6.0
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-supervisor/30 text-supervisor hover:bg-supervisor/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" className="gap-2">
              <Package className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="workorders" className="gap-2">
              <FileText className="h-4 w-4" />
              Work Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <WorkerRoster showActions={true} />
            
            <Card className="border-supervisor/20 hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="text-supervisor flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('machines')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MachineList machines={machines} onUpdate={fetchMachines} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workorders" className="space-y-8">
            <Card className="border-supervisor/20 hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="text-supervisor flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Work Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workOrders.map((wo) => (
                    <div
                      key={wo.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate(`/ots/${wo.id}`)}
                    >
                      <div>
                        <p className="font-medium">OT-{wo.ot_number}: {wo.product_name}</p>
                        <p className="text-sm text-muted-foreground">{wo.client_name}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        wo.status === 'completed' || wo.status === 'delivered' ? 'bg-green-500/20 text-green-500' :
                        wo.status === 'in_production' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {wo.status}
                      </span>
                    </div>
                  ))}
                  {workOrders.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No work orders found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SupervisorDashboard;