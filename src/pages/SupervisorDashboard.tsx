import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Plus } from 'lucide-react';
import MachineList from '@/components/supervisor/MachineList';
import JobList from '@/components/supervisor/JobList';
import AddJobDialog from '@/components/supervisor/AddJobDialog';
import OTManagement from '@/components/supervisor/OTManagement';
import gonsaLogo from '@/assets/gonsa-logo.jpg';

const SupervisorDashboard = () => {
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showAddJob, setShowAddJob] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!user || role !== 'supervisor') {
      navigate('/');
      return;
    }
    
    fetchMachines();
    fetchJobs();
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

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, machines(name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Error loading jobs');
    } else {
      setJobs(data || []);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-supervisor/5 to-background">
      <header className="bg-card border-b border-supervisor/20 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={gonsaLogo} alt="Gonsa" className="h-12" />
            <h1 className="text-2xl font-bold text-supervisor">{t('supervisorDashboard')}</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-supervisor/30 text-supervisor hover:bg-supervisor/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <OTManagement />
        
        <Card className="border-supervisor/20">
          <CardHeader>
            <CardTitle className="text-supervisor">{t('machines')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MachineList machines={machines} onUpdate={fetchMachines} />
          </CardContent>
        </Card>

        <Card className="border-supervisor/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-supervisor">{t('jobs')}</CardTitle>
            <Button
              onClick={() => setShowAddJob(true)}
              className="bg-supervisor hover:bg-supervisor/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('addJob')}
            </Button>
          </CardHeader>
          <CardContent>
            <JobList jobs={jobs} machines={machines} onUpdate={fetchJobs} />
          </CardContent>
        </Card>
      </main>

      <AddJobDialog
        open={showAddJob}
        onOpenChange={setShowAddJob}
        machines={machines}
        onJobAdded={fetchJobs}
      />
    </div>
  );
};

export default SupervisorDashboard;