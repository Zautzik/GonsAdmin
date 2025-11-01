import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Users, Package, FileText, DollarSign, Factory } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from '@/components/admin/UserManagement';
import WorkersManagement from '@/components/admin/WorkersManagement';
import InventoryManagement from '@/components/admin/InventoryManagement';
import PurchasesManagement from '@/components/admin/PurchasesManagement';
import gonsaLogo from '@/assets/gonsa-logo.jpg';

const AdminDashboard = () => {
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    totalMachines: 0,
    totalJobs: 0,
  });

  useEffect(() => {
    if (!user || role !== 'admin') {
      navigate('/');
      return;
    }
    
    fetchStats();
  }, [user, role, navigate]);

  const fetchStats = async () => {
    const [usersData, workersData, machinesData, jobsData] = await Promise.all([
      supabase.from('user_roles').select('id', { count: 'exact', head: true }),
      supabase.from('workers' as any).select('id', { count: 'exact', head: true }),
      supabase.from('machines').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      totalUsers: usersData.count || 0,
      totalWorkers: workersData.count || 0,
      totalMachines: machinesData.count || 0,
      totalJobs: jobsData.count || 0,
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <header className="bg-card border-b border-primary/20 shadow-lg sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={gonsaLogo} alt="Gonsa" className="h-12" />
            <div>
              <h1 className="text-2xl font-bold text-primary">{t('adminDashboard')}</h1>
              <p className="text-xs text-muted-foreground">System Administration</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/workflow')}
              variant="default"
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Factory className="mr-2 h-4 w-4" />
              Workflow Management
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalUsers')}
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
            </CardContent>
          </Card>

          <Card className="border-supervisor/20 hover:border-supervisor/40 transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalWorkers')}
              </CardTitle>
              <div className="p-2 rounded-lg bg-supervisor/10">
                <Users className="h-5 w-5 text-supervisor" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-supervisor">{stats.totalWorkers}</div>
              <p className="text-xs text-muted-foreground mt-1">Production staff</p>
            </CardContent>
          </Card>

          <Card className="border-accent/20 hover:border-accent/40 transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('machines')}
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <Package className="h-5 w-5 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent">{stats.totalMachines}</div>
              <p className="text-xs text-muted-foreground mt-1">Equipment units</p>
            </CardContent>
          </Card>

          <Card className="border-manager/20 hover:border-manager/40 transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalJobs')}
              </CardTitle>
              <div className="p-2 rounded-lg bg-manager/10">
                <FileText className="h-5 w-5 text-manager" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-manager">{stats.totalJobs}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              {t('users')}
            </TabsTrigger>
            <TabsTrigger value="workers">
              <Users className="mr-2 h-4 w-4" />
              {t('workers')}
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <Package className="mr-2 h-4 w-4" />
              {t('inventory')}
            </TabsTrigger>
            <TabsTrigger value="purchases">
              <DollarSign className="mr-2 h-4 w-4" />
              {t('purchases')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UserManagement onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="workers" className="space-y-4">
            <WorkersManagement onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="purchases" className="space-y-4">
            <PurchasesManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
