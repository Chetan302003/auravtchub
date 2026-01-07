import { useAuth } from '@/hooks/useAuth';
import { useFleetStats, usePersonalStats } from '@/hooks/useFleetStats';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard, StatCard } from '@/components/layout/GlassCard';
import { 
  Truck, 
  MapPin, 
  Fuel, 
  DollarSign, 
  Users, 
  TrendingUp,
  Trophy,
  Package
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
  Bar
} from 'recharts';

// Sample data for charts (would come from API in production)
const weeklyData = [
  { day: 'Mon', distance: 1200, income: 4500 },
  { day: 'Tue', distance: 1800, income: 6200 },
  { day: 'Wed', distance: 1400, income: 5100 },
  { day: 'Thu', distance: 2100, income: 7800 },
  { day: 'Fri', distance: 1900, income: 6900 },
  { day: 'Sat', distance: 2400, income: 8500 },
  { day: 'Sun', distance: 1600, income: 5800 },
];

export default function Dashboard() {
  const { user, profile, roles, isApproved, isStaff } = useAuth();
  const { stats, leaderboard, loading: fleetLoading } = useFleetStats();
  const { stats: personalStats, loading: personalLoading } = usePersonalStats(user?.id);

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
            value={stats ? `${formatNumber(stats.total_distance)} km` : '—'}
            icon={<MapPin size={24} />}
            subtitle="All drivers combined"
          />
          <StatCard
            title="Total Deliveries"
            value={stats ? formatNumber(stats.total_deliveries) : '—'}
            icon={<Package size={24} />}
            subtitle="Completed jobs"
          />
          <StatCard
            title="Fleet Revenue"
            value={stats ? formatCurrency(stats.total_income) : '—'}
            icon={<DollarSign size={24} />}
            subtitle="Total earnings"
          />
          <StatCard
            title="Active Drivers"
            value={stats?.active_drivers || '—'}
            icon={<Users size={24} />}
            subtitle="Approved members"
          />
        </div>

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
                      <stop offset="5%" stopColor="hsl(150, 100%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(150, 100%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 20%)" />
                  <XAxis dataKey="day" stroke="hsl(0, 0%, 60%)" />
                  <YAxis stroke="hsl(0, 0%, 60%)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(0, 0%, 8%)', 
                      border: '1px solid hsl(150, 30%, 20%)',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="distance" 
                    stroke="hsl(150, 100%, 50%)" 
                    fillOpacity={1} 
                    fill="url(#distanceGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Income Chart */}
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Weekly Revenue</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 20%)" />
                  <XAxis dataKey="day" stroke="hsl(0, 0%, 60%)" />
                  <YAxis stroke="hsl(0, 0%, 60%)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(0, 0%, 8%)', 
                      border: '1px solid hsl(150, 30%, 20%)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Bar 
                    dataKey="income" 
                    fill="hsl(150, 100%, 50%)" 
                    radius={[4, 4, 0, 0]}
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
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
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
                {stats ? `${formatNumber(stats.total_fuel)} L` : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total Expenses</p>
              <p className="text-2xl font-bold text-destructive">
                {stats ? formatCurrency(stats.total_expenses) : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Net Profit</p>
              <p className="text-2xl font-bold gradient-text">
                {stats ? formatCurrency(stats.total_profit) : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Avg Load Weight</p>
              <p className="text-2xl font-bold gradient-text">
                {stats ? `${formatNumber(stats.avg_load_weight)} t` : '—'}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
}