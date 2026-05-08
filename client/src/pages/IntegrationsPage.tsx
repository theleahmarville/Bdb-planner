import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, Check, AlertCircle, Loader2, Info, Plug, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "wouter";

const YEAR = 2026;

export default function IntegrationsPage() {
  const { isAuthenticated } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const connectedParam = params.get("connected");
  const errorParam = params.get("error");

  // Integrations data
  const { data: integrations, refetch: refetchIntegrations } = trpc.integrations.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const saveIntegrationsMutation = trpc.integrations.save.useMutation();
  const clearIntegrationsMutation = trpc.integrations.clear.useMutation();

  // Google Calendar
  const { data: gcalStatus, refetch: refetchGcal } = trpc.googleCalendar.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const getAuthUrlMutation = trpc.googleCalendar.getAuthUrl.useMutation();
  const disconnectGoogleMutation = trpc.googleCalendar.disconnect.useMutation();
  const [gcalConnecting, setGcalConnecting] = useState(false);
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false);

  // Slack
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [slackChannelName, setSlackChannelName] = useState("");
  const [slackSaving, setSlackSaving] = useState(false);
  const testWebhookMutation = trpc.slack.testWebhook.useMutation();
  const sendDailySummaryMutation = trpc.slack.sendDailySummary.useMutation();
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackSending, setSlackSending] = useState(false);

  // Notion (legacy)
  const { data: annualData, refetch: refetchAnnual } = trpc.annual.get.useQuery({ year: YEAR }, { enabled: isAuthenticated });
  const { data: bigGoalsData } = trpc.bigGoals.list.useQuery({ year: YEAR }, { enabled: isAuthenticated });
  const saveMutation = trpc.annual.save.useMutation();
  const [notionToken, setNotionToken] = useState("");
  const [notionDbId, setNotionDbId] = useState("");
  const [notionSaving, setNotionSaving] = useState(false);

  // Populate Slack fields from DB
  useEffect(() => {
    if (integrations) {
      if (integrations.slackWebhookUrl && !slackWebhookUrl) {
        setSlackWebhookUrl(integrations.slackWebhookUrl);
      }
      if (integrations.slackChannelName && !slackChannelName) {
        setSlackChannelName(integrations.slackChannelName);
      }
    }
  }, [integrations]);

  // Populate Notion fields from annual data (legacy storage)
  useEffect(() => {
    if (annualData) {
      if (!notionToken && annualData.notionToken) setNotionToken(annualData.notionToken);
      if (!notionDbId && annualData.notionDatabaseId) setNotionDbId(annualData.notionDatabaseId);
    }
  }, [annualData]);

  // Show toast for OAuth result
  useEffect(() => {
    if (connectedParam === "google") {
      toast.success("Google Calendar connected successfully!");
      refetchGcal();
      // Remove query param from URL
      window.history.replaceState({}, "", "/integrations");
    }
    if (errorParam) {
      const messages: Record<string, string> = {
        google_not_configured: "Google OAuth credentials not configured on server.",
        google_auth_failed: "Google authentication failed. Please try again.",
        google_no_code: "Google returned no authorization code.",
      };
      toast.error(messages[errorParam] ?? "Connection failed.");
      window.history.replaceState({}, "", "/integrations");
    }
  }, [connectedParam, errorParam]);

  const handleConnectGoogle = async () => {
    setGcalConnecting(true);
    try {
      const { url } = await getAuthUrlMutation.mutateAsync();
      window.location.href = url;
      // Fallback: if navigation fails silently, reset the button after 10 seconds
      setTimeout(() => setGcalConnecting(false), 10000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to start Google OAuth.";
      toast.error(message);
      setGcalConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setGcalDisconnecting(true);
    try {
      await disconnectGoogleMutation.mutateAsync();
      await refetchGcal();
      toast.success("Google Calendar disconnected.");
    } catch {
      toast.error("Failed to disconnect.");
    } finally {
      setGcalDisconnecting(false);
    }
  };

  const handleSaveSlack = async () => {
    setSlackSaving(true);
    try {
      await saveIntegrationsMutation.mutateAsync({
        slackWebhookUrl: slackWebhookUrl || undefined,
        slackChannelName: slackChannelName || undefined,
      });
      await refetchIntegrations();
      toast.success("Slack settings saved!");
    } catch {
      toast.error("Failed to save Slack settings.");
    } finally {
      setSlackSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setSlackTesting(true);
    try {
      await testWebhookMutation.mutateAsync();
      toast.success("Test message sent to Slack!");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to send test message.";
      toast.error(message);
    } finally {
      setSlackTesting(false);
    }
  };

  const handleSendDailySummary = async () => {
    setSlackSending(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await sendDailySummaryMutation.mutateAsync({ date: today });
      toast.success("Daily summary sent to Slack!");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to send daily summary.";
      toast.error(message);
    } finally {
      setSlackSending(false);
    }
  };

  const [slackClearing, setSlackClearing] = useState(false);

  const handleClearSlack = async () => {
    setSlackClearing(true);
    try {
      await clearIntegrationsMutation.mutateAsync({ field: "slack" });
      await refetchIntegrations();
      setSlackWebhookUrl("");
      setSlackChannelName("");
      toast.success("Slack settings cleared.");
    } catch {
      toast.error("Failed to clear Slack settings.");
    } finally {
      setSlackClearing(false);
    }
  };

  const [notionSyncing, setNotionSyncing] = useState(false);

  const handleSyncGoalsToNotion = async () => {
    setNotionSyncing(true);
    try {
      window.open("https://www.notion.so", "_blank");
      const goals = (bigGoalsData ?? []) as Array<{ title?: string }>;
      const goalsList = goals.filter((g) => g?.title).map((g) => `• ${g.title}`).join("\n");
      toast.info(
        goalsList
          ? `Open Notion and paste your goals manually — full sync coming soon\n\n${goalsList}`
          : "Open Notion and paste your goals manually — full sync coming soon",
        { duration: 6000 }
      );
    } finally {
      setNotionSyncing(false);
    }
  };

  const handleSaveNotion = async () => {
    setNotionSaving(true);
    try {
      await saveMutation.mutateAsync({
        year: YEAR,
        data: { notionToken, notionDatabaseId: notionDbId },
      });
      await refetchAnnual();
      toast.success("Notion settings saved!");
    } catch {
      toast.error("Failed to save Notion settings.");
    } finally {
      setNotionSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Sign in to access integrations</h2>
          <a href={getLoginUrl()}><Button size="lg">Sign In</Button></a>
        </div>
      </div>
    );
  }

  const gcalConnected = gcalStatus?.connected ?? false;
  const slackConnected = !!(integrations?.slackWebhookUrl);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">Connect your planner to Google Calendar, Slack, and Notion.</p>
      </div>

      {/* ── Google Calendar (OAuth) ── */}
      <div className="planner-card mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-border flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" fill="#4285F4" />
              <rect x="3" y="3" width="18" height="6" rx="2" fill="#1a73e8" />
              <text x="12" y="17" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">31</text>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg">Google Calendar</h2>
              {gcalConnected ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                  <Check size={11} /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  <WifiOff size={11} /> Not connected
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Push events directly to Google Calendar from time slots — no new tab needed.</p>
          </div>
        </div>

        {gcalConnected ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <Check size={15} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700">Google Calendar is connected</p>
                <p className="text-xs text-green-600 mt-0.5">Hover any time slot in the Weekly view and click the calendar icon to push events directly.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnectGoogle}
              disabled={gcalDisconnecting}
              className="text-destructive hover:text-destructive"
            >
              {gcalDisconnecting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
              Disconnect Google Calendar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                Your Google OAuth credentials are configured. Click Connect to authorize your Google account and start pushing calendar events directly from time slots.
              </p>
            </div>
            <Button onClick={handleConnectGoogle} disabled={gcalConnecting}>
              {gcalConnecting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Plug size={14} className="mr-1.5" />}
              Connect Google Calendar
            </Button>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              <strong>Setup:</strong> In Google Cloud Console, create OAuth 2.0 credentials, set the authorized redirect URI to <code className="bg-blue-100 px-1 rounded">http://localhost:3000/api/auth/google/callback</code>, and add the client ID/secret to your .env file.
            </p>
          </div>
        </div>
      </div>

      {/* ── Slack ── */}
      <div className="planner-card mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#4A154B] flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="white">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg">Slack</h2>
              {slackConnected ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                  <Check size={11} /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  <WifiOff size={11} /> Not connected
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Send daily summaries and reminder notifications to your Slack workspace.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1">Slack Incoming Webhook URL</label>
            <p className="text-xs text-muted-foreground mb-2">
              Create an incoming webhook at{" "}
              <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                api.slack.com/messaging/webhooks <ExternalLink size={10} />
              </a>
            </p>
            <input
              type="url"
              value={slackWebhookUrl}
              onChange={(e) => setSlackWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1">Channel Name (optional)</label>
            <input
              type="text"
              value={slackChannelName}
              onChange={(e) => setSlackChannelName(e.target.value)}
              placeholder="#general"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveSlack} disabled={slackSaving} size="sm">
              {slackSaving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
              Save Slack Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSlack}
              disabled={slackClearing}
              className="text-destructive hover:text-destructive"
            >
              {slackClearing ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
              Clear Slack Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestWebhook}
              disabled={slackTesting || !slackConnected}
              title={!slackConnected ? "Save a webhook URL first" : undefined}
            >
              {slackTesting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Wifi size={14} className="mr-1.5" />}
              Test Webhook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendDailySummary}
              disabled={slackSending || !slackConnected}
              title={!slackConnected ? "Save a webhook URL first" : undefined}
            >
              {slackSending ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
              Send Today's Summary
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-emerald-700">
              <p className="font-medium mb-1">Slack setup steps:</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>Go to <strong>api.slack.com/apps</strong> and create a new app</li>
                <li>Enable <strong>Incoming Webhooks</strong> and add a webhook to your workspace</li>
                <li>Copy the webhook URL and paste it above</li>
                <li>Save, then test with the "Test Webhook" button</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notion (legacy) ── */}
      <div className="planner-card mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="white">
              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg">Notion</h2>
              {notionToken && notionDbId ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                  <Check size={11} /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  <WifiOff size={11} /> Not configured
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Sync your goals and objectives with a Notion database.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1">Notion Integration Token</label>
            <p className="text-xs text-muted-foreground mb-2">
              Create an integration at{" "}
              <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                notion.so/my-integrations <ExternalLink size={10} />
              </a>
            </p>
            <input
              type="password"
              value={notionToken}
              onChange={(e) => setNotionToken(e.target.value)}
              placeholder="secret_..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1">Notion Database ID</label>
            <p className="text-xs text-muted-foreground mb-2">
              The ID from your Notion database URL: notion.so/your-workspace/<strong>[DATABASE-ID]</strong>?v=...
            </p>
            <input
              type="text"
              value={notionDbId}
              onChange={(e) => setNotionDbId(e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <Button onClick={handleSaveNotion} disabled={notionSaving} size="sm">
            {notionSaving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
            Save Notion Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncGoalsToNotion}
            disabled={notionSyncing}
            title={!(notionToken && notionDbId) ? "Save Notion settings first" : undefined}
          >
            {notionSyncing ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <ExternalLink size={14} className="mr-1.5" />}
            Sync Goals to Notion
          </Button>
        </div>
      </div>
    </div>
  );
}
