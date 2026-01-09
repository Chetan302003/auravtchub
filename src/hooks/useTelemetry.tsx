import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Telemetry data structure from ETS2/ATS telemetry server
 * This hook is designed to be Tauri-ready - the WebSocket connection
 * can be replaced with Tauri commands when converting to desktop app.
 * 
 * For desktop app conversion:
 * 1. Use Tauri's `invoke` to call Rust functions that read telemetry
 * 2. Or use Tauri's HTTP client to connect to local telemetry server
 * 3. The data structure remains the same
 */

export interface TelemetryTruck {
  id: string;
  make: string;
  model: string;
  speed: number;
  speedLimit: number;
  cruiseControl: number;
  cruiseControlOn: boolean;
  fuel: number;
  fuelCapacity: number;
  fuelAvgConsumption: number;
  odometer: number;
  engineRpm: number;
  engineRpmMax: number;
  gear: number;
  gearForward: number;
  gearReverse: number;
  engineOn: boolean;
  electricOn: boolean;
  wipersOn: boolean;
  lightsBeam: {
    low: boolean;
    high: boolean;
  };
  blinker: {
    left: boolean;
    right: boolean;
  };
  damage: {
    engine: number;
    transmission: number;
    cabin: number;
    chassis: number;
    wheels: number;
    total: number;
  };
}

export interface TelemetryTrailer {
  attached: boolean;
  id: string;
  name: string;
  mass: number;
  damage: number;
}

export interface TelemetryJob {
  income: number;
  deadlineTime: string;
  remainingTime: number;
  sourceCity: string;
  sourceCompany: string;
  destinationCity: string;
  destinationCompany: string;
  cargo: string;
  cargoMass: number;
  cargoDamage: number;
  isSpecial: boolean;
  market: string;
}

export interface TelemetryNavigation {
  estimatedTime: number;
  estimatedDistance: number;
  speedLimit: number;
}

export interface TelemetryGame {
  connected: boolean;
  paused: boolean;
  time: string;
  timeScale: number;
  nextRestStop: number;
  version: string;
  game: 'ets2' | 'ats' | 'unknown';
  telemetryVersion: string;
}

export interface TelemetryData {
  game: TelemetryGame;
  truck: TelemetryTruck;
  trailer: TelemetryTrailer;
  job: TelemetryJob | null;
  navigation: TelemetryNavigation;
}

export interface TelemetryConfig {
  /** WebSocket URL for telemetry server (default: ws://localhost:25555) */
  wsUrl?: string;
  /** HTTP URL for telemetry server (default: http://localhost:25555) */
  httpUrl?: string;
  /** Polling interval in ms when using HTTP (default: 100) */
  pollingInterval?: number;
  /** Connection mode: 'websocket' | 'http' | 'auto' (default: 'auto') */
  mode?: 'websocket' | 'http' | 'auto';
  /** Enable auto-reconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelay?: number;
}

const defaultConfig: Required<TelemetryConfig> = {
  wsUrl: 'ws://localhost:25555',
  httpUrl: 'http://localhost:25555/api/ets2/telemetry',
  pollingInterval: 100,
  mode: 'auto',
  autoReconnect: true,
  reconnectDelay: 3000,
};

const defaultTelemetry: TelemetryData = {
  game: {
    connected: false,
    paused: false,
    time: '',
    timeScale: 1,
    nextRestStop: 0,
    version: '',
    game: 'unknown',
    telemetryVersion: '',
  },
  truck: {
    id: '',
    make: '',
    model: '',
    speed: 0,
    speedLimit: 0,
    cruiseControl: 0,
    cruiseControlOn: false,
    fuel: 0,
    fuelCapacity: 0,
    fuelAvgConsumption: 0,
    odometer: 0,
    engineRpm: 0,
    engineRpmMax: 0,
    gear: 0,
    gearForward: 0,
    gearReverse: 0,
    engineOn: false,
    electricOn: false,
    wipersOn: false,
    lightsBeam: { low: false, high: false },
    blinker: { left: false, right: false },
    damage: { engine: 0, transmission: 0, cabin: 0, chassis: 0, wheels: 0, total: 0 },
  },
  trailer: {
    attached: false,
    id: '',
    name: '',
    mass: 0,
    damage: 0,
  },
  job: null,
  navigation: {
    estimatedTime: 0,
    estimatedDistance: 0,
    speedLimit: 0,
  },
};

/**
 * Hook for reading ETS2/ATS telemetry data
 * 
 * TAURI CONVERSION NOTES:
 * -----------------------
 * When converting to Tauri desktop app:
 * 
 * 1. Replace WebSocket/HTTP with Tauri invoke:
 *    ```rust
 *    #[tauri::command]
 *    fn get_telemetry() -> Result<TelemetryData, String> {
 *      // Read from telemetry SDK or shared memory
 *    }
 *    ```
 * 
 * 2. Use Tauri events for real-time updates:
 *    ```typescript
 *    import { listen } from '@tauri-apps/api/event';
 *    listen('telemetry-update', (event) => {
 *      setData(event.payload as TelemetryData);
 *    });
 *    ```
 * 
 * 3. The hook interface stays the same - just swap the data source
 */
export function useTelemetry(config: TelemetryConfig = {}) {
  const mergedConfig = { ...defaultConfig, ...config };
  
  const [data, setData] = useState<TelemetryData>(defaultTelemetry);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);

  // Parse telemetry response to our format
  const parseTelemetryResponse = useCallback((raw: any): TelemetryData => {
    // Handle different telemetry server formats
    // This parser handles scs-sdk-plugin and trucksim-telemetry-server formats
    try {
      const game: TelemetryGame = {
        connected: raw.game?.connected ?? raw.connected ?? true,
        paused: raw.game?.paused ?? raw.paused ?? false,
        time: raw.game?.time ?? raw.time ?? '',
        timeScale: raw.game?.timeScale ?? raw.timeScale ?? 1,
        nextRestStop: raw.game?.nextRestStop ?? raw.nextRestStop ?? 0,
        version: raw.game?.version ?? raw.version ?? '',
        game: (raw.game?.game ?? raw.game_name ?? 'unknown') as 'ets2' | 'ats' | 'unknown',
        telemetryVersion: raw.game?.telemetryVersion ?? raw.sdk_version ?? '',
      };

      const truck: TelemetryTruck = {
        id: raw.truck?.id ?? raw.truck_id ?? '',
        make: raw.truck?.make ?? raw.truck_make ?? '',
        model: raw.truck?.model ?? raw.truck_model ?? '',
        speed: Math.abs(raw.truck?.speed ?? raw.speed ?? 0) * 3.6, // m/s to km/h
        speedLimit: (raw.truck?.speedLimit ?? raw.speed_limit ?? 0) * 3.6,
        cruiseControl: (raw.truck?.cruiseControl ?? raw.cruise_control ?? 0) * 3.6,
        cruiseControlOn: raw.truck?.cruiseControlOn ?? raw.cruise_control_on ?? false,
        fuel: raw.truck?.fuel ?? raw.fuel ?? 0,
        fuelCapacity: raw.truck?.fuelCapacity ?? raw.fuel_capacity ?? 0,
        fuelAvgConsumption: raw.truck?.fuelAvgConsumption ?? raw.fuel_avg_consumption ?? 0,
        odometer: raw.truck?.odometer ?? raw.odometer ?? 0,
        engineRpm: raw.truck?.engineRpm ?? raw.engine_rpm ?? 0,
        engineRpmMax: raw.truck?.engineRpmMax ?? raw.engine_rpm_max ?? 0,
        gear: raw.truck?.gear ?? raw.gear ?? 0,
        gearForward: raw.truck?.gearForward ?? raw.gear_forward ?? 0,
        gearReverse: raw.truck?.gearReverse ?? raw.gear_reverse ?? 0,
        engineOn: raw.truck?.engineOn ?? raw.engine_on ?? false,
        electricOn: raw.truck?.electricOn ?? raw.electric_on ?? false,
        wipersOn: raw.truck?.wipersOn ?? raw.wipers_on ?? false,
        lightsBeam: {
          low: raw.truck?.lightsBeam?.low ?? raw.lights_beam_low ?? false,
          high: raw.truck?.lightsBeam?.high ?? raw.lights_beam_high ?? false,
        },
        blinker: {
          left: raw.truck?.blinker?.left ?? raw.blinker_left ?? false,
          right: raw.truck?.blinker?.right ?? raw.blinker_right ?? false,
        },
        damage: {
          engine: raw.truck?.damage?.engine ?? raw.damage_engine ?? 0,
          transmission: raw.truck?.damage?.transmission ?? raw.damage_transmission ?? 0,
          cabin: raw.truck?.damage?.cabin ?? raw.damage_cabin ?? 0,
          chassis: raw.truck?.damage?.chassis ?? raw.damage_chassis ?? 0,
          wheels: raw.truck?.damage?.wheels ?? raw.damage_wheels ?? 0,
          total: raw.truck?.damage?.total ?? raw.damage_total ?? 0,
        },
      };

      const trailer: TelemetryTrailer = {
        attached: raw.trailer?.attached ?? raw.trailer_attached ?? false,
        id: raw.trailer?.id ?? raw.trailer_id ?? '',
        name: raw.trailer?.name ?? raw.trailer_name ?? '',
        mass: raw.trailer?.mass ?? raw.trailer_mass ?? 0,
        damage: raw.trailer?.damage ?? raw.trailer_damage ?? 0,
      };

      const job: TelemetryJob | null = raw.job ? {
        income: raw.job.income ?? 0,
        deadlineTime: raw.job.deadlineTime ?? raw.job.deadline_time ?? '',
        remainingTime: raw.job.remainingTime ?? raw.job.remaining_time ?? 0,
        sourceCity: raw.job.sourceCity ?? raw.job.source_city ?? '',
        sourceCompany: raw.job.sourceCompany ?? raw.job.source_company ?? '',
        destinationCity: raw.job.destinationCity ?? raw.job.destination_city ?? '',
        destinationCompany: raw.job.destinationCompany ?? raw.job.destination_company ?? '',
        cargo: raw.job.cargo ?? '',
        cargoMass: raw.job.cargoMass ?? raw.job.cargo_mass ?? 0,
        cargoDamage: raw.job.cargoDamage ?? raw.job.cargo_damage ?? 0,
        isSpecial: raw.job.isSpecial ?? raw.job.is_special ?? false,
        market: raw.job.market ?? '',
      } : null;

      const navigation: TelemetryNavigation = {
        estimatedTime: raw.navigation?.estimatedTime ?? raw.navigation_time ?? 0,
        estimatedDistance: raw.navigation?.estimatedDistance ?? raw.navigation_distance ?? 0,
        speedLimit: (raw.navigation?.speedLimit ?? raw.navigation_speed_limit ?? 0) * 3.6,
      };

      return { game, truck, trailer, job, navigation };
    } catch (err) {
      console.error('Error parsing telemetry:', err);
      return defaultTelemetry;
    }
  }, []);

  // HTTP polling connection
  const startHttpPolling = useCallback(() => {
    if (pollingRef.current) return;

    const poll = async () => {
      try {
        const response = await fetch(mergedConfig.httpUrl);
        if (response.ok) {
          const raw = await response.json();
          const parsed = parseTelemetryResponse(raw);
          setData(parsed);
          setConnected(true);
          setError(null);
          setLastUpdate(new Date());
        }
      } catch (err) {
        setConnected(false);
        setError('Failed to connect to telemetry server');
      }
    };

    poll();
    pollingRef.current = window.setInterval(poll, mergedConfig.pollingInterval);
  }, [mergedConfig.httpUrl, mergedConfig.pollingInterval, parseTelemetryResponse]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(mergedConfig.wsUrl);

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const parsed = parseTelemetryResponse(raw);
          setData(parsed);
          setLastUpdate(new Date());
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        setError('WebSocket error');
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        if (mergedConfig.autoReconnect) {
          reconnectRef.current = window.setTimeout(() => {
            if (mergedConfig.mode === 'auto') {
              startHttpPolling();
            } else {
              connectWebSocket();
            }
          }, mergedConfig.reconnectDelay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      setError('Failed to create WebSocket');
      if (mergedConfig.mode === 'auto') {
        startHttpPolling();
      }
    }
  }, [mergedConfig, parseTelemetryResponse, startHttpPolling]);

  // Start connection
  const connect = useCallback(() => {
    setError(null);
    
    if (mergedConfig.mode === 'websocket' || mergedConfig.mode === 'auto') {
      connectWebSocket();
    } else {
      startHttpPolling();
    }
  }, [mergedConfig.mode, connectWebSocket, startHttpPolling]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    setConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    data,
    connected,
    error,
    lastUpdate,
    connect,
    disconnect,
    isJobActive: !!data.job,
    isGameRunning: data.game.connected && !data.game.paused,
  };
}

/**
 * Hook for auto-logging jobs based on telemetry
 * Detects job completion and prepares data for logging
 */
export function useAutoJobLogger() {
  const { data, connected, isJobActive } = useTelemetry();
  const [pendingJob, setPendingJob] = useState<TelemetryJob | null>(null);
  const [jobStartData, setJobStartData] = useState<{
    startOdometer: number;
    startFuel: number;
  } | null>(null);

  // Track job start
  useEffect(() => {
    if (isJobActive && data.job && !jobStartData) {
      setJobStartData({
        startOdometer: data.truck.odometer,
        startFuel: data.truck.fuel,
      });
    }
  }, [isJobActive, data.job, data.truck.odometer, data.truck.fuel, jobStartData]);

  // Detect job completion (job was active, now gone)
  useEffect(() => {
    if (!isJobActive && jobStartData && data.job === null) {
      // Job just completed - we don't have the final job data anymore
      // In real implementation, we'd capture this before it disappears
      setJobStartData(null);
    }
  }, [isJobActive, jobStartData, data.job]);

  const prepareJobData = useCallback(() => {
    if (!data.job || !jobStartData) return null;

    const distanceKm = data.truck.odometer - jobStartData.startOdometer;
    const fuelConsumed = jobStartData.startFuel - data.truck.fuel;

    return {
      origin_city: data.job.sourceCity,
      destination_city: data.job.destinationCity,
      distance_km: Math.round(distanceKm),
      cargo_type: data.job.cargo,
      cargo_weight: data.job.cargoMass / 1000, // kg to tons
      fuel_consumed: Math.round(fuelConsumed),
      income: data.job.income,
      damage_percent: data.job.cargoDamage * 100,
    };
  }, [data.job, data.truck, jobStartData]);

  return {
    telemetryConnected: connected,
    currentJob: data.job,
    truckData: data.truck,
    pendingJob,
    prepareJobData,
    clearPendingJob: () => setPendingJob(null),
  };
}
