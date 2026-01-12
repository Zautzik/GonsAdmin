import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import gonsaLogo from '@/assets/gonsa-logo.jpg';
import {
  LayoutDashboard, Users, Package, FileText, DollarSign,
  Factory, Wrench, MessageSquare, Settings, LogOut, ChevronLeft,
  ChevronRight, BarChart3, ClipboardList, Clock, UserCheck,
  ShoppingCart, TrendingUp, Bell, HelpCircle, Globe, FileStack, PieChart
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  badge?: number;
  roles: ('admin' | 'manager' | 'supervisor' | 'technician')[];
  children?: NavItem[];
  description?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function DashboardLayout({ children, activeSection, onSectionChange }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['operations', 'reports']);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleLanguage = () => {
    const i18n = (window as any).i18next;
    if (i18n) {
      const newLang = i18n.language === 'en' ? 'es' : 'en';
      i18n.changeLanguage(newLang);
    }
  };

  const navGroups: {
    id: string;
    label: string;
    items: {
      id: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      roles: ('admin' | 'manager' | 'supervisor' | 'technician')[];
      description: string;
      href?: string;
      badge?: number;
    }[];
  }[] = [
    {
      id: 'ot-module',
      label: 'Órdenes de Trabajo',
      items: [
        {
          id: 'ot-dashboard',
          label: 'OT Dashboard',
          icon: FileStack,
          href: '/ots/dashboard',
          roles: ['admin', 'manager', 'supervisor'],
          description: 'Gestión de OTs',
        },
        {
          id: 'ot-templates',
          label: 'Plantillas',
          icon: FileText,
          href: '/ots/templates',
          roles: ['admin', 'manager', 'supervisor'],
          description: 'Templates de OT',
        },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      items: [
        {
          id: 'overview',
          label: 'Dashboard',
          icon: LayoutDashboard,
          roles: ['admin', 'manager', 'supervisor'],
          description: 'Overview & KPIs',
        },
        {
          id: 'workflow',
          label: 'Workflow',
          icon: Factory,
          href: '/workflow',
          roles: ['admin', 'supervisor'],
          description: 'Work orders & production',
        },
        {
          id: 'whatsapp',
          label: 'WhatsApp Reports',
          icon: MessageSquare,
          roles: ['admin', 'manager', 'supervisor'],
          description: 'Approve worker submissions',
        },
        {
          id: 'maintenance',
          label: 'Maintenance',
          icon: Wrench,
          href: '/maintenance',
          roles: ['admin', 'technician'],
          description: 'Equipment care',
        },
      ],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      items: [
        {
          id: 'cost-analytics',
          label: 'Cost Analytics',
          icon: PieChart,
          href: '/analytics/costs',
          roles: ['admin', 'manager'],
          description: 'Cost analysis & metrics',
        },
        {
          id: 'custom-reports',
          label: 'Report Builder',
          icon: BarChart3,
          roles: ['admin', 'manager'],
          description: 'Custom data reports',
        },
        {
          id: 'financial',
          label: 'Financial',
          icon: DollarSign,
          href: '/financial',
          roles: ['admin', 'manager'],
          description: 'Costs & revenue',
        },
        {
          id: 'costs',
          label: 'Cost Analysis',
          icon: TrendingUp,
          roles: ['admin', 'manager'],
          description: 'Detailed cost breakdown',
        },
        {
          id: 'workers-report',
          label: 'Worker Stats',
          icon: BarChart3,
          roles: ['admin', 'manager'],
          description: 'Performance metrics',
        },
        {
          id: 'traceability',
          label: 'Traceability',
          icon: ClipboardList,
          roles: ['admin', 'manager'],
          description: 'Audit trail & history',
        },
      ],
    },
    {
      id: 'management',
      label: 'Management',
      items: [
        {
          id: 'admin-config',
          label: 'System Config',
          icon: Settings,
          href: '/admin/config',
          roles: ['admin'],
          description: 'Margins, waste, speeds',
        },
        {
          id: 'users',
          label: 'Users',
          icon: Users,
          roles: ['admin'],
          description: 'System access',
        },
        {
          id: 'workers',
          label: 'Workers',
          icon: UserCheck,
          roles: ['admin'],
          description: 'Production staff',
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Package,
          roles: ['admin'],
          description: 'Materials & supplies',
        },
        {
          id: 'purchases',
          label: 'Purchases',
          icon: ShoppingCart,
          roles: ['admin'],
          description: 'Orders & vendors',
        },
      ],
    },
    {
      id: 'supervisor-tools',
      label: 'Supervisor Tools',
      items: [
        {
          id: 'roster',
          label: 'Worker Roster',
          icon: Users,
          roles: ['supervisor', 'admin'],
          description: 'Team assignments',
        },
        {
          id: 'machines',
          label: 'Machines',
          icon: Package,
          roles: ['supervisor', 'admin'],
          description: 'Equipment status',
        },
        {
          id: 'jobs',
          label: 'Jobs',
          icon: FileText,
          roles: ['supervisor', 'admin'],
          description: 'Production tasks',
        },
      ],
    },
  ];

  const filteredGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => role && item.roles.includes(role)),
    }))
    .filter(group => group.items.length > 0);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleNavClick = (item: typeof navGroups[0]['items'][0]) => {
    if (item.href) {
      navigate(item.href);
    } else if (onSectionChange) {
      onSectionChange(item.id);
    }
  };

  const getRoleColor = () => {
    switch (role) {
      case 'admin': return 'text-primary border-primary/30';
      case 'manager': return 'text-manager border-manager/30';
      case 'supervisor': return 'text-supervisor border-supervisor/30';
      default: return 'text-muted-foreground';
    }
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      case 'supervisor': return 'Supervisor';
      case 'technician': return 'Technician';
      default: return 'User';
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          <img src={gonsaLogo} alt="Gonsa" className="h-10 w-10 rounded-lg object-cover" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-foreground truncate">Gonsa</h1>
              <p className="text-xs text-muted-foreground truncate">Production System</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-6 px-3">
            {filteredGroups.map(group => (
              <div key={group.id}>
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="flex items-center justify-between w-full px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    {group.label}
                    <ChevronRight
                      className={cn(
                        'h-3 w-3 transition-transform',
                        expandedGroups.includes(group.id) && 'rotate-90'
                      )}
                    />
                  </button>
                )}
                {(collapsed || expandedGroups.includes(group.id)) && (
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id || location.pathname === item.href;
                      
                      const button = (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item)}
                          className={cn(
                            'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                            'hover:bg-muted/80',
                            isActive && 'bg-primary/10 text-primary',
                            !isActive && 'text-muted-foreground hover:text-foreground',
                            collapsed && 'justify-center px-2'
                          )}
                        >
                          <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                          {!collapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                          {!collapsed && item.badge && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </button>
                      );

                      if (collapsed) {
                        return (
                          <Tooltip key={item.id} delayDuration={0}>
                            <TooltipTrigger asChild>{button}</TooltipTrigger>
                            <TooltipContent side="right" className="flex flex-col gap-1">
                              <span className="font-medium">{item.label}</span>
                              {item.description && (
                                <span className="text-xs text-muted-foreground">{item.description}</span>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      return button;
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-3 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email?.split('@')[0]}</p>
                <Badge variant="outline" className={cn('text-xs', getRoleColor())}>
                  {getRoleBadge()}
                </Badge>
              </div>
            </div>
          )}
          
          <div className={cn('flex gap-1', collapsed ? 'flex-col' : 'flex-row')}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleLanguage}>
                  <Globe className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? 'right' : 'top'}>Switch Language</TooltipContent>
            </Tooltip>
            
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? 'right' : 'top'}>Help & Documentation</TooltipContent>
            </Tooltip>
            
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? 'right' : 'top'}>Logout</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {children}
      </main>
    </div>
  );
}
