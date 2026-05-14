import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Bell, Trash2, X, BellOff, Monitor, Hash, Plus, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface RemindersPanelProps {
  open: boolean;
  onClose: () => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTimeStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function RemindersPanel({ open, onClose }: RemindersPanelProps) {
  const { data: reminders = [], refetch } = trpc.reminders.list.useQuery(undefined, {
    refetchInterval: open ? 30000 : false,
  });
  const deleteMutation = trpc.reminders.delete.useMutation();
  const createMutation = trpc.reminders.create.useMutation();

  // ── New reminder form state ─────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(nowTimeStr());
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a reminder title.");
      return;
    }
    setSaving(true);
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        date,
        time,
        notifyBrowser,
        notifySlack: false,
      });
      toast.success("Reminder created!");
      await refetch();
      // Reset form
      setTitle("");
      setDate(todayStr());
      setTime(nowTimeStr());
      setFormOpen(false);
    } catch {
      toast.error("Failed to create reminder.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      await refetch();
      toast.success("Reminder deleted.");
    } catch {
      toast.error("Failed to delete reminder.");
    }
  };

  // Group reminders by date
  const now = new Date();
  const grouped = reminders.reduce<Record<string, typeof reminders>>((acc, r) => {
    const key = r.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();
  const upcoming = sortedDates.filter(d => d >= now.toISOString().slice(0, 10));
  const past = sortedDates.filter(d => d < now.toISOString().slice(0, 10));
  const upcomingCount = reminders.filter(r => !r.sent && r.date >= now.toISOString().slice(0, 10)).length;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-sm",
        "bg-background border-l border-border shadow-2xl",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={18} />
            <h2 className="font-bold text-base">Reminders</h2>
            {upcomingCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-xs font-bold">
                {upcomingCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFormOpen(v => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                formOpen
                  ? "bg-foreground text-background"
                  : "bg-muted hover:bg-foreground hover:text-background"
              )}
            >
              {formOpen ? <ChevronUp size={13} /> : <Plus size={13} />}
              {formOpen ? "Cancel" : "New"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── New Reminder Form ─────────────────────────────────────────────── */}
        {formOpen && (
          <div className="px-4 py-4 border-b border-border bg-muted/30 flex-shrink-0 space-y-3">
            {/* Title */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                What's the reminder?
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleCreate(); }}
                placeholder="e.g. Call my accountant, Post on Instagram..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 placeholder:text-muted-foreground/50"
                autoFocus
              />
            </div>

            {/* Date + Time row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
            </div>

            {/* Browser notification toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setNotifyBrowser(v => !v)}
                className={cn(
                  "w-8 h-4.5 rounded-full relative transition-colors flex-shrink-0",
                  notifyBrowser ? "bg-foreground" : "bg-muted-foreground/30"
                )}
                style={{ height: "18px" }}
              >
                <div className={cn(
                  "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform",
                  notifyBrowser ? "translate-x-4" : "translate-x-0.5"
                )} />
              </div>
              <div>
                <span className="text-xs font-medium">Browser notification</span>
                <p className="text-[10px] text-muted-foreground leading-tight">Get an alert when the time arrives</p>
              </div>
            </label>

            {/* Save button */}
            <Button
              size="sm"
              className="w-full gap-1.5 font-bold"
              onClick={handleCreate}
              disabled={saving || !title.trim()}
            >
              {saving ? (
                <><Loader2 size={13} className="animate-spin" /> Saving…</>
              ) : (
                <><Bell size={13} /> Set Reminder</>
              )}
            </Button>
          </div>
        )}

        {/* ── Reminder List ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <BellOff size={36} className="text-muted-foreground/30" />
              <div>
                <p className="font-semibold text-sm">No reminders yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap <strong>New</strong> above to add one, or hover a time slot in the Weekly view.
                </p>
              </div>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Upcoming</p>
                  <div className="space-y-2">
                    {upcoming.map(date =>
                      grouped[date].map(reminder => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onDelete={() => handleDelete(reminder.id)}
                          isPast={false}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Past</p>
                  <div className="space-y-2 opacity-60">
                    {past.map(date =>
                      grouped[date].map(reminder => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onDelete={() => handleDelete(reminder.id)}
                          isPast
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

interface ReminderCardProps {
  reminder: {
    id: number;
    title: string;
    date: string;
    timeSlot: string | null;
    notifyBrowser: boolean;
    notifySlack: boolean;
    sent: boolean;
  };
  onDelete: () => void;
  isPast: boolean;
}

function ReminderCard({ reminder, onDelete, isPast }: ReminderCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  // Format date nicely
  const dateLabel = (() => {
    try {
      return format(new Date(`${reminder.date}T12:00:00`), "EEE, MMM d");
    } catch {
      return reminder.date;
    }
  })();

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30",
      reminder.sent && "border-border/50"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        reminder.sent ? "bg-muted" : "bg-foreground"
      )}>
        <Bell size={13} className={reminder.sent ? "text-muted-foreground" : "text-background"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium leading-snug",
          reminder.sent && "line-through text-muted-foreground"
        )}>
          {reminder.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {dateLabel}
          {reminder.timeSlot && ` · ${reminder.timeSlot}`}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {reminder.notifyBrowser && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Monitor size={9} /> Browser
            </span>
          )}
          {reminder.notifySlack && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Hash size={9} /> Slack
            </span>
          )}
          {reminder.sent && (
            <span className="text-[10px] text-green-600 font-medium">Sent ✓</span>
          )}
        </div>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive flex-shrink-0 mt-0.5"
        title="Delete reminder"
      >
        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      </button>
    </div>
  );
}
