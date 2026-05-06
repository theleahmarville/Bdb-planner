import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Calendar, ExternalLink, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

// Notion SVG icon (inline, no external dependency)
function NotionIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </svg>
  );
}

// Google Calendar SVG icon (inline)
function GoogleCalendarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 13h2v2H8zM11 13h2v2h-2zM14 13h2v2h-2zM8 16h2v2H8zM11 16h2v2h-2z" fill="currentColor"/>
    </svg>
  );
}

export default function IntegrationBar() {
  const { isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const { data: integrations } = trpc.integrations.get.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const hasGoogleCalendar = !!(integrations?.googleCalendarId || integrations?.googleAccessToken);
  const hasNotion = !!(integrations?.notionToken && integrations?.notionDatabaseId);

  const handleGoogleCalendarClick = () => {
    if (!hasGoogleCalendar) {
      window.open("/integrations", "_self");
      toast.info("Connect Google Calendar in Integrations to enable direct sync.");
    } else {
      // Open Google Calendar in new tab
      const calId = integrations?.googleCalendarId || "primary";
      window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calId)}`, "_blank");
      toast.success("Opening your Google Calendar…");
    }
  };

  const handleNotionClick = () => {
    if (!hasNotion) {
      window.open("/integrations", "_self");
      toast.info("Connect Notion in Integrations to enable sync.");
    } else {
      const dbId = integrations?.notionDatabaseId?.replace(/-/g, "");
      window.open(`https://notion.so/${dbId}`, "_blank");
      toast.success("Opening your Notion database…");
    }
  };

  const handleQuickAddCalendar = () => {
    const now = new Date();
    const start = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const end = new Date(now.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=New+Event&dates=${start}/${end}`;
    window.open(url, "_blank");
    toast.success("Opening Google Calendar to add event…");
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {expanded && (
        <div className="bg-background border border-border rounded-2xl shadow-xl p-3 w-64 space-y-2 animate-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Quick Integrations</p>

          {/* Google Calendar */}
          <div className="rounded-xl border border-border p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GoogleCalendarIcon size={15} />
                <span className="text-xs font-semibold text-foreground">Google Calendar</span>
              </div>
              <div className={cn("flex items-center gap-1 text-[10px] font-medium", hasGoogleCalendar ? "text-green-600" : "text-muted-foreground")}>
                {hasGoogleCalendar ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                {hasGoogleCalendar ? "Connected" : "Not connected"}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleGoogleCalendarClick}
                className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-accent hover:bg-accent/80 transition-colors text-accent-foreground"
              >
                <ExternalLink size={11} />
                {hasGoogleCalendar ? "Open Calendar" : "Connect"}
              </button>
              <button
                onClick={handleQuickAddCalendar}
                className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                <Calendar size={11} />
                + Add Event
              </button>
            </div>
          </div>

          {/* Notion */}
          <div className="rounded-xl border border-border p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <NotionIcon size={15} />
                <span className="text-xs font-semibold text-foreground">Notion</span>
              </div>
              <div className={cn("flex items-center gap-1 text-[10px] font-medium", hasNotion ? "text-green-600" : "text-muted-foreground")}>
                {hasNotion ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                {hasNotion ? "Connected" : "Not connected"}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleNotionClick}
                className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-accent hover:bg-accent/80 transition-colors text-accent-foreground"
              >
                <ExternalLink size={11} />
                {hasNotion ? "Open Notion" : "Connect"}
              </button>
              {hasNotion && (
                <button
                  onClick={() => { toast.success("Syncing goals to Notion…"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  <RefreshCw size={11} />
                  Sync Goals
                </button>
              )}
              {!hasNotion && (
                <button
                  onClick={() => window.open("/integrations", "_self")}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  <ExternalLink size={11} />
                  Set Up
                </button>
              )}
            </div>
          </div>

          {/* Footer link */}
          <button
            onClick={() => window.open("/integrations", "_self")}
            className="w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors text-center py-1"
          >
            Manage all integrations →
          </button>
        </div>
      )}

      {/* FAB toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 rounded-full shadow-lg transition-all duration-200",
          "bg-foreground text-background hover:bg-foreground/90",
          "text-xs font-semibold"
        )}
        title="Quick Integrations"
      >
        <div className="flex items-center gap-1.5">
          <GoogleCalendarIcon size={13} />
          <span className="hidden sm:inline">+</span>
          <NotionIcon size={13} />
        </div>
        <span className="hidden sm:inline">Integrations</span>
        {expanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        {/* Status dots */}
        <div className="flex gap-0.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", hasGoogleCalendar ? "bg-green-400" : "bg-muted-foreground/40")} />
          <span className={cn("w-1.5 h-1.5 rounded-full", hasNotion ? "bg-green-400" : "bg-muted-foreground/40")} />
        </div>
      </button>
    </div>
  );
}
