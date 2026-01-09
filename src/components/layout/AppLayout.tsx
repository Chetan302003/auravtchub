import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTruckersMP } from '@/hooks/useTruckersMP';
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
  ChevronRight,
  Megaphone,
  Calendar,
  Activity
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['all'] },
  { icon: BarChart3, label: 'Fleet Overview', path: '/fleet', roles: ['all'] },
  { icon: Calendar, label: 'Events', path: '/events', roles: ['all'] },
  { icon: Activity, label: 'Telemetry', path: '/telemetry', roles: ['all'] },
  { icon: Truck, label: 'My Stats', path: '/my-stats', roles: ['all'] },
  { icon: PlusCircle, label: 'Log Job', path: '/log-job', roles: ['all'] },
  { icon: Megaphone, label: 'Announcements', path: '/announcements', roles: ['developer', 'superadmin', 'founder', 'management'] },
  { icon: Users, label: 'User Management', path: '/users', roles: ['developer', 'superadmin', 'founder', 'hr'] },
  { icon: FileText, label: 'System Logs', path: '/logs', roles: ['developer', 'superadmin', 'founder', 'management'] },
  { icon: Shield, label: 'Developer', path: '/developer', roles: ['developer'] },
  { icon: Settings, label: 'Settings', path: '/settings', roles: ['all'] },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, roles, signOut, isApproved } = useAuth();
  const { fetchPlayerAvatar } = useTruckersMP();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch TMP avatar if tmp_id exists
  useEffect(() => {
    const loadAvatar = async () => {
      if (profile?.tmp_id) {
        const avatar = await fetchPlayerAvatar(profile.tmp_id);
        if (avatar) {
          setAvatarUrl(avatar);
        }
      } else if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
    };
    loadAvatar();
  }, [profile?.tmp_id, profile?.avatar_url, fetchPlayerAvatar]);

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

          {/* User info - Fixed minimum height to prevent shrinking */}
          <div className="glass-card p-4 mb-6 min-h-[100px]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg neon-pulse overflow-hidden">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={profile?.username}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarUrl(null)}
                  />
                ) : (
                  profile?.username?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
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
          <nav className="flex-1 space-y-2 overflow-y-auto">
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
                  <item.icon size={20} className="shrink-0" />
                  <span className="font-medium truncate">{item.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto shrink-0" />}
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
