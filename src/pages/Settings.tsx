import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/layout/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Truck,
  Save,
  Loader2,
  Shield,
  Key
} from 'lucide-react';

export default function Settings() {
  const { user, profile, roles } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tmpId, setTmpId] = useState(profile?.tmp_id || '');
  const { toast } = useToast();

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ tmp_id: tmpId || null })
      .eq('user_id', user.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Profile Updated',
        description: 'Your settings have been saved.',
      });
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings</p>
        </div>

        {/* Profile Info */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <User size={20} className="text-primary" />
            Profile Information
          </h3>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-3xl neon-pulse">
                {profile?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-xl font-semibold">{profile?.username}</p>
                <p className="text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail size={16} />
                Email Address
              </Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="glass-input opacity-60"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tmpId" className="flex items-center gap-2">
                <Truck size={16} />
                TruckersMP ID
              </Label>
              <Input
                id="tmpId"
                placeholder="Your TMP ID for avatar"
                value={tmpId}
                onChange={(e) => setTmpId(e.target.value)}
                className="glass-input"
              />
              <p className="text-xs text-muted-foreground">
                Used to fetch your TruckersMP profile avatar
              </p>
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="rounded-full neon-glow"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </GlassCard>

        {/* Account Status */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            Account Status
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 rounded-xl bg-muted/30">
              <div>
                <p className="font-medium">Approval Status</p>
                <p className="text-sm text-muted-foreground">Your account verification status</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                profile?.approval_status === 'approved' 
                  ? 'bg-primary/20 text-primary'
                  : profile?.approval_status === 'pending'
                  ? 'bg-warning/20 text-warning'
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {profile?.approval_status || 'pending'}
              </span>
            </div>

            <div className="flex justify-between items-center p-4 rounded-xl bg-muted/30">
              <div>
                <p className="font-medium">Role</p>
                <p className="text-sm text-muted-foreground">Your assigned role in the VTC</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                {roles[0]?.replace('_', ' ').toUpperCase() || 'DRIVER'}
              </span>
            </div>

            <div className="flex justify-between items-center p-4 rounded-xl bg-muted/30">
              <div>
                <p className="font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">Account creation date</p>
              </div>
              <span className="text-muted-foreground text-sm">
                {profile?.created_at 
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : '—'}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Security */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Key size={20} className="text-primary" />
            Security
          </h3>

          <div className="p-4 rounded-xl bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Password changes and account security settings can be managed through the HR team. 
              Contact an administrator if you need to update your credentials.
            </p>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
}