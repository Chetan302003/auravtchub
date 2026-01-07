import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard, StatCard } from '@/components/layout/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Code, 
  Download, 
  Upload,
  Server,
  Database,
  Users,
  Activity,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Rocket
} from 'lucide-react';

interface AppVersion {
  current: string;
  latest: string;
}

export default function DeveloperPanel() {
  const [version, setVersion] = useState<AppVersion | null>(null);
  const [newVersion, setNewVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    totalJobs: 0,
    totalLogs: 0,
  });
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const isDeveloper = hasRole('developer');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch version
      const { data: versionData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'version')
        .single();
      
      if (versionData?.value) {
        setVersion(versionData.value as unknown as AppVersion);
      }

      // Fetch stats
      const [
        { count: totalUsers },
        { count: pendingUsers },
        { count: totalJobs },
        { count: totalLogs },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('job_logs').select('*', { count: 'exact', head: true }),
        supabase.from('system_logs').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        pendingUsers: pendingUsers || 0,
        totalJobs: totalJobs || 0,
        totalLogs: totalLogs || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDeveloper) {
      fetchData();
    }
  }, [isDeveloper]);

  const handlePushUpdate = async () => {
    if (!newVersion.match(/^\d+\.\d+\.\d+$/)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Version',
        description: 'Version must be in format X.Y.Z (e.g., 1.0.1)',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          value: { current: version?.current, latest: newVersion },
          updated_by: user?.id,
        })
        .eq('key', 'version');

      if (error) throw error;

      await supabase.from('system_logs').insert({
        actor_id: user?.id,
        action_type: 'version_pushed',
        details: { new_version: newVersion, old_version: version?.latest },
      });

      toast({
        title: 'Update Pushed!',
        description: `Version ${newVersion} is now available.`,
      });

      setVersion(prev => prev ? { ...prev, latest: newVersion } : null);
      setNewVersion('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isDeveloper) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <GlassCard className="max-w-md text-center">
            <AlertTriangle size={48} className="mx-auto text-warning mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              Only developers can access this panel.
            </p>
          </GlassCard>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Developer Panel</h1>
          <p className="text-muted-foreground mt-1">System management and updates</p>
        </div>

        {/* Version Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-full bg-primary/20 text-primary">
                <Rocket size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Version Control</h3>
                <p className="text-sm text-muted-foreground">Manage app versions</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                <span className="text-muted-foreground">Current Version</span>
                <span className="font-mono text-primary">{version?.current || '1.0.0'}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                <span className="text-muted-foreground">Latest Version</span>
                <span className="font-mono text-primary">{version?.latest || '1.0.0'}</span>
              </div>
              
              {version?.current !== version?.latest && (
                <div className="p-3 rounded-xl bg-warning/20 text-warning text-sm">
                  <AlertTriangle size={16} className="inline mr-2" />
                  Update available! Users will be notified on login.
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-full bg-primary/20 text-primary">
                <Upload size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Push Update</h3>
                <p className="text-sm text-muted-foreground">Release new version</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newVersion">New Version Number</Label>
                <Input
                  id="newVersion"
                  placeholder="e.g., 1.0.1"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="glass-input font-mono"
                />
              </div>
              <Button
                onClick={handlePushUpdate}
                disabled={loading || !newVersion}
                className="w-full rounded-full neon-glow"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Rocket className="w-4 h-4 mr-2" />
                )}
                Push Update
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<Users size={24} />}
          />
          <StatCard
            title="Pending Approvals"
            value={stats.pendingUsers}
            icon={<AlertTriangle size={24} />}
          />
          <StatCard
            title="Total Jobs Logged"
            value={stats.totalJobs}
            icon={<Database size={24} />}
          />
          <StatCard
            title="System Logs"
            value={stats.totalLogs}
            icon={<Activity size={24} />}
          />
        </div>

        {/* System Health */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Server size={20} className="text-primary" />
            System Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
              <CheckCircle className="text-primary" size={24} />
              <div>
                <p className="font-medium">Database</p>
                <p className="text-sm text-muted-foreground">Connected</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
              <CheckCircle className="text-primary" size={24} />
              <div>
                <p className="font-medium">Authentication</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
              <CheckCircle className="text-primary" size={24} />
              <div>
                <p className="font-medium">API Endpoints</p>
                <p className="text-sm text-muted-foreground">Ready for TMP APIs</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* API Integration Placeholder */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Code size={20} className="text-primary" />
            TruckersMP API Integration
          </h3>
          <div className="p-6 rounded-xl border border-dashed border-border/50 text-center">
            <Code size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-2">API integration placeholder</p>
            <p className="text-sm text-muted-foreground">
              Space reserved for TruckersMP API endpoints. Configure your API keys and endpoints here.
            </p>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
}