import { useAuth } from '@/hooks/useAuth';
import { usePersonalStats } from '@/hooks/useFleetStats';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard, StatCard } from '@/components/layout/GlassCard';
import { 
  MapPin, 
  Fuel, 
  DollarSign, 
  Package,
  AlertTriangle,
  Calendar,
  Truck,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

export default function MyStats() {
  const { user, profile } = useAuth();
  const { stats, recentJobs, loading } = usePersonalStats(user?.id);

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
    }).format(num);
  };

  // Transform recent jobs for chart
  const chartData = recentJobs
    .slice(0, 7)
    .reverse()
    .map((job: any) => ({
      date: format(new Date(job.delivery_date), 'MMM dd'),
      distance: Number(job.distance_km) || 0,
      income: Number(job.income) || 0,
    }));

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">My Statistics</h1>
          <p className="text-muted-foreground mt-1">Your personal driving performance</p>
        </div>

        {/* Personal Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Distance"
            value={stats ? `${formatNumber(stats.total_distance)} km` : '0 km'}
            icon={<MapPin size={24} />}
            subtitle="Lifetime distance"
          />
          <StatCard
            title="Total Deliveries"
            value={stats?.total_deliveries || 0}
            icon={<Package size={24} />}
            subtitle="Completed jobs"
          />
          <StatCard
            title="Total Earnings"
            value={stats ? formatCurrency(stats.total_income) : '$0'}
            icon={<DollarSign size={24} />}
            subtitle="All time"
          />
          <StatCard
            title="Average Damage"
            value={stats ? `${stats.avg_damage.toFixed(1)}%` : '0%'}
            icon={<AlertTriangle size={24} />}
            subtitle="Per delivery"
          />
        </div>

        {/* Performance Chart */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4">Recent Performance</h3>
          {chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="personalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(150, 100%, 50%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(150, 100%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 30%, 20%)" />
                  <XAxis dataKey="date" stroke="hsl(0, 0%, 60%)" />
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
                    fill="url(#personalGradient)"
                    name="Distance (km)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Truck size={48} className="mx-auto mb-4 opacity-50" />
                <p>No job data yet. Start logging your deliveries!</p>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Recent Jobs Table */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4">Recent Deliveries</h3>
          {recentJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Route</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Cargo</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Distance</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Income</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Damage</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job: any) => (
                    <tr key={job.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(job.delivery_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {job.origin_city || '—'} → {job.destination_city || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {job.cargo_type || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-medium text-primary">
                          {formatNumber(Number(job.distance_km))} km
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-medium text-primary">
                          {formatCurrency(Number(job.income))}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-medium ${
                          Number(job.damage_percent) > 5 ? 'text-destructive' : 'text-primary'
                        }`}>
                          {Number(job.damage_percent).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No deliveries logged yet. Start by logging your first job!</p>
            </div>
          )}
        </GlassCard>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20 text-primary">
                <Fuel size={24} />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total Fuel Used</p>
                <p className="text-2xl font-bold">
                  {stats ? `${formatNumber(stats.total_fuel)} L` : '0 L'}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20 text-primary">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Avg Income/Delivery</p>
                <p className="text-2xl font-bold">
                  {stats && stats.total_deliveries > 0 
                    ? formatCurrency(stats.total_income / stats.total_deliveries) 
                    : '$0'}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20 text-primary">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Avg Distance/Delivery</p>
                <p className="text-2xl font-bold">
                  {stats && stats.total_deliveries > 0 
                    ? `${formatNumber(stats.total_distance / stats.total_deliveries)} km` 
                    : '0 km'}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  );
}