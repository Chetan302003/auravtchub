import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FleetStats {
  total_distance: number;
  total_deliveries: number;
  total_fuel: number;
  total_income: number;
  total_expenses: number;
  total_profit: number;
  active_drivers: number;
  avg_load_weight: number;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_distance: number;
  total_deliveries: number;
  total_earnings: number;
}

export function useFleetStats() {
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_fleet_stats');
      
      if (error) throw error;
      setStats(data as unknown as FleetStats);
    } catch (err: any) {
      console.error('Error fetching fleet stats:', err);
      setError(err.message);
    }
  };

  const fetchLeaderboard = async (limit = 10) => {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard', { limit_count: limit });
      
      if (error) throw error;
      setLeaderboard(data as unknown as LeaderboardEntry[]);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLeaderboard()]);
      setLoading(false);
    };

    loadData();
  }, []);

  const refresh = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchLeaderboard()]);
    setLoading(false);
  };

  return {
    stats,
    leaderboard,
    loading,
    error,
    refresh
  };
}

export function usePersonalStats(userId: string | undefined) {
  const [stats, setStats] = useState<{
    total_distance: number;
    total_deliveries: number;
    total_income: number;
    total_fuel: number;
    avg_damage: number;
  } | null>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchPersonalStats = async () => {
      setLoading(true);
      try {
        // Fetch job logs for this user
        const { data: jobs, error } = await supabase
          .from('job_logs')
          .select('*')
          .eq('user_id', userId)
          .order('delivery_date', { ascending: false });

        if (error) throw error;

        if (jobs && jobs.length > 0) {
          const total_distance = jobs.reduce((sum, j) => sum + Number(j.distance_km || 0), 0);
          const total_income = jobs.reduce((sum, j) => sum + Number(j.income || 0), 0);
          const total_fuel = jobs.reduce((sum, j) => sum + Number(j.fuel_consumed || 0), 0);
          const avg_damage = jobs.reduce((sum, j) => sum + Number(j.damage_percent || 0), 0) / jobs.length;

          setStats({
            total_distance,
            total_deliveries: jobs.length,
            total_income,
            total_fuel,
            avg_damage
          });
          setRecentJobs(jobs.slice(0, 10));
        } else {
          setStats({
            total_distance: 0,
            total_deliveries: 0,
            total_income: 0,
            total_fuel: 0,
            avg_damage: 0
          });
          setRecentJobs([]);
        }
      } catch (err) {
        console.error('Error fetching personal stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalStats();
  }, [userId]);

  return { stats, recentJobs, loading };
}