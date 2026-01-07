import { useState, useCallback } from 'react';

// TruckersMP API base URL
const TMP_API_BASE = 'https://api.truckersmp.com/v2';

export interface TMPPlayer {
  id: number;
  name: string;
  avatar: string;
  smallAvatar: string;
  joinDate: string;
  steamID64: string;
  groupName?: string;
  groupColor?: string;
  banned: boolean;
  displayVTCHistory: boolean;
  vtc?: {
    id: number;
    name: string;
    tag: string;
    inVTC: boolean;
    memberID: number;
  };
}

export interface TMPEvent {
  id: number;
  name: string;
  slug: string;
  game: string;
  server: {
    id: number;
    name: string;
  };
  language: string;
  departure: {
    location: string;
    city: string;
  };
  arrive: {
    location: string;
    city: string;
  };
  startAt: string;
  meetupAt?: string;
  banner?: string;
  map?: string;
  description?: string;
  attendances: {
    confirmed: number;
    unsure: number;
  };
  vtc?: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    username: string;
  };
  featured: boolean;
}

export interface TMPServer {
  id: number;
  game: string;
  ip: string;
  port: number;
  name: string;
  shortname: string;
  idprefix?: string;
  online: boolean;
  players: number;
  queue: number;
  maxplayers: number;
  mapid: number;
  displayorder: number;
  speedlimiter: number;
  collisions: boolean;
  carsforplayers: boolean;
  policecarsforplayers: boolean;
  afkenabled: boolean;
  event: boolean;
  specialEvent: boolean;
  promods: boolean;
  syncdelay: number;
}

// Placeholder function - TruckersMP API has CORS restrictions
// In production, this would need to go through an edge function
async function fetchFromTMP<T>(endpoint: string): Promise<T | null> {
  try {
    // Note: Direct API calls will fail due to CORS
    // This is a placeholder for edge function integration
    console.log(`[TMP API] Would fetch: ${TMP_API_BASE}${endpoint}`);
    return null;
  } catch (error) {
    console.error(`[TMP API] Error fetching ${endpoint}:`, error);
    return null;
  }
}

export function useTruckersMP() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch player data by TruckersMP ID
  const getPlayer = useCallback(async (tmpId: string): Promise<TMPPlayer | null> => {
    setLoading(true);
    setError(null);
    try {
      // Placeholder - would call edge function
      const data = await fetchFromTMP<{ response: TMPPlayer }>(`/player/${tmpId}`);
      return data?.response || null;
    } catch (err) {
      setError('Failed to fetch player data');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch player avatar URL (returns placeholder if not available)
  const getPlayerAvatar = useCallback((tmpId: string, size: 'small' | 'large' = 'small'): string => {
    // Placeholder avatar - in production this would fetch real data
    return `https://static.truckersmp.com/images/default_avatar.png`;
  }, []);

  // Fetch upcoming events
  const getEvents = useCallback(async (): Promise<TMPEvent[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFromTMP<{ response: TMPEvent[] }>('/events');
      return data?.response || [];
    } catch (err) {
      setError('Failed to fetch events');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch server status
  const getServers = useCallback(async (): Promise<TMPServer[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFromTMP<{ response: TMPServer[] }>('/servers');
      return data?.response || [];
    } catch (err) {
      setError('Failed to fetch servers');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate TruckersMP ID format
  const isValidTMPId = useCallback((tmpId: string): boolean => {
    // TMP IDs are numeric strings
    return /^\d+$/.test(tmpId);
  }, []);

  return {
    loading,
    error,
    getPlayer,
    getPlayerAvatar,
    getEvents,
    getServers,
    isValidTMPId,
  };
}

// Edge function endpoint placeholder for future implementation
export const TMP_EDGE_ENDPOINTS = {
  player: '/functions/v1/tmp-player',
  events: '/functions/v1/tmp-events',
  servers: '/functions/v1/tmp-servers',
} as const;
