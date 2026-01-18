import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/layout/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTruckersMP, TMPEvent } from '@/hooks/useTruckersMP';
import { useEventReminders, CalendarEvent as ReminderEvent } from '@/hooks/useEventReminders';
import { useUIStore } from '@/stores/appStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, isSameDay } from 'date-fns';
import {
  Calendar,
  Download,
  RefreshCw,
  MapPin,
  Clock,
  Truck,
  Globe,
  Users,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bell,
  BellOff,
  BellRing
} from 'lucide-react';

interface VTCEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  game: string;
  departure_city: string;
  departure_location: string | null;
  arrival_city: string;
  arrival_location: string | null;
  start_time: string;
  meetup_time: string | null;
  server_name: string | null;
  status: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  type: 'tmp' | 'vtc';
  game: string;
  departure: string;
  arrival: string;
  description?: string;
  url?: string;
  attendees?: number;
}

export default function CalendarPage() {
  const { getEvents, loading: tmpLoading } = useTruckersMP();
  const { hasReminder, toggleReminder, reminderEvents, permission, requestPermission } = useEventReminders();
  const notificationsEnabled = useUIStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useUIStore((s) => s.setNotificationsEnabled);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [tmpEvents, setTmpEvents] = useState<TMPEvent[]>([]);
  const [vtcEvents, setVtcEvents] = useState<VTCEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all events
  useEffect(() => {
    fetchAllEvents();
  }, []);

  const fetchAllEvents = async () => {
    setLoading(true);
    await Promise.all([fetchTMPEvents(), fetchVTCEvents()]);
    setLoading(false);
  };

  const fetchTMPEvents = async () => {
    try {
      const events = await getEvents();
      if (Array.isArray(events)) {
        setTmpEvents(events);
      } else if (events && typeof events === 'object' && 'response' in events) {
        setTmpEvents((events as any).response || []);
      } else {
        setTmpEvents([]);
      }
    } catch (err) {
      console.error("TMP Fetch Error:", err);
      setTmpEvents([]);
    }
  };

  const fetchVTCEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('vtc_events')
        .select('*')
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('Error fetching VTC events:', error);
        return;
      }
      setVtcEvents(data || []);
    } catch (error) {
      console.error('Error fetching VTC events:', error);
      setVtcEvents([]);
    }
  };

  // Convert events to unified calendar format
  const calendarEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Add TMP events
    tmpEvents.forEach((event) => {
      events.push({
        id: `tmp-${event.id}`,
        title: event.name,
        start: parseISO(event.startAt),
        type: 'tmp',
        game: event.game,
        departure: `${event.departure.city}, ${event.departure.location}`,
        arrival: `${event.arrive.city}, ${event.arrive.location}`,
        description: event.description,
        url: `https://truckersmp.com/events/${event.id}`,
        attendees: event.attendances.confirmed
      });
    });

    // Add VTC events
    vtcEvents.forEach((event) => {
      events.push({
        id: `vtc-${event.id}`,
        title: event.title,
        start: parseISO(event.start_time),
        type: 'vtc',
        game: event.game,
        departure: `${event.departure_city}${event.departure_location ? `, ${event.departure_location}` : ''}`,
        arrival: `${event.arrival_city}${event.arrival_location ? `, ${event.arrival_location}` : ''}`,
        description: event.description || undefined
      });
    });

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [tmpEvents, vtcEvents]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    return calendarEvents.filter((event) => isSameDay(event.start, selectedDate));
  }, [calendarEvents, selectedDate]);

  // Get dates with events for calendar highlighting
  const eventDates = useMemo(() => {
    return calendarEvents.map((event) => event.start);
  }, [calendarEvents]);

  // Generate ICS content for calendar download
  const generateICSContent = useCallback(() => {
    const formatICSDate = (date: Date): string => {
      return format(date, "yyyyMMdd'T'HHmmss'Z'");
    };

    const escapeICS = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Aura VTC Hub//Events Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Aura VTC Events',
      'X-WR-TIMEZONE:UTC'
    ];

    calendarEvents.forEach((event) => {
      const uid = `${event.id}@auravtc.hub`;
      const startDate = formatICSDate(event.start);
      const endDate = formatICSDate(new Date(event.start.getTime() + 2 * 60 * 60 * 1000)); // 2 hour duration
      
      const eventLines = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${escapeICS(event.title)}`,
        `DESCRIPTION:${escapeICS(`Game: ${event.game}\\nRoute: ${event.departure} → ${event.arrival}${event.description ? '\\n\\n' + event.description : ''}`)}`,
        `LOCATION:${escapeICS(event.departure)}`,
        `CATEGORIES:${event.type === 'tmp' ? 'TruckersMP Event' : 'VTC Convoy'}`
      ];

      if (event.url) {
        eventLines.push(`URL:${event.url}`);
      }

      eventLines.push('END:VEVENT');
      icsContent = icsContent.concat(eventLines);
    });

    icsContent.push('END:VCALENDAR');
    return icsContent.join('\r\n');
  }, [calendarEvents]);

  // Download calendar file
  const handleDownloadCalendar = useCallback(() => {
    if (calendarEvents.length === 0) {
      toast.error('No events to export');
      return;
    }

    const icsContent = generateICSContent();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aura-vtc-events.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Calendar downloaded! Import it to Apple Calendar, Google Calendar, or Outlook.');
  }, [calendarEvents, generateICSContent]);

  const getGameBadge = (game: string) => {
    if (game.toLowerCase().includes('ets') || game.toLowerCase().includes('euro')) {
      return <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/40 text-xs">ETS2</Badge>;
    }
    return <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/40 text-xs">ATS</Badge>;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Event Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View all TruckersMP and VTC events in one place
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchAllEvents}
              disabled={loading || tmpLoading}
              className="gap-2 rounded-full"
            >
              <RefreshCw size={18} className={loading || tmpLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button
              onClick={handleDownloadCalendar}
              disabled={calendarEvents.length === 0}
              className="gap-2 rounded-full neon-glow"
            >
              <Download size={18} />
              Download Calendar
            </Button>
          </div>
        </div>

        {/* Stats + Notification Settings */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{calendarEvents.length}</div>
            <div className="text-sm text-muted-foreground">Total Events</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{tmpEvents.length}</div>
            <div className="text-sm text-muted-foreground">TMP Events</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{vtcEvents.length}</div>
            <div className="text-sm text-muted-foreground">VTC Events</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{reminderEvents.length}</div>
            <div className="text-sm text-muted-foreground">Reminders Set</div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BellRing size={18} className={notificationsEnabled ? 'text-primary' : 'text-muted-foreground'} />
                <Label htmlFor="notifications" className="text-sm cursor-pointer">
                  Notifications
                </Label>
              </div>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={(checked) => {
                  setNotificationsEnabled(checked);
                  if (checked) {
                    requestPermission();
                    toast.success('Notifications enabled');
                  } else {
                    toast.info('Notifications disabled');
                  }
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {permission === 'granted' ? '✓ Browser allowed' : permission === 'denied' ? '✗ Browser blocked' : 'Click to enable'}
            </div>
          </GlassCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <GlassCard className="p-4 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft size={18} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
                  <ChevronRight size={18} />
                </Button>
              </div>
            </div>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              modifiers={{
                hasEvent: eventDates
              }}
              modifiersStyles={{
                hasEvent: {
                  backgroundColor: 'hsl(var(--primary) / 0.2)',
                  borderRadius: '50%',
                  fontWeight: 'bold'
                }
              }}
              className="rounded-md"
            />
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary/30" />
                <span className="text-muted-foreground">Has Events</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500/50" />
                <span className="text-muted-foreground">TMP</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary/50" />
                <span className="text-muted-foreground">VTC</span>
              </div>
            </div>
          </GlassCard>

          {/* Events List */}
          <div className="lg:col-span-2 space-y-4">
            <GlassCard className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                Events on {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No events scheduled for this date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg border transition-all hover:border-primary/50 ${
                        event.type === 'tmp' 
                          ? 'bg-blue-500/5 border-blue-500/20' 
                          : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={event.type === 'tmp' 
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' 
                                : 'bg-primary/20 text-primary border-primary/40'
                              }
                            >
                              {event.type === 'tmp' ? (
                                <><Globe size={12} className="mr-1" /> TMP</>
                              ) : (
                                <><Truck size={12} className="mr-1" /> VTC</>
                              )}
                            </Badge>
                            {getGameBadge(event.game)}
                          </div>
                          <h3 className="font-semibold text-lg truncate">{event.title}</h3>
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock size={14} />
                              {format(event.start, 'h:mm a')} UTC
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin size={14} />
                              <span className="truncate">{event.departure} → {event.arrival}</span>
                            </div>
                            {event.attendees !== undefined && (
                              <div className="flex items-center gap-2">
                                <Users size={14} />
                                {event.attendees} attending
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant={hasReminder(event.id) ? "default" : "outline"}
                            size="icon"
                            onClick={() => toggleReminder({
                              id: event.id,
                              title: event.title,
                              startTime: event.start.toISOString(),
                              departure: event.departure,
                              arrival: event.arrival,
                              type: event.type,
                              url: event.url
                            })}
                            className={hasReminder(event.id) ? "bg-amber-500 hover:bg-amber-600" : ""}
                            title={hasReminder(event.id) ? "Remove reminder" : "Set reminder"}
                          >
                            {hasReminder(event.id) ? <Bell size={18} /> : <BellOff size={18} />}
                          </Button>
                          {event.url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={event.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink size={18} />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* All Upcoming Events */}
            <GlassCard className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                All Upcoming Events ({calendarEvents.length})
              </h2>
              
              {calendarEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {calendarEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 ${
                        isSameDay(event.start, selectedDate) ? 'ring-2 ring-primary/50' : ''
                      } ${
                        event.type === 'tmp' 
                          ? 'bg-blue-500/5 border-blue-500/20' 
                          : 'bg-primary/5 border-primary/20'
                      }`}
                      onClick={() => setSelectedDate(event.start)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1" onClick={() => setSelectedDate(event.start)}>
                          <Badge 
                            variant="outline" 
                            className={`shrink-0 ${event.type === 'tmp' 
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' 
                              : 'bg-primary/20 text-primary border-primary/40'
                            }`}
                          >
                            {event.type.toUpperCase()}
                          </Badge>
                          {hasReminder(event.id) && (
                            <Bell size={14} className="text-amber-400 shrink-0" />
                          )}
                          <span className="font-medium truncate">{event.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-muted-foreground">
                            {format(event.start, 'MMM d, h:mm a')}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReminder({
                                id: event.id,
                                title: event.title,
                                startTime: event.start.toISOString(),
                                departure: event.departure,
                                arrival: event.arrival,
                                type: event.type,
                                url: event.url
                              });
                            }}
                          >
                            {hasReminder(event.id) ? (
                              <Bell size={14} className="text-amber-400" />
                            ) : (
                              <BellOff size={14} className="text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        {/* Reminder Info */}
        <GlassCard className="p-6 border-amber-500/20 bg-amber-500/5">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Bell size={32} className="text-amber-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-semibold text-lg">Event Reminders</h3>
              <p className="text-muted-foreground mt-1">
                Click the bell icon on any event to set a reminder. You'll be notified 30, 15, 5, and 1 minute before the event starts.
                {reminderEvents.length > 0 && (
                  <span className="text-amber-400 font-medium"> You have {reminderEvents.length} reminder{reminderEvents.length > 1 ? 's' : ''} set.</span>
                )}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Download Info */}
        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Download size={32} className="text-primary" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-semibold text-lg">Sync with Your Calendar</h3>
              <p className="text-muted-foreground mt-1">
                Download the .ics file and import it into Apple Calendar, Google Calendar, Outlook, or any other calendar app. 
                All events will be automatically added to your calendar.
              </p>
            </div>
            <Button
              onClick={handleDownloadCalendar}
              disabled={calendarEvents.length === 0}
              className="gap-2 rounded-full neon-glow shrink-0"
            >
              <Download size={18} />
              Download .ics File
            </Button>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
