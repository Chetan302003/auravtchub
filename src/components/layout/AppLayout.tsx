import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  PlusCircle,
  BarChart3,
  Shield,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['all'] },
  { icon: BarChart3, label: 'Fleet Overview', path: '/fleet', roles: ['all'] },
  { icon: Truck, label: 'My Stats', path: '/my-stats', roles: ['all'] },
  { icon: PlusCircle, label: 'Log Job', path: '/log-job', roles: ['all'] },
  { icon: Users, label: 'User Management', path: '/users', roles: ['developer', 'superadmin', 'founder', 'hr'] },
  { icon: FileText, label: 'System Logs', path: '/logs', roles: ['developer', 'superadmin', 'founder', 'management'] },
  { icon: Shield, label: 'Developer', path: '/developer', roles: ['developer'] },
  { icon: Settings, label: 'Settings', path: '/settings', roles: ['all'] },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, roles, signOut, isApproved } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.roles.includes('all')) return true;
    return item.roles.some(role => roles.includes(role as any));
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-full bg-primary/10 text-primary neon-glow"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "glass-card rounded-none border-r border-border/30"
      )}>
        <div className="flex flex-col h-full p-6">
          {/* Logo */}
          <div className="mb-8 pt-2">
            <h1 className="text-2xl font-bold gradient-text neon-text">
              Aura VTC Hub
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Fleet Management</p>
          </div>

          {/* User info */}
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg neon-pulse">
                {profile?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{profile?.username || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {roles[0]?.replace('_', ' ').toUpperCase() || 'Driver'}
                </p>
              </div>
            </div>
            {!isApproved && (
              <div className="mt-3 px-2 py-1 rounded-full bg-warning/20 text-warning text-xs text-center">
                Pending Approval
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive 
                      ? "bg-primary/20 text-primary neon-glow" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Sign out button */}
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="mt-4 w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-72 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}