import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentSection } from '@/components/layout/ContentSection';
import { supabase } from '@/integrations/supabase/client';

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
import WorkerRoster from '@/components/supervisor/WorkerRoster';

// Reports Components
import { CustomReportBuilder } from '@/components/reports/CustomReportBuilder';

import { 
  LayoutDashboard, Users, TrendingUp, BarChart3, 
  ClipboardList, UserCheck, Package, ShoppingCart
} from 'lucide-react';

const UnifiedDashboard = () => {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    fetchMachines();
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

  const getSectionIcon = () => {
    switch (activeSection) {
      case 'overview': return <LayoutDashboard className="h-5 w-5" />;
      case 'custom-reports': return <BarChart3 className="h-5 w-5" />;
      case 'costs': return <TrendingUp className="h-5 w-5" />;
      case 'workers-report': return <BarChart3 className="h-5 w-5" />;
      case 'traceability': return <ClipboardList className="h-5 w-5" />;
      case 'users': return <Users className="h-5 w-5" />;
      case 'workers': return <UserCheck className="h-5 w-5" />;
      case 'inventory': return <Package className="h-5 w-5" />;
      case 'purchases': return <ShoppingCart className="h-5 w-5" />;
      case 'roster': return <Users className="h-5 w-5" />;
      case 'machines': return <Package className="h-5 w-5" />;
      default: return <LayoutDashboard className="h-5 w-5" />;
    }
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'overview': return 'Dashboard Overview';
      case 'custom-reports': return 'Custom Report Builder';
      case 'costs': return 'Cost Analysis';
      case 'workers-report': return 'Worker Statistics';
      case 'traceability': return 'Traceability Report';
      case 'users': return 'User Management';
      case 'workers': return 'Worker Management';
      case 'inventory': return 'Inventory Management';
      case 'purchases': return 'Purchases Management';
      case 'roster': return 'Worker Roster';
      case 'machines': return 'Machine Status';
      default: return 'Dashboard';
    }
  };

  const getSectionDescription = () => {
    switch (activeSection) {
      case 'overview': return 'Key performance indicators and system overview';
      case 'custom-reports': return 'Build custom reports from any data source';
      case 'costs': return 'Analyze production costs and profitability';
      case 'workers-report': return 'View worker performance metrics';
      case 'traceability': return 'Track order history and audit trail';
      case 'users': return 'Manage system users and roles';
      case 'workers': return 'Manage production staff records';
      case 'inventory': return 'Track materials and supplies';
      case 'purchases': return 'Manage purchase orders and vendors';
      case 'roster': return 'Assign workers to shifts and stations';
      case 'machines': return 'Monitor equipment status';
      default: return '';
    }
  };

  const renderContent = () => {
    switch (activeSection) {
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

      case 'custom-reports':
        return <CustomReportBuilder />;
      case 'costs':
        return <CostReport />;
      case 'workers-report':
        return <WorkerStatsReport />;
      case 'traceability':
        return <TraceabilityReport />;

      case 'users':
        return <UserManagement onUpdate={() => {}} />;
      case 'workers':
        return <WorkersManagement onUpdate={() => {}} />;
      case 'inventory':
        return <InventoryManagement />;
      case 'purchases':
        return <PurchasesManagement />;

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

      default:
        return <ExecutiveOverview />;
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <PageHeader
          title={getSectionTitle()}
          description={getSectionDescription()}
          icon={getSectionIcon()}
        />
        
        <div className="container mx-auto px-6 py-6">
          {renderContent()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UnifiedDashboard;