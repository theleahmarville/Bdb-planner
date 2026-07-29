import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Users, BarChart2, Mail, Shield, Home,
  TrendingUp, Crown, RefreshCw, Search,
  AlertTriangle, CheckCircle2, Clock, Loader2, Send,
  Database, Activity, UserCheck, DollarSign,
  Edit2, Save, X, Eye, Ban, Star, Trash2, MessageSquare,
} from "lucide-react";

// ── Simple SVG Bar Chart ─────────────────────────────────────────────────────
function BarChart({ data, height = 140 }: { data: { date: string; count: number }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const barH = (d.count / max) * (height - 20);
        const x = i * w + w * 0.15;
        const barW = w * 0.7;
        const y = height - barH - 16;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barW} height={barH} rx="1.5"
              fill={d.count > 0 ? "url(#barGrad)" : "#e5e7eb"} className="transition-all" />
            {data.length <= 14 && (
              <text x={x + barW / 2} y={height - 2} textAnchor="middle" fontSize="4" fill="#9ca3af">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  const r = 30; const cx = 40; const cy = 40; const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-6">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const rotation = offset * 360 - 90;
          offset += pct;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color}
              strokeWidth="18" strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotation} ${cx} ${cy})`} />
          );
        })}
        <circle cx={cx} cy={cy} r="21" fill="var(--background)" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-semibold ml-auto pl-3">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color = "violet" }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string;
}) {
  const colors: Record<string, string> = {
    violet: "bg-violet-100 dark:bg-violet-950/40 text-violet-600",
    emerald: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
    amber: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
    blue: "bg-blue-100 dark:bg-blue-950/40 text-blue-600",
    rose: "bg-rose-100 dark:bg-rose-950/40 text-rose-600",
    indigo: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600",
  };
  return (
    <div className="planner-card p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] ?? colors.violet}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-foreground leading-none">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Plan badge helper ─────────────────────────────────────────────────────────
const PLAN_BADGE: Record<string, string> = {
  free: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  pro: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  elite: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
};
const ROLE_BADGE: Record<string, string> = {
  admin: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  user: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",   label: "Overview",   icon: Home },
  { id: "users",      label: "Users",      icon: Users },
  { id: "analytics",  label: "Analytics",  icon: BarChart2 },
  { id: "community",  label: "Community",  icon: MessageSquare },
  { id: "plans",      label: "Plans",      icon: Crown },
  { id: "broadcast",  label: "Broadcast",  icon: Mail },
  { id: "system",     label: "System",     icon: Shield },
] as const;
type Tab = typeof TABS[number]["id"];

// ═════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═════════════════════════════════════════════════════════════════════════════
function OverviewTab() {
  const { data: overview, isLoading } = trpc.adminPanel.overview.useQuery();
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>;
  if (!overview) return <p className="text-muted-foreground text-sm text-center py-10">No data available.</p>;
  const o = overview as any;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Users" value={Number(o.totalUsers)} icon={Users} color="violet" />
        <KpiCard label="Active Today" value={Number(o.activeToday)} sub="signed in last 24h" icon={Activity} color="emerald" />
        <KpiCard label="MRR" value={`$${o.mrr?.toFixed(2) ?? "0.00"}`} sub="Monthly Recurring Revenue" icon={DollarSign} color="amber" />
        <KpiCard label="ARR" value={`$${o.arr?.toFixed(2) ?? "0.00"}`} sub="Annual run rate" icon={TrendingUp} color="blue" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="New This Week" value={Number(o.newThisWeek)} icon={UserCheck} color="indigo" />
        <KpiCard label="New This Month" value={Number(o.newThisMonth)} icon={UserCheck} color="violet" />
        <KpiCard label="Active 7 Days" value={Number(o.activeWeek)} icon={Activity} color="emerald" />
        <KpiCard label="Active 30 Days" value={Number(o.activeMonth)} icon={Activity} color="blue" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="planner-card p-5">
          <p className="text-sm font-bold mb-4">Plan Distribution</p>
          <DonutChart segments={[
            { label: "Free",  value: Number(o.freeCount),  color: "#6b7280" },
            { label: "Pro",   value: Number(o.proCount),   color: "#8b5cf6" },
            { label: "Elite", value: Number(o.eliteCount), color: "#f59e0b" },
          ]} />
        </div>
        <div className="planner-card p-5">
          <p className="text-sm font-bold mb-4">30-Day Activity</p>
          <div className="space-y-2.5">
            {[
              { label: "Daily Entries",    value: Number(o.entries30d),   icon: "📅" },
              { label: "Check-ins",        value: Number(o.checkIns30d),  icon: "✅" },
              { label: "Zion Messages",    value: Number(o.zionMsgs30d),  icon: "🤖" },
              { label: "Devotions Opened", value: Number(o.devotions30d), icon: "📖" },
              { label: "Notes Created",    value: Number(o.notes30d),     icon: "📝" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{item.icon}</span>
                <span className="flex-1 text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-bold">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// USERS TAB
// ═════════════════════════════════════════════════════════════════════════════
function UsersTab() {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<"all"|"free"|"pro"|"elite">("all");
  const [role, setRole] = useState<"all"|"user"|"admin">("all");
  const [status, setStatus] = useState<"all"|"active"|"suspended">("all");
  const [offset, setOffset] = useState(0);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [editingPlan, setEditingPlan] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const limit = 25;

  const { data, isLoading, refetch } = trpc.adminPanel.listUsers.useQuery({ search, plan, role, status, limit, offset, sortBy: "createdAt", sortDir: "desc" });
  const { data: userDetail } = trpc.adminPanel.getUser.useQuery({ userId: expandedUser! }, { enabled: expandedUser !== null });

  const setPlanMut = trpc.adminPanel.setPlan.useMutation({ onSuccess: () => { toast.success("Plan updated"); refetch(); setEditingPlan(null); } });
  const setRoleMut = trpc.adminPanel.setRole.useMutation({ onSuccess: () => { toast.success("Role updated"); refetch(); } });
  const setSuspendedMut = trpc.adminPanel.setSuspended.useMutation({ onSuccess: () => { toast.success("User blocked"); refetch(); } });
  const deleteUserMut = trpc.adminPanel.deleteUser.useMutation({
    onSuccess: () => { toast.success("User deleted and data erased"); refetch(); setConfirmDelete(null); setExpandedUser(null); },
    onError: (e) => toast.error(e.message),
  });

  const users = (data?.users ?? []) as any[];
  const total = data?.total ?? 0;

  const fmt = (d: string | Date | null) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return "—"; }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="planner-card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }}
            placeholder="Search by name or email..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
        </div>
        {([["Plan", plan, setPlan, ["all","free","pro","elite"]], ["Role", role, setRole, ["all","user","admin"]], ["Status", status, setStatus, ["all","active","suspended"]]] as any[]).map(([label, val, setter, opts]) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
            <select value={val} onChange={e => { setter(e.target.value); setOffset(0); }}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none cursor-pointer">
              {opts.map((o: string) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
            </select>
          </div>
        ))}
        <button onClick={() => refetch()} className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors flex items-center gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{total.toLocaleString()} users found</p>

      {/* Table */}
      <div className="planner-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {["User", "Plan", "Role", "Status", "Joined", "Last Active", "Activity", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u: any) => (
                  <>
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-foreground leading-none">{u.name ?? "—"}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {editingPlan === u.id ? (
                          <div className="flex items-center gap-1">
                            <select defaultValue={u.subscriptionPlan ?? "free"}
                              onChange={e => setPlanMut.mutate({ userId: u.id, plan: e.target.value as any })}
                              className="text-xs px-2 py-1 border border-border rounded-md bg-background cursor-pointer">
                              {["free","pro","elite"].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <button onClick={() => setEditingPlan(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingPlan(u.id)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${PLAN_BADGE[u.subscriptionPlan ?? "free"] ?? PLAN_BADGE.free}`}>
                            {(u.subscriptionPlan ?? "free").toUpperCase()} <Edit2 size={9} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[u.role] ?? ROLE_BADGE.user}`}>
                          {(u.role ?? "user").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-[11px] font-medium ${u.subscriptionStatus === "suspended" ? "text-red-500" : "text-emerald-600"}`}>
                          {u.subscriptionStatus === "suspended" ? <Ban size={11} /> : <CheckCircle2 size={11} />}
                          {u.subscriptionStatus === "suspended" ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">{fmt(u.createdAt)}</td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">{fmt(u.lastSignedIn)}</td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">
                        {Number(u.entryCount)}d / {Number(u.checkInCount)}ci
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                            title="View details"
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => setRoleMut.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" })}
                            title={u.role === "admin" ? "Remove admin" : "Make admin"}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-amber-500">
                            <Star size={13} />
                          </button>
                          <button
                            onClick={() => setSuspendedMut.mutate({ userId: u.id, suspended: u.subscriptionStatus !== "suspended" })}
                            title={u.subscriptionStatus === "suspended" ? "Unblock user" : "Block user"}
                            className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${u.subscriptionStatus === "suspended" ? "text-emerald-500" : "text-muted-foreground hover:text-orange-500"}`}>
                            <Ban size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u.id)}
                            title="Delete user permanently"
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Delete confirmation row */}
                    {confirmDelete === u.id && (
                      <tr key={`del-${u.id}`}>
                        <td colSpan={8} className="bg-red-50 dark:bg-red-950/20 border-y border-red-200 dark:border-red-900 px-6 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-800 dark:text-red-300 flex-1">
                              <strong>Permanently delete</strong> <em>{u.name ?? u.email}</em>? All their data will be erased. This cannot be undone.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => deleteUserMut.mutate({ userId: u.id })}
                                disabled={deleteUserMut.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
                                {deleteUserMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 size={11} />}
                                Delete forever
                              </button>
                              <button onClick={() => setConfirmDelete(null)}
                                className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted">
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Expanded user detail */}
                    {expandedUser === u.id && (
                      <tr key={`detail-${u.id}`}>
                        <td colSpan={8} className="bg-muted/20 px-6 py-4">
                          {!userDetail ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</div> : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              {[
                                { label: "Daily Entries", value: Number((userDetail as any).entryCount) },
                                { label: "Check-ins", value: Number((userDetail as any).checkInCount) },
                                { label: "Zion Messages", value: Number((userDetail as any).zionCount) },
                                { label: "Devotions", value: Number((userDetail as any).devotionCount) },
                                { label: "Notes", value: Number((userDetail as any).noteCount) },
                                { label: "Login Method", value: (userDetail as any).loginMethod ?? "—" },
                                { label: "Timezone", value: (userDetail as any).timezone ?? "—" },
                                { label: "Onboarding", value: (userDetail as any).onboardingCompleted ? "✅" : "Incomplete" },
                                { label: "Email Notifs", value: (userDetail as any).emailNotificationsEnabled ? "On" : "Off" },
                                { label: "Devotion Popup", value: (userDetail as any).devotionPopupEnabled ? "On" : "Off" },
                                { label: "Stripe Customer", value: (userDetail as any).stripeCustomerId ? "Connected" : "None" },
                                { label: "Period End", value: fmt((userDetail as any).subscriptionPeriodEnd) },
                              ].map(item => (
                                <div key={item.label} className="bg-background rounded-lg px-3 py-2 border border-border">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                                  <p className="font-semibold mt-0.5">{item.value}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No users found.</p>}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</p>
          <div className="flex gap-2">
            <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}
              className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors">← Prev</button>
            <button disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}
              className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ═════════════════════════════════════════════════════════════════════════════
function AnalyticsTab() {
  const [days, setDays] = useState(30);
  const { data: growth, isLoading: gLoading } = trpc.adminPanel.userGrowth.useQuery({ days });
  const { data: overview } = trpc.adminPanel.overview.useQuery();
  const { data: topUsers, isLoading: tLoading } = trpc.adminPanel.topUsers.useQuery();
  const o = overview as any;

  const totalNewInPeriod = useMemo(() => (growth ?? []).reduce((s: number, d: any) => s + d.count, 0), [growth]);

  return (
    <div className="space-y-6">
      {/* Growth chart */}
      <div className="planner-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold">User Growth</p>
            <p className="text-[11px] text-muted-foreground">{totalNewInPeriod} new users in last {days} days</p>
          </div>
          <div className="flex gap-1">
            {[7,14,30,90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${days === d ? "bg-violet-600 text-white" : "border border-border hover:bg-muted"}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        {gLoading ? <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin" /></div>
          : <BarChart data={(growth ?? []) as any[]} height={150} />}
      </div>

      {/* Retention metrics */}
      {o && (
        <div className="planner-card p-5">
          <p className="text-sm font-bold mb-4">Retention</p>
          <div className="space-y-3">
            {[
              { label: "DAU (Active Today)", value: Number(o.activeToday), total: Number(o.totalUsers) },
              { label: "WAU (Active 7 days)", value: Number(o.activeWeek), total: Number(o.totalUsers) },
              { label: "MAU (Active 30 days)", value: Number(o.activeMonth), total: Number(o.totalUsers) },
            ].map(m => {
              const pct = m.total > 0 ? Math.round((m.value / m.total) * 100) : 0;
              return (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-semibold">{m.value.toLocaleString()} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top users */}
      <div className="planner-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-bold">Most Engaged Users (30 days)</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Ranked by check-ins + daily entries</p>
        </div>
        {tLoading ? <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <div className="divide-y divide-border">
            {((topUsers ?? []) as any[]).slice(0, 10).map((u: any, i: number) => (
              <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.name ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PLAN_BADGE[u.subscriptionPlan ?? "free"] ?? PLAN_BADGE.free}`}>
                  {(u.subscriptionPlan ?? "free").toUpperCase()}
                </span>
                <div className="text-right">
                  <p className="text-xs font-bold">{Number(u.checkInDays) + Number(u.entryDays)}</p>
                  <p className="text-[10px] text-muted-foreground">actions</p>
                </div>
              </div>
            ))}
            {(topUsers ?? []).length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No data yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PLANS TAB
// ═════════════════════════════════════════════════════════════════════════════
function PlansTab() {
  const { data: config, isLoading, refetch } = trpc.adminPanel.getPlanConfig.useQuery();
  const updateMut = trpc.adminPanel.updatePlanConfig.useMutation({ onSuccess: () => { toast.success("Plan updated"); refetch(); setEditing(null); } });
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  const startEdit = (planId: string, plan: any) => {
    setEditing(planId);
    setForm({ ...plan, features: plan.features.join("\n") });
  };

  const save = () => {
    if (!editing) return;
    updateMut.mutate({
      planId: editing as any,
      displayName: form.displayName,
      monthlyPrice: parseFloat(form.monthlyPrice) || 0,
      zionMessageLimit: parseInt(form.zionMessageLimit, 10),
      features: form.features.split("\n").map((s: string) => s.trim()).filter(Boolean),
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>;

  const plans = config as any ?? {};

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Manage plan names, pricing display, and feature lists. These are stored in your database and persist across deploys.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["free","pro","elite"].map(planId => {
          const plan = plans[planId] ?? {};
          const isOpen = editing === planId;
          const borderColor = planId === "elite" ? "border-amber-300 dark:border-amber-800" : planId === "pro" ? "border-violet-300 dark:border-violet-800" : "border-border";
          return (
            <div key={planId} className={`planner-card overflow-hidden border-2 ${borderColor}`}>
              <div className={`px-4 py-3 flex items-center justify-between ${planId === "elite" ? "bg-amber-50 dark:bg-amber-950/20" : planId === "pro" ? "bg-violet-50 dark:bg-violet-950/20" : "bg-muted/40"}`}>
                <div>
                  <p className="text-sm font-black">{plan.displayName ?? planId}</p>
                  <p className="text-[11px] text-muted-foreground">${plan.monthlyPrice ?? 0}/mo</p>
                </div>
                <button onClick={() => isOpen ? setEditing(null) : startEdit(planId, plan)}
                  className="p-1.5 rounded-lg hover:bg-background/60 transition-colors">
                  {isOpen ? <X size={14} /> : <Edit2 size={14} />}
                </button>
              </div>
              <div className="p-4">
                {isOpen ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Display Name</label>
                      <input value={form.displayName ?? ""} onChange={e => setForm((f: any) => ({ ...f, displayName: e.target.value }))}
                        className="w-full mt-1 px-2.5 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Price ($)</label>
                      <input type="number" min="0" step="0.01" value={form.monthlyPrice ?? 0} onChange={e => setForm((f: any) => ({ ...f, monthlyPrice: e.target.value }))}
                        className="w-full mt-1 px-2.5 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Zion Message Limit (-1 = unlimited)</label>
                      <input type="number" min="-1" value={form.zionMessageLimit ?? 10} onChange={e => setForm((f: any) => ({ ...f, zionMessageLimit: e.target.value }))}
                        className="w-full mt-1 px-2.5 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Features (one per line)</label>
                      <textarea rows={6} value={form.features ?? ""} onChange={e => setForm((f: any) => ({ ...f, features: e.target.value }))}
                        className="w-full mt-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none" />
                    </div>
                    <button onClick={save} disabled={updateMut.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors">
                      {updateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save size={13} />}
                      Save Changes
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {(plan.features ?? []).map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!isOpen && (
                <div className="px-4 pb-3">
                  <div className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    Zion limit: {plan.zionMessageLimit === -1 ? "Unlimited" : `${plan.zionMessageLimit} msgs/mo`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BROADCAST TAB
// ═════════════════════════════════════════════════════════════════════════════
function BroadcastTab() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all"|"free"|"pro"|"elite">("all");
  const [confirming, setConfirming] = useState(false);
  const broadcastMut = trpc.adminPanel.broadcastEmail.useMutation({
    onSuccess: (r: any) => {
      toast.success(`Sent to ${r.sent}/${r.total} recipients`);
      setSubject(""); setBody(""); setConfirming(false);
    },
    onError: (e) => { toast.error(e.message); setConfirming(false); },
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="planner-card p-5 space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Audience</label>
          <div className="flex gap-2 mt-2">
            {(["all","free","pro","elite"] as const).map(a => (
              <button key={a} onClick={() => setAudience(a)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-semibold transition-colors ${audience === a ? "bg-violet-600 text-white border-violet-600" : "border-border hover:bg-muted"}`}>
                {a === "all" ? "All Users" : a.charAt(0).toUpperCase() + a.slice(1) + " Plan"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..."
            className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Message Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Write your message here..."
            className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none" />
        </div>

        {!confirming ? (
          <button onClick={() => setConfirming(true)} disabled={!subject.trim() || !body.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
            <Send size={14} /> Preview & Send
          </button>
        ) : (
          <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Confirm Broadcast</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Sending <strong>"{subject}"</strong> to all <strong>{audience === "all" ? "users" : `${audience} plan users`}</strong> who have email notifications enabled.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => broadcastMut.mutate({ subject, body, audience })} disabled={broadcastMut.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-60">
                {broadcastMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send size={12} />} Send Now
              </button>
              <button onClick={() => setConfirming(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SYSTEM TAB
// ═════════════════════════════════════════════════════════════════════════════
function SystemTab() {
  const { data: jobs, isLoading: jLoading } = trpc.adminPanel.schedulerJobs.useQuery();
  const { data: dbStats, isLoading: dLoading } = trpc.adminPanel.dbStats.useQuery();
  const { data: auditLog, isLoading: aLoading } = trpc.adminPanel.recentAuditLog.useQuery({ limit: 30, category: "all" });

  const fmtDate = (d: any) => { try { return new Date(d).toLocaleString(); } catch { return "—"; } };

  return (
    <div className="space-y-6">
      {/* Scheduler */}
      <div className="planner-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Clock size={14} className="text-violet-500" />
          <p className="text-sm font-bold">Scheduler Job Status</p>
        </div>
        {jLoading ? <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {["Job Type", "Last Run", "Runs (30d)", "Unique Users"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-muted-foreground text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {((jobs ?? []) as any[]).map((j: any) => (
                  <tr key={j.jobType} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono font-medium">{j.jobType}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(j.lastRun)}</td>
                    <td className="px-4 py-2.5">{Number(j.totalRuns).toLocaleString()}</td>
                    <td className="px-4 py-2.5">{Number(j.uniqueUsers).toLocaleString()}</td>
                  </tr>
                ))}
                {(jobs ?? []).length === 0 && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No scheduler data yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DB Stats */}
      <div className="planner-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={14} className="text-violet-500" />
          <p className="text-sm font-bold">Database Table Sizes</p>
        </div>
        {dLoading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {((dbStats ?? []) as any[]).map((t: any) => (
              <div key={t.table} className="bg-muted/40 rounded-lg px-3 py-2 text-xs">
                <p className="font-mono text-muted-foreground truncate">{t.table}</p>
                <p className="font-bold text-lg mt-0.5">{t.rows >= 0 ? Number(t.rows).toLocaleString() : "err"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Log */}
      <div className="planner-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Shield size={14} className="text-violet-500" />
          <p className="text-sm font-bold">Recent Audit Log</p>
        </div>
        {aLoading ? <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {["Event", "Category", "Outcome", "User ID", "IP", "Time"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-muted-foreground text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {((auditLog ?? []) as any[]).map((e: any) => (
                  <tr key={e.id} className={`hover:bg-muted/20 ${e.outcome === "failure" ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}>
                    <td className="px-4 py-2 font-mono">{e.event}</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        e.category === "security" ? "bg-red-100 dark:bg-red-900/40 text-red-600" :
                        e.category === "admin" ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600" :
                        "bg-blue-100 dark:bg-blue-900/40 text-blue-600"
                      }`}>{e.category}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`${e.outcome === "failure" ? "text-red-500" : e.outcome === "blocked" ? "text-amber-500" : "text-emerald-600"}`}>{e.outcome}</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{e.userId ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">{e.ip ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(e.createdAt)}</td>
                  </tr>
                ))}
                {(auditLog ?? []).length === 0 && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No audit events yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COMMUNITY MODERATION TAB
// ═════════════════════════════════════════════════════════════════════════════
function CommunityTab() {
  const [showDeleted, setShowDeleted] = useState(true);
  const [showFlagged, setShowFlagged] = useState(false);
  const [confirmDeleteMsg, setConfirmDeleteMsg] = useState<number | null>(null);

  const { data: messages = [], isLoading, refetch } = trpc.adminPanel.listCommunityMessages.useQuery(
    { limit: 100, showDeleted, showFlagged },
    { refetchOnWindowFocus: false }
  );

  const deleteMsgMut = trpc.adminPanel.deleteCommunityMessage.useMutation({
    onSuccess: () => { toast.success("Message removed"); refetch(); setConfirmDeleteMsg(null); },
    onError: (e) => toast.error(e.message),
  });

  const fmtDate = (d: any) => {
    try { return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch { return "—"; }
  };

  const msgs = messages as any[];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="planner-card p-4 flex flex-wrap items-center gap-4">
        <p className="text-sm font-bold flex-1">Community Messages</p>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)}
            className="w-3.5 h-3.5 accent-violet-600" />
          Show deleted
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showFlagged} onChange={e => setShowFlagged(e.target.checked)}
            className="w-3.5 h-3.5 accent-red-600" />
          Flagged only
        </label>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{msgs.length} messages loaded</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
      ) : (
        <div className="space-y-2">
          {msgs.map((m: any) => {
            const isRemoved = m.isDeleted || m.deletedByAdmin;
            return (
              <div key={m.id}
                className={`planner-card p-4 ${isRemoved ? "opacity-50" : ""} ${m.flagCount > 0 ? "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10" : ""}`}>
                <div className="flex items-start gap-3">
                  {/* Avatar placeholder */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                    {(m.userName ?? "?")[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold">{m.userName ?? "Unknown"}</span>
                      <span className="text-[10px] text-muted-foreground">{m.userEmail}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PLAN_BADGE[m.subscriptionPlan ?? "free"] ?? PLAN_BADGE.free}`}>
                        {(m.subscriptionPlan ?? "free").toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{fmtDate(m.createdAt)}</span>
                    </div>

                    <p className={`text-sm leading-relaxed ${isRemoved ? "italic text-muted-foreground" : "text-foreground"}`}>
                      {isRemoved ? "[Message removed]" : m.content}
                    </p>

                    {m.flagCount > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span className="text-[11px] text-red-500 font-semibold">{m.flagCount} flag{m.flagCount !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    {!isRemoved && (
                      confirmDeleteMsg === m.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-500">Remove?</span>
                          <button onClick={() => deleteMsgMut.mutate({ messageId: m.id })} disabled={deleteMsgMut.isPending}
                            className="px-2.5 py-1 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center gap-1">
                            {deleteMsgMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Yes
                          </button>
                          <button onClick={() => setConfirmDeleteMsg(null)}
                            className="px-2 py-1 text-xs border border-border rounded-lg hover:bg-muted">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteMsg(m.id)}
                          title="Delete this message"
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )
                    )}
                    {isRemoved && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">Removed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {msgs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No messages found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
    </div>
  );

  if (!user || (user as any).role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-lg font-bold">Access Denied</p>
          <p className="text-sm text-muted-foreground">This page is restricted to administrators.</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-violet-950 to-indigo-950 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white">BDB Admin</p>
              <p className="text-[10px] text-white/60">Creator Dashboard</p>
            </div>
          </div>
          <button onClick={() => navigate("/")} className="text-xs text-white/60 hover:text-white transition-colors flex items-center gap-1.5">
            <Home size={12} /> Back to App
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tab nav */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? "bg-violet-600 text-white" : "hover:bg-muted text-muted-foreground"
                }`}>
                <Icon size={14} />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "overview"   && <OverviewTab />}
        {activeTab === "users"      && <UsersTab />}
        {activeTab === "analytics"  && <AnalyticsTab />}
        {activeTab === "community"  && <CommunityTab />}
        {activeTab === "plans"      && <PlansTab />}
        {activeTab === "broadcast"  && <BroadcastTab />}
        {activeTab === "system"     && <SystemTab />}
      </div>
    </div>
  );
}
