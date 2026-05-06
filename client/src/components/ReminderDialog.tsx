import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Bell } from "lucide-react";
import { toast } from "sonner";

interface ReminderDialogProps {
  open: boolean;
  onClose: () => void;
  date: string;     // YYYY-MM-DD
  time: string;     // HH:MM
  defaultTitle?: string;
  timeSlot?: string;
}

export default function ReminderDialog({
  open,
  onClose,
  date,
  time,
  defaultTitle = "",
  timeSlot,
}: ReminderDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifySlack, setNotifySlack] = useState(false);
  const [saving, setSaving] = useState(false);

  const createMutation = trpc.reminders.create.useMutation();
  const utils = trpc.useUtils();

  // Keep title synced if defaultTitle changes
  const handleOpen = () => {
    setTitle(defaultTitle);
    setNotifyBrowser(true);
    setNotifySlack(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a reminder message.");
      return;
    }
    setSaving(true);
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        date,
        time,
        notifyBrowser,
        notifySlack,
        timeSlot: timeSlot,
      });
      await utils.reminders.list.invalidate();
      toast.success("Reminder set!");
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create reminder.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell size={16} />
            Set Reminder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date + Time display */}
          <div className="flex gap-2">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium">{date}</p>
            </div>
            <div className="flex-1 bg-muted rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="text-sm font-medium">{time}</p>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-semibold block mb-1.5">Reminder message</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="What do you want to be reminded about?"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          {/* Notification channels */}
          <div>
            <p className="text-sm font-semibold mb-2">Notify via</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyBrowser}
                  onChange={(e) => setNotifyBrowser(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Browser notification</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySlack}
                  onChange={(e) => setNotifySlack(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Slack</span>
                <span className="text-xs text-muted-foreground">(requires Slack integration)</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Bell size={14} className="mr-1.5" />}
            Set Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
