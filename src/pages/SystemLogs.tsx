import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/layout/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Search, 
  RefreshCw,
  User,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Trash,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface SystemLog {
  id: string;
  actor_id: string;
  action_type: string;
  target_user_id: string | null;
  details: any;
  created_at: string;
  actor_username?: string;
  target_username?: string;
}

const ACTION_ICONS: Record<string, any> = {
  user_approved: UserCheck,
  user_rejected: UserX,
  role_changed: Shield,
  profile_updated: Edit,
  data_deleted: Trash,
  default: FileText,
};

const ACTION_COLORS: Record<string, string> = {
  user_approved: 'text-primary bg-primary/20',
  user_rejected: 'text-destructive bg-destructive/20',
  role_changed: 'text-warning bg-warning/20',
  profile_updated: 'text-blue-500 bg-blue-500/20',
  data_deleted: 'text-destructive bg-destructive/20',
  default: 'text-muted-foreground bg-muted/20',
};

export default function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch usernames for actors and targets
      const userIds = new Set<string>();
      (data || []).forEach(log => {
        if (log.actor_id) userIds.add(log.actor_id);
        if (log.target_user_id) userIds.add(log.target_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', Array.from(userIds));

      const userMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);

      const logsWithNames = (data || []).map(log => ({
        ...log,
        actor_username: userMap.get(log.actor_id) || 'Unknown',
        target_username: log.target_user_id ? userMap.get(log.target_user_id) || 'Unknown' : null,
      }));

      setLogs(logsWithNames);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionTypes = [...new Set(logs.map(l => l.action_type))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.actor_username?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_username?.toLowerCase().includes(search.toLowerCase()) ||
      log.action_type.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    return matchesSearch && matchesAction;
  });

  const formatActionType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">System Logs</h1>
            <p className="text-muted-foreground mt-1">Audit trail of all system actions</p>
          </div>
          <Button onClick={fetchLogs} variant="outline" className="rounded-full gap-2">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <GlassCard>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 glass-input"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px] glass-input">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatActionType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GlassCard>

        {/* Logs List */}
        <GlassCard noPadding>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No logs found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filteredLogs.map((log) => {
                const Icon = ACTION_ICONS[log.action_type] || ACTION_ICONS.default;
                const colorClass = ACTION_COLORS[log.action_type] || ACTION_COLORS.default;
                
                return (
                  <div key={log.id} className="p-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.actor_username}</span>
                          <span className="text-muted-foreground">performed</span>
                          <span className="font-medium text-primary">
                            {formatActionType(log.action_type)}
                          </span>
                          {log.target_username && (
                            <>
                              <span className="text-muted-foreground">on</span>
                              <span className="font-medium">{log.target_username}</span>
                            </>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </AppLayout>
  );
}