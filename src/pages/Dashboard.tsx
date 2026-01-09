import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFleetStats, usePersonalStats, useWeeklyData } from '@/hooks/useFleetStats';
import { useEventReminders } from '@/hooks/useEventReminders';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard, StatCard } from '@/components/layout/GlassCard';
import { FeaturedEventsCarousel } from '@/components/events/FeaturedEventsCarousel';
import { supabase } from '@/integrations/supabase/client';
import { 
  Truck, 
  MapPin, 
  Fuel, 
  DollarSign, 
  Users, 
  TrendingUp,
  Trophy,
  Package,
  Bell,
  Megaphone
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  expires_at: string | null;
}

// Chart colors from design system
const CHART_COLORS = [
  'hsl(145, 85%, 45%)',   // Primary green
  'hsl(200, 80%, 50%)',   // Blue
  'hsl(280, 70%, 55%)',   // Purple
  'hsl(45, 90%, 55%)',    // Gold
  'hsl(350, 75%, 55%)',   // Red
  'hsl(175, 70%, 45%)',   // Teal
];

export default function Dashboard() {
  const { user, profile, roles, isApproved, isStaff } = useAuth();
  const { stats, leaderboard, loading: fleetLoading } = useFleetStats();
  const { stats: personalStats, loading: personalLoading } = usePersonalStats(user?.id);
  const { weeklyData, loading: weeklyLoading } = useWeeklyData();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Initialize event reminders
  useEventReminders();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data) {
        setAnnouncements(data as Announcement[]);
      }
    };
    fetchAnnouncements();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Pie chart data for delivery distribution
  const pieData = leaderboard.slice(0, 5).map((driver, index) => ({
    name: driver.username,
    value: Number(driver.total_distance),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const priorityColors = {
    low: 'bg-muted/50 border-muted-foreground/30',
    normal: 'bg-primary/10 border-primary/30',
    high: 'bg-warning/20 border-warning/50',
    urgent: 'bg-destructive/20 border-destructive/50',
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, <span className="gradient-text">{profile?.username || 'Driver'}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {isApproved ? "Here's your fleet overview" : "Your account is pending approval"}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Live Dashboard</span>
          </div>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <GlassCard 
                key={announcement.id} 
                className={`border ${priorityColors[announcement.priority]}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${
                    announcement.priority === 'urgent' ? 'bg-destructive/20 text-destructive' :
                    announcement.priority === 'high' ? 'bg-warning/20 text-warning' :
                    'bg-primary/20 text-primary'
                  }`}>
                    <Megaphone size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{announcement.title}</h3>
                      {announcement.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs uppercase">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(announcement.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {!isApproved && (
          <GlassCard className="border-warning/50 bg-warning/5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-warning/20 text-warning">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-warning">Account Pending Approval</h3>
                <p className="text-muted-foreground text-sm">
                  Your account is awaiting HR approval. Some features may be limited until approved.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Fleet Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Fleet Distance"
            value={stats ? `${formatNumber(stats.total_distance)} km` : '0 km'}
            icon={<MapPin size={24} />}
            subtitle="All drivers combined"
          />
          <StatCard
            title="Total Deliveries"
            value={stats ? formatNumber(stats.total_deliveries) : '0'}
            icon={<Package size={24} />}
            subtitle="Completed jobs"
          />
          <StatCard
            title="Fleet Revenue"
            value={stats ? formatCurrency(stats.total_income) : '$0'}
            icon={<DollarSign size={24} />}
            subtitle="Total earnings"
          />
          <StatCard
            title="Active Drivers"
            value={stats?.active_drivers || '0'}
            icon={<Users size={24} />}
            subtitle="Approved members"
          />
        </div>
        {/* Featured Events Carousel */}
        <FeaturedEventsCarousel />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distance Chart */}
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Weekly Distance Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="distanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(145, 85%, 45%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(145, 85%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 20%)" />
                  <XAxis dataKey="day" stroke="hsl(0, 0%, 60%)" fontSize={12} />
                  <YAxis stroke="hsl(0, 0%, 60%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(220, 15%, 10%)', 
                      border: '1px solid hsl(145, 40%, 25%)',
                      borderRadius: '12px',
                      boxShadow: '0 0 20px hsl(145, 85%, 45%, 0.2)'
                    }}
                    labelStyle={{ color: 'hsl(150, 80%, 90%)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="distance" 
                    stroke="hsl(145, 85%, 50%)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#distanceGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Income Chart - Colorful Bars */}
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Weekly Revenue</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(200, 80%, 55%)" />
                      <stop offset="100%" stopColor="hsl(145, 85%, 45%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 20%)" />
                  <XAxis dataKey="day" stroke="hsl(0, 0%, 60%)" fontSize={12} />
                  <YAxis stroke="hsl(0, 0%, 60%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(220, 15%, 10%)', 
                      border: '1px solid hsl(145, 40%, 25%)',
                      borderRadius: '12px',
                      boxShadow: '0 0 20px hsl(145, 85%, 45%, 0.2)'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    labelStyle={{ color: 'hsl(150, 80%, 90%)' }}
                  />
                  <Bar 
                    dataKey="income" 
                    fill="url(#incomeGradient)" 
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* Personal Stats & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Quick Stats */}
          <GlassCard className="lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Your Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                <span className="text-muted-foreground">Total Distance</span>
                <span className="font-bold text-primary">
                  {personalStats ? `${formatNumber(personalStats.total_distance)} km` : '0 km'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                <span className="text-muted-foreground">Deliveries</span>
                <span className="font-bold text-primary">
                  {personalStats?.total_deliveries || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                <span className="text-muted-foreground">Total Earnings</span>
                <span className="font-bold text-primary">
                  {personalStats ? formatCurrency(personalStats.total_income) : '$0'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                <span className="text-muted-foreground">Avg Damage</span>
                <span className="font-bold text-primary">
                  {personalStats ? `${personalStats.avg_damage.toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Leaderboard */}
          <GlassCard className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy size={20} className="text-primary" />
              Top 10 Drivers
            </h3>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No data yet. Start logging jobs!</p>
              ) : (
                leaderboard.map((driver, index) => (
                  <div 
                    key={driver.user_id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                      index === 1 ? 'bg-gray-400/20 text-gray-400' :
                      index === 2 ? 'bg-orange-500/20 text-orange-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    {driver.avatar_url ? (
                      <img 
                        src={driver.avatar_url} 
                        alt={driver.username}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold ${driver.avatar_url ? 'hidden' : ''}`}>
                      {driver.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{driver.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.total_deliveries} deliveries
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatNumber(Number(driver.total_distance))} km</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(Number(driver.total_earnings))}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Fleet Summary Footer */}
        <GlassCard>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-muted-foreground text-sm">Total Fuel Used</p>
              <p className="text-2xl font-bold gradient-text">
                {stats ? `${formatNumber(stats.total_fuel)} L` : '0 L'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total Expenses</p>
              <p className="text-2xl font-bold text-destructive">
                {stats ? formatCurrency(stats.total_expenses) : '$0'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Net Profit</p>
              <p className="text-2xl font-bold gradient-text">
                {stats ? formatCurrency(stats.total_profit) : '$0'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Avg Load Weight</p>
              <p className="text-2xl font-bold gradient-text">
                {stats ? `${formatNumber(stats.avg_load_weight)} t` : '0 t'}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
