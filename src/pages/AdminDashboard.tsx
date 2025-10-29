import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Users, Package, FileText, DollarSign } from 'lucide-react';
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
      <header className="bg-card border-b border-primary/20 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={gonsaLogo} alt="Gonsa" className="h-12" />
            <h1 className="text-2xl font-bold text-primary">{t('adminDashboard')}</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalUsers')}
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalWorkers')}
              </CardTitle>
              <Users className="h-4 w-4 text-supervisor" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-supervisor">{stats.totalWorkers}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('machines')}
              </CardTitle>
              <Package className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.totalMachines}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalJobs')}
              </CardTitle>
              <FileText className="h-4 w-4 text-manager" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-manager">{stats.totalJobs}</div>
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
