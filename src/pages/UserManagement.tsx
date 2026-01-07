import { useState, useEffect } from 'react';
import { useAuth, AppRole } from '@/hooks/useAuth';
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
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  Shield,
  Clock,
  UserCheck,
  UserX,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  email: string;
  tmp_id: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  roles: AppRole[];
}

const ROLES: AppRole[] = ['developer', 'superadmin', 'founder', 'management', 'hr', 'event_team', 'media', 'driver'];

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const canManageRoles = hasRole('developer') || hasRole('superadmin') || hasRole('founder') || hasRole('hr');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        roles: (rolesData || [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role as AppRole),
      }));

      setUsers(usersWithRoles);
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('user_id', userId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'User Approved', description: 'User can now access the system.' });
      
      // Log action
      await supabase.from('system_logs').insert({
        actor_id: user?.id,
        action_type: 'user_approved',
        target_user_id: userId,
        details: { action: 'approved' },
      });
      
      fetchUsers();
    }
  };

  const handleReject = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'rejected' })
      .eq('user_id', userId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'User Rejected', description: 'User access has been denied.' });
      
      await supabase.from('system_logs').insert({
        actor_id: user?.id,
        action_type: 'user_rejected',
        target_user_id: userId,
        details: { action: 'rejected' },
      });
      
      fetchUsers();
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole, currentRoles: AppRole[]) => {
    try {
      // Remove old roles except the new one
      const rolesToRemove = currentRoles.filter(r => r !== newRole);
      
      if (rolesToRemove.length > 0) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .in('role', rolesToRemove);
      }

      // Check if new role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', newRole)
        .single();

      if (!existingRole) {
        await supabase.from('user_roles').insert({
          user_id: userId,
          role: newRole,
          assigned_by: user?.id,
        });
      }

      await supabase.from('system_logs').insert({
        actor_id: user?.id,
        action_type: 'role_changed',
        target_user_id: userId,
        details: { new_role: newRole, old_roles: currentRoles },
      });

      toast({ title: 'Role Updated', description: `User role changed to ${newRole}.` });
      fetchUsers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
                         u.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || u.approval_status === filter;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = users.filter(u => u.approval_status === 'pending').length;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage driver accounts and roles</p>
          </div>
          <div className="flex items-center gap-4">
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-warning/20 text-warning">
                <Clock size={18} />
                <span>{pendingCount} pending</span>
              </div>
            )}
            <Button onClick={fetchUsers} variant="outline" className="rounded-full gap-2">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <GlassCard>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search by username or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 glass-input"
              />
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[180px] glass-input">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </GlassCard>

        {/* Users Table */}
        <GlassCard noPadding>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>No users found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left py-4 px-6 text-muted-foreground font-medium">User</th>
                    <th className="text-left py-4 px-6 text-muted-foreground font-medium">TMP ID</th>
                    <th className="text-left py-4 px-6 text-muted-foreground font-medium">Role</th>
                    <th className="text-left py-4 px-6 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-4 px-6 text-muted-foreground font-medium">Joined</th>
                    <th className="text-right py-4 px-6 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.username}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-muted-foreground">{u.tmp_id || '—'}</span>
                      </td>
                      <td className="py-4 px-6">
                        {canManageRoles ? (
                          <Select 
                            value={u.roles[0] || 'driver'} 
                            onValueChange={(v) => handleRoleChange(u.user_id, v as AppRole, u.roles)}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(role => (
                                <SelectItem key={role} value={role}>
                                  {role.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs">
                            {u.roles[0]?.replace('_', ' ') || 'driver'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          u.approval_status === 'approved' ? 'bg-primary/20 text-primary' :
                          u.approval_status === 'pending' ? 'bg-warning/20 text-warning' :
                          'bg-destructive/20 text-destructive'
                        }`}>
                          {u.approval_status === 'approved' ? <CheckCircle size={12} /> :
                           u.approval_status === 'pending' ? <Clock size={12} /> :
                           <XCircle size={12} />}
                          {u.approval_status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(u.created_at), 'MMM dd, yyyy')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          {u.approval_status === 'pending' && canManageRoles && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApprove(u.user_id)}
                                className="text-primary hover:text-primary hover:bg-primary/20"
                              >
                                <UserCheck size={18} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReject(u.user_id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/20"
                              >
                                <UserX size={18} />
                              </Button>
                            </>
                          )}
                          {u.approval_status === 'rejected' && canManageRoles && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(u.user_id)}
                              className="text-primary hover:text-primary hover:bg-primary/20"
                            >
                              <UserCheck size={18} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </AppLayout>
  );
}