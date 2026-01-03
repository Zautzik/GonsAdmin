import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentSection } from '@/components/layout/ContentSection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Admin Components
import ExecutiveOverview from '@/components/admin/ExecutiveOverview';
import UserManagement from '@/components/admin/UserManagement';
import WorkersManagement from '@/components/admin/WorkersManagement';
import InventoryManagement from '@/components/admin/InventoryManagement';
import PurchasesManagement from '@/components/admin/PurchasesManagement';

// Manager Components
import CostReport from '@/components/manager/CostReport';
import WorkerStatsReport from '@/components/manager/WorkerStatsReport';
import TraceabilityReport from '@/components/manager/TraceabilityReport';

// Supervisor Components
import MachineList from '@/components/supervisor/MachineList';
import JobList from '@/components/supervisor/JobList';
import AddJobDialog from '@/components/supervisor/AddJobDialog';
import WorkerRoster from '@/components/supervisor/WorkerRoster';
import ProgressApprovalDashboard from '@/components/supervisor/ProgressApprovalDashboard';

// WhatsApp Components
import { WhatsAppManagement } from '@/components/whatsapp/WhatsAppManagement';

import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Users, MessageSquare, TrendingUp, BarChart3, 
  ClipboardList, UserCheck, Package, ShoppingCart, FileText, Plus
} from 'lucide-react';

const UnifiedDashboard = () => {
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [machines, setMachines] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [showAddJob, setShowAddJob] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    // Set default section based on role
    if (role === 'supervisor') {
      setActiveSection('overview');
    } else if (role === 'manager') {
      setActiveSection('overview');
    }
    
    fetchMachines();
    fetchJobs();
  }, [user, role, navigate]);

  const fetchMachines = async () => {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('name');
    
    if (!error) {
      setMachines(data || []);
    }
  };

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, machines(name)')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setJobs(data || []);
    }
  };

  const handleRefresh = () => {
    fetchMachines();
    fetchJobs();
  };

  const getSectionIcon = () => {
    switch (activeSection) {
      case 'overview': return <LayoutDashboard className="h-5 w-5" />;
      case 'whatsapp': return <MessageSquare className="h-5 w-5" />;
      case 'costs': return <TrendingUp className="h-5 w-5" />;
      case 'workers-report': return <BarChart3 className="h-5 w-5" />;
      case 'traceability': return <ClipboardList className="h-5 w-5" />;
      case 'users': return <Users className="h-5 w-5" />;
      case 'workers': return <UserCheck className="h-5 w-5" />;
      case 'inventory': return <Package className="h-5 w-5" />;
      case 'purchases': return <ShoppingCart className="h-5 w-5" />;
      case 'roster': return <Users className="h-5 w-5" />;
      case 'machines': return <Package className="h-5 w-5" />;
      case 'jobs': return <FileText className="h-5 w-5" />;
      default: return <LayoutDashboard className="h-5 w-5" />;
    }
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'overview': return 'Dashboard Overview';
      case 'whatsapp': return 'WhatsApp Reports';
      case 'whatsapp-config': return 'WhatsApp Configuration';
      case 'costs': return 'Cost Analysis';
      case 'workers-report': return 'Worker Statistics';
      case 'traceability': return 'Traceability Report';
      case 'users': return 'User Management';
      case 'workers': return 'Worker Management';
      case 'inventory': return 'Inventory Management';
      case 'purchases': return 'Purchases Management';
      case 'roster': return 'Worker Roster';
      case 'machines': return 'Machine Status';
      case 'jobs': return 'Production Jobs';
      default: return 'Dashboard';
    }
  };

  const getSectionDescription = () => {
    switch (activeSection) {
      case 'overview': return 'Key performance indicators and system overview';
      case 'whatsapp': return 'Review and approve worker progress submissions';
      case 'whatsapp-config': return 'Configure WhatsApp integration settings';
      case 'costs': return 'Analyze production costs and profitability';
      case 'workers-report': return 'View worker performance metrics';
      case 'traceability': return 'Track order history and audit trail';
      case 'users': return 'Manage system users and roles';
      case 'workers': return 'Manage production staff records';
      case 'inventory': return 'Track materials and supplies';
      case 'purchases': return 'Manage purchase orders and vendors';
      case 'roster': return 'Assign workers to shifts and stations';
      case 'machines': return 'Monitor equipment status';
      case 'jobs': return 'Manage production tasks';
      default: return '';
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      // Overview - role-specific
      case 'overview':
        if (role === 'admin' || role === 'manager') {
          return <ExecutiveOverview />;
        }
        return (
          <div className="space-y-6">
            <WorkerRoster showActions={role === 'supervisor'} />
            <ContentSection 
              title="Machines" 
              description="Current equipment status"
              helpText="Click on a machine to update its status"
            >
              <MachineList machines={machines} onUpdate={fetchMachines} />
            </ContentSection>
          </div>
        );

      // WhatsApp Reports
      case 'whatsapp':
        return <ProgressApprovalDashboard />;
      
      case 'whatsapp-config':
        return <WhatsAppManagement />;

      // Reports (Manager/Admin)
      case 'costs':
        return <CostReport />;
      case 'workers-report':
        return <WorkerStatsReport />;
      case 'traceability':
        return <TraceabilityReport />;

      // Management (Admin only)
      case 'users':
        return <UserManagement onUpdate={() => {}} />;
      case 'workers':
        return <WorkersManagement onUpdate={() => {}} />;
      case 'inventory':
        return <InventoryManagement />;
      case 'purchases':
        return <PurchasesManagement />;

      // Supervisor tools
      case 'roster':
        return <WorkerRoster showActions={true} />;
      case 'machines':
        return (
          <ContentSection 
            title="Machine Status" 
            description="Monitor and update equipment"
            helpText="Machines can be set to idle, running, maintenance, or offline"
          >
            <MachineList machines={machines} onUpdate={fetchMachines} />
          </ContentSection>
        );
      case 'jobs':
        return (
          <ContentSection 
            title="Production Jobs" 
            description="Manage and track production tasks"
            actions={
              <Button onClick={() => setShowAddJob(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Job
              </Button>
            }
          >
            <JobList jobs={jobs} machines={machines} onUpdate={fetchJobs} />
          </ContentSection>
        );

      default:
        return <ExecutiveOverview />;
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <PageHeader
          title={getSectionTitle()}
          description={getSectionDescription()}
          icon={getSectionIcon()}
          actions={
            activeSection === 'whatsapp' && (role === 'admin' || role === 'supervisor') ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveSection('whatsapp-config')}
              >
                Configure WhatsApp
              </Button>
            ) : activeSection === 'whatsapp-config' ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveSection('whatsapp')}
              >
                Back to Reports
              </Button>
            ) : null
          }
        />
        
        <div className="container mx-auto px-6 py-6">
          {renderContent()}
        </div>
      </div>

      <AddJobDialog
        open={showAddJob}
        onOpenChange={setShowAddJob}
        machines={machines}
        onJobAdded={fetchJobs}
      />
    </DashboardLayout>
  );
};

export default UnifiedDashboard;
