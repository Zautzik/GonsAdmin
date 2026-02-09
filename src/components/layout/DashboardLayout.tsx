import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import gonsaLogo from '@/assets/gonsa-logo.jpg';
import {
  Home, ClipboardList, Factory, Package, ShoppingCart,
  BarChart3, Settings, Bell, LogOut, User, HelpCircle,
  Check, Menu, X,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: ('admin' | 'manager' | 'supervisor' | 'technician')[];
  mobileNav?: boolean; // show in bottom nav
}

const navItems: NavItem[] = [
  { id: 'inicio', label: 'Inicio', icon: Home, href: '/dashboard', roles: ['admin', 'manager', 'supervisor', 'technician'], mobileNav: true },
  { id: 'ots', label: 'Órdenes de Trabajo', icon: ClipboardList, href: '/ots/dashboard', roles: ['admin', 'manager', 'supervisor'], mobileNav: true },
  { id: 'produccion', label: 'Producción', icon: Factory, href: '/industry/production', roles: ['admin', 'manager', 'supervisor'], mobileNav: true },
  { id: 'inventario', label: 'Inventario', icon: Package, href: '/industry/inventory', roles: ['admin', 'manager', 'supervisor', 'technician'], mobileNav: true },
  { id: 'compras', label: 'Compras', icon: ShoppingCart, href: '/industry/procurement', roles: ['admin', 'manager'], mobileNav: true },
  { id: 'reportes', label: 'Reportes', icon: BarChart3, href: '/analytics/costs', roles: ['admin', 'manager'] },
  { id: 'config', label: 'Configuración', icon: Settings, href: '/admin/config', roles: ['admin'] },
];

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string | null;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredNav = navItems.filter(item => role && item.roles.includes(role));
  const mobileBottomNav = filteredNav.filter(i => i.mobileNav).slice(0, 5);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setNotifications(data as Notification[]);
    };
    fetchNotifications();
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/admin' || location.pathname === '/supervisor' || location.pathname === '/manager';
    return location.pathname.startsWith(href);
  };

  const userInitials = user?.email
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : 'U';

  const roleLabelMap: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    supervisor: 'Supervisor',
    technician: 'Técnico',
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    return `Hace ${Math.floor(hrs / 24)}d`;
  };

  // ── Desktop Sidebar ──
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <img src={gonsaLogo} alt="Gonsa" className="h-9 w-9 rounded-lg object-cover" />
        <div>
          <h1 className="font-bold text-foreground text-base">Gonsa</h1>
          <p className="text-xs text-muted-foreground">Sistema de Producción</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredNav.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.href)}
              className={cn(
                'flex items-center gap-3 w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground">{role ? roleLabelMap[role] : ''}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Notifications Panel ──
  const NotificationsPanel = () => (
    <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[400px] p-0">
        <SheetHeader className="p-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Notificaciones</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={markAllRead}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Marcar todo leído
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Sin notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'px-5 py-4 transition-colors',
                    !n.is_read && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );

  // ── User Menu ──
  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!isMobile && (
            <span className="text-sm font-medium text-foreground">
              {user?.email?.split('@')[0]}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">{user?.email?.split('@')[0]}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <Badge variant="outline" className="mt-1 text-xs">
            {role ? roleLabelMap[role] : 'Usuario'}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <User className="h-4 w-4" />
          Mi perfil
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setNotifOpen(true)}>
          <Bell className="h-4 w-4" />
          Notificaciones
          {unreadCount > 0 && (
            <Badge className="ml-auto h-5 px-1.5 text-xs">{unreadCount}</Badge>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <HelpCircle className="h-4 w-4" />
          Ayuda
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ── Top Header (shared) ──
  const TopHeader = () => (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {isMobile && (
          <img src={gonsaLogo} alt="Gonsa" className="h-8 w-8 rounded-lg object-cover" />
        )}
      </div>
      <div className="flex items-center gap-1">
        <NotificationsPanel />
        <UserMenu />
      </div>
    </header>
  );

  // ── Mobile Full Menu (sheet) ──
  const MobileMenu = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent side="left" className="w-[280px] p-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <img src={gonsaLogo} alt="Gonsa" className="h-9 w-9 rounded-lg object-cover" />
          <div>
            <h1 className="font-bold text-foreground text-base">Gonsa</h1>
            <p className="text-xs text-muted-foreground">Sistema de Producción</p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setMobileMenuOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {filteredNav.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.href);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'flex items-center gap-3 w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );

  // ── Bottom Nav (mobile) ──
  const BottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {mobileBottomNav.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.href)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 min-w-0 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span className={cn(
                'text-[10px] truncate max-w-[64px]',
                active ? 'font-bold' : 'font-medium'
              )}>
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-card flex flex-col">
          <SidebarContent />
        </aside>
      )}

      {/* Mobile Menu Sheet */}
      {isMobile && <MobileMenu />}

      {/* Main area */}
      <div className={cn('flex-1 flex flex-col min-w-0', !isMobile && 'ml-60')}>
        <TopHeader />
        <main className={cn('flex-1', isMobile && 'pb-16')}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && <BottomNav />}
    </div>
  );
}
