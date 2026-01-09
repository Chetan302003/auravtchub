import { useState } from 'react';
import { GlassCard } from '@/components/layout/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTelemetry, useAutoJobLogger } from '@/hooks/useTelemetry';
import {
  Truck,
  Fuel,
  Gauge,
  Navigation,
  Package,
  MapPin,
  Clock,
  AlertTriangle,
  Wifi,
  WifiOff,
  Play,
  Pause,
  ArrowRight,
  DollarSign,
  Wrench
} from 'lucide-react';

/**
 * Real-time telemetry display panel
 * 
 * TAURI CONVERSION NOTES:
 * -----------------------
 * This component works the same in Tauri. The useTelemetry hook
 * handles the data source abstraction.
 */
export function TelemetryPanel() {
  const { 
    data, 
    connected, 
    error, 
    connect, 
    disconnect,
    isGameRunning,
    isJobActive 
  } = useTelemetry();

  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    connect();
    // Give it a moment to attempt connection
    setTimeout(() => setIsConnecting(false), 2000);
  };

  const formatSpeed = (speed: number) => Math.round(speed);
  const formatDistance = (km: number) => km.toFixed(1);
  const formatFuel = (liters: number) => Math.round(liters);
  const formatDamage = (percent: number) => (percent * 100).toFixed(1);

  const fuelPercent = data.truck.fuelCapacity > 0 
    ? (data.truck.fuel / data.truck.fuelCapacity) * 100 
    : 0;

  const getDamageColor = (damage: number) => {
    if (damage < 0.1) return 'text-primary';
    if (damage < 0.3) return 'text-yellow-500';
    return 'text-destructive';
  };

  if (!connected) {
    return (
      <GlassCard className="p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
            <WifiOff size={32} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Telemetry Disconnected</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect to your ETS2/ATS telemetry server to see live data
            </p>
          </div>
          
          {error && (
            <div className="flex items-center justify-center gap-2 text-sm text-destructive">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="rounded-full neon-glow"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wifi size={16} className="mr-2" />
                  Connect Telemetry
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Requires ETS2/ATS Telemetry Server running on localhost:25555
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={isGameRunning 
              ? 'bg-primary/20 text-primary border-primary/40' 
              : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40'
            }
          >
            {isGameRunning ? (
              <>
                <Play size={10} className="mr-1" />
                Game Running
              </>
            ) : (
              <>
                <Pause size={10} className="mr-1" />
                Game Paused
              </>
            )}
          </Badge>
          <Badge variant="outline" className="bg-muted">
            {data.game.game.toUpperCase()}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={disconnect}
          className="text-muted-foreground"
        >
          <WifiOff size={14} className="mr-1" />
          Disconnect
        </Button>
      </div>

      {/* Truck Info */}
      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <Truck size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold">{data.truck.make} {data.truck.model}</p>
            <p className="text-xs text-muted-foreground">
              Odometer: {formatDistance(data.truck.odometer)} km
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Speed */}
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <Gauge size={20} className="mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{formatSpeed(data.truck.speed)}</p>
            <p className="text-xs text-muted-foreground">km/h</p>
          </div>

          {/* Fuel */}
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <Fuel size={20} className={`mx-auto mb-1 ${fuelPercent < 20 ? 'text-destructive' : 'text-primary'}`} />
            <p className="text-2xl font-bold">{formatFuel(data.truck.fuel)}</p>
            <p className="text-xs text-muted-foreground">L ({Math.round(fuelPercent)}%)</p>
          </div>

          {/* RPM */}
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="mx-auto w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center mb-1">
              <span className="text-[8px] font-bold text-primary">R</span>
            </div>
            <p className="text-2xl font-bold">{Math.round(data.truck.engineRpm)}</p>
            <p className="text-xs text-muted-foreground">RPM</p>
          </div>

          {/* Gear */}
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="mx-auto w-5 h-5 rounded border border-primary flex items-center justify-center mb-1">
              <span className="text-[8px] font-bold text-primary">G</span>
            </div>
            <p className="text-2xl font-bold">
              {data.truck.gear === 0 ? 'N' : data.truck.gear > 0 ? data.truck.gear : 'R'}
            </p>
            <p className="text-xs text-muted-foreground">Gear</p>
          </div>
        </div>

        {/* Fuel Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Fuel Level</span>
            <span>{formatFuel(data.truck.fuel)} / {formatFuel(data.truck.fuelCapacity)} L</span>
          </div>
          <Progress 
            value={fuelPercent} 
            className={`h-2 ${fuelPercent < 20 ? '[&>div]:bg-destructive' : ''}`}
          />
        </div>

        {/* Damage Summary */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium">Truck Condition</span>
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs">
            {[
              { label: 'Engine', value: data.truck.damage.engine },
              { label: 'Trans.', value: data.truck.damage.transmission },
              { label: 'Cabin', value: data.truck.damage.cabin },
              { label: 'Chassis', value: data.truck.damage.chassis },
              { label: 'Wheels', value: data.truck.damage.wheels },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className={`font-bold ${getDamageColor(value)}`}>
                  {formatDamage(value)}%
                </p>
                <p className="text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Current Job */}
      {isJobActive && data.job && (
        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/20">
              <Package size={20} className="text-accent" />
            </div>
            <div>
              <p className="font-semibold">Active Job</p>
              <p className="text-xs text-muted-foreground">{data.job.cargo}</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-primary/20 text-primary border-primary/40">
              Live
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm mb-4">
            <MapPin size={14} className="text-primary flex-shrink-0" />
            <span className="truncate">{data.job.sourceCity}</span>
            <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="truncate">{data.job.destinationCity}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-2 rounded-lg bg-muted/30">
              <DollarSign size={14} className="mx-auto text-primary mb-1" />
              <p className="font-bold">${data.job.income.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Income</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <Package size={14} className="mx-auto text-primary mb-1" />
              <p className="font-bold">{(data.job.cargoMass / 1000).toFixed(1)}t</p>
              <p className="text-xs text-muted-foreground">Weight</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <Navigation size={14} className="mx-auto text-primary mb-1" />
              <p className="font-bold">{formatDistance(data.navigation.estimatedDistance / 1000)} km</p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
          </div>

          {/* Cargo Damage */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cargo Damage</span>
              <span className={getDamageColor(data.job.cargoDamage)}>
                {formatDamage(data.job.cargoDamage)}%
              </span>
            </div>
            <Progress 
              value={data.job.cargoDamage * 100} 
              className="h-1.5 mt-1"
            />
          </div>
        </GlassCard>
      )}

      {/* No Job */}
      {!isJobActive && (
        <GlassCard className="text-center p-6">
          <Package size={40} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No active job</p>
          <p className="text-xs text-muted-foreground mt-1">
            Accept a job in-game to see live tracking
          </p>
        </GlassCard>
      )}
    </div>
  );
}
