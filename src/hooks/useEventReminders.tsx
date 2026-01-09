import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { differenceInMinutes, parseISO } from 'date-fns';
import { Calendar, Bell } from 'lucide-react';

interface VTCEvent {
  id: string;
  title: string;
  start_time: string;
  departure_city: string;
  arrival_city: string;
}

/**
 * Hook for event reminder notifications
 * 
 * TAURI CONVERSION NOTES:
 * -----------------------
 * For desktop notifications in Tauri:
 * 
 * 1. Use Tauri's notification API:
 *    ```typescript
 *    import { sendNotification } from '@tauri-apps/api/notification';
 *    sendNotification({ title: 'Event Starting', body: 'Your convoy starts in 30 minutes!' });
 *    ```
 * 
 * 2. For persistent background reminders, use Tauri's tray and background processes
 */
export function useEventReminders() {
  const { user } = useAuth();
  const notifiedEvents = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<number | null>(null);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // Show notification (works in browser, can be adapted for Tauri)
  const showNotification = useCallback((title: string, body: string, eventId: string) => {
    // Toast notification (always works)
    toast(title, {
      description: body,
      duration: 10000,
      icon: <Bell className="text-primary" />,
      action: {
        label: 'View Events',
        onClick: () => window.location.href = '/events',
      },
    });

    // Browser notification (if permitted)
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: eventId,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = '/events';
        notification.close();
      };
    }

    // Mark as notified
    notifiedEvents.current.add(eventId);
  }, []);

  // Check for upcoming events
  const checkUpcomingEvents = useCallback(async () => {
    if (!user) return;

    try {
      // Get events user is participating in
      const { data: participations } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id);

      if (!participations || participations.length === 0) return;

      const eventIds = participations.map(p => p.event_id);

      // Get event details
      const { data: events } = await supabase
        .from('vtc_events')
        .select('id, title, start_time, departure_city, arrival_city')
        .in('id', eventIds)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (!events) return;

      const now = new Date();

      for (const event of events) {
        const startTime = parseISO(event.start_time);
        const minutesUntil = differenceInMinutes(startTime, now);

        // Check reminder thresholds
        const reminderKey30 = `${event.id}-30`;
        const reminderKey15 = `${event.id}-15`;
        const reminderKey5 = `${event.id}-5`;
        const reminderKeyNow = `${event.id}-now`;

        if (minutesUntil <= 30 && minutesUntil > 29 && !notifiedEvents.current.has(reminderKey30)) {
          showNotification(
            '🚛 Event in 30 minutes!',
            `${event.title} - ${event.departure_city} → ${event.arrival_city}`,
            reminderKey30
          );
        }

        if (minutesUntil <= 15 && minutesUntil > 14 && !notifiedEvents.current.has(reminderKey15)) {
          showNotification(
            '⚠️ Event in 15 minutes!',
            `${event.title} is starting soon! Get ready!`,
            reminderKey15
          );
        }

        if (minutesUntil <= 5 && minutesUntil > 4 && !notifiedEvents.current.has(reminderKey5)) {
          showNotification(
            '🔔 Event in 5 minutes!',
            `${event.title} starts in 5 minutes! Join now!`,
            reminderKey5
          );
        }

        if (minutesUntil <= 1 && minutesUntil >= 0 && !notifiedEvents.current.has(reminderKeyNow)) {
          showNotification(
            '🎉 Event Starting NOW!',
            `${event.title} is starting! Don't miss it!`,
            reminderKeyNow
          );
        }
      }
    } catch (err) {
      console.error('Error checking event reminders:', err);
    }
  }, [user, showNotification]);

  // Start reminder system
  useEffect(() => {
    if (!user) return;

    // Request permission on mount
    requestPermission();

    // Check immediately
    checkUpcomingEvents();

    // Check every minute
    checkIntervalRef.current = window.setInterval(checkUpcomingEvents, 60000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, requestPermission, checkUpcomingEvents]);

  return {
    requestPermission,
    checkUpcomingEvents,
    notificationPermission: 'Notification' in window ? Notification.permission : 'denied',
  };
}
