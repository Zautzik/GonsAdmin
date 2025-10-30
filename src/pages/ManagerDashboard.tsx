import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, TrendingUp, CheckCircle, Clock, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CostReport from '@/components/manager/CostReport';
import TraceabilityReport from '@/components/manager/TraceabilityReport';
import gonsaLogo from '@/assets/gonsa-logo.jpg';

const ManagerDashboard = () => {
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
  });
  const [jobs, setJobs] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    if (!user || role !== 'manager') {
      navigate('/');
      return;
    }
    
    fetchData();
  }, [user, role, navigate]);

  const fetchData = async () => {
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('*, machines(name)')
      .order('created_at', { ascending: false });
    
    const { data: machinesData, error: machinesError } = await supabase
      .from('machines')
      .select('*')
      .order('name');
    
    if (jobsError || machinesError) {
      toast.error('Error loading data');
      return;
    }
    
    setJobs(jobsData || []);
    setMachines(machinesData || []);
    
    const completed = jobsData?.filter(j => j.status === 'completed' || j.status === 'delivered').length || 0;
    const pending = jobsData?.filter(j => j.status === 'pending').length || 0;
    const inProgress = jobsData?.filter(j => j.status === 'in_progress').length || 0;
    
    setStats({
      total: jobsData?.length || 0,
      completed,
      pending,
      inProgress,
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const efficiencyRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-manager/5 to-background">
      <header className="bg-card border-b border-manager/20 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={gonsaLogo} alt="Gonsa" className="h-12" />
            <h1 className="text-2xl font-bold text-manager">{t('managerDashboard')}</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-manager/30 text-manager hover:bg-manager/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-manager/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalJobs')}
              </CardTitle>
              <Package className="h-4 w-4 text-manager" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-manager">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-manager/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('completedJobs')}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-supervisor" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-supervisor">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card className="border-manager/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('pendingJobs')}
              </CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="border-manager/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('efficiency')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{efficiencyRate}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
            <TabsTrigger value="costs">{t('costReport')}</TabsTrigger>
            <TabsTrigger value="traceability">{t('traceabilityReport')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-manager/20">
                <CardHeader>
                  <CardTitle className="text-manager">{t('machines')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {machines.map(machine => (
                      <div
                        key={machine.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{machine.name}</p>
                          <p className="text-sm text-muted-foreground">{t(machine.type)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          machine.status === 'running' ? 'bg-supervisor/20 text-supervisor' :
                          machine.status === 'maintenance' ? 'bg-accent/20 text-accent' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {t(machine.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-manager/20">
                <CardHeader>
                  <CardTitle className="text-manager">{t('jobs')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {jobs.map(job => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1">
                          <p className="font-medium truncate">{job.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.machines?.name || t('machine')}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          job.status === 'completed' || job.status === 'delivered' ? 'bg-supervisor/20 text-supervisor' :
                          job.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                          'bg-accent/20 text-accent'
                        }`}>
                          {t(job.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="costs">
            <CostReport />
          </TabsContent>

          <TabsContent value="traceability">
            <TraceabilityReport />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ManagerDashboard;