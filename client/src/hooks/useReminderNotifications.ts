import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Polls for due reminders every 60 seconds and fires browser notifications.
 * Also marks them as sent via the API.
 */
export function useReminderNotifications(enabled: boolean) {
  const utils = trpc.useUtils();
  const markSentMutation = trpc.reminders.markSent.useMutation();
  const { data: reminders } = trpc.reminders.list.useQuery(undefined, {
    enabled,
    refetchInterval: enabled ? 60_000 : false,
    staleTime: 30_000,
  });

  const sentIds = useRef<Set<number>>(new Set());

  // Request notification permission on mount
  useEffect(() => {
    if (!enabled) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !reminders) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const now = new Date();

    for (const reminder of reminders) {
      if (reminder.sent) continue;
      if (!reminder.notifyBrowser) continue;
      if (sentIds.current.has(reminder.id)) continue;

      const reminderAt = new Date(`${reminder.date}T${reminder.timeSlot ?? "00:00"}:00`);
      if (reminderAt <= now) {
        // Fire the notification
        sentIds.current.add(reminder.id);
        try {
          new Notification("BDB Planner Reminder", {
            body: reminder.title,
            icon: "/favicon.ico",
            tag: `bdb-reminder-${reminder.id}`,
          });
        } catch {
          // Notification may fail silently
        }

        // Mark as sent in DB
        markSentMutation.mutate(
          { id: reminder.id },
          {
            onSuccess: () => {
              utils.reminders.list.invalidate();
            },
          }
        );
      }
    }
  }, [reminders, enabled]);
}
