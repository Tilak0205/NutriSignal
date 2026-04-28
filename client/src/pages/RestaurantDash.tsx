import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, UtensilsCrossed, QrCode, Brain, ClipboardList,
  MessageSquare, Plus, Trash2, Eye, Download, ChevronDown, ChevronUp,
  TrendingUp, ShoppingBag as BagIcon, Star, X, Upload, CheckCircle2,
  AlertCircle, Clock, ArrowRight, Image as ImageIcon, Loader2, Pencil, Save,
  ChevronLeft, ChevronRight, Power,
} from "lucide-react";
import { api } from "../lib/api";

const MENU_CATEGORIES = ["Vegan", "Gluten-Free", "Vegetarian", "Non-Vegetarian", "Sweets", "Desserts", "Beverages", "Alcohol"] as const;

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "Good Vibes",
  neutral: "Mellow",
  negative: "Needs Care",
};

const SENTIMENT_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "positive", label: "Good Vibes" },
  { value: "neutral", label: "Mellow" },
  { value: "negative", label: "Needs Care" },
];

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function groupInsightsByDate(insights: Insight[]) {
  const map = new Map<string, Insight[]>();
  for (const i of insights) {
    const d = new Date(i.createdAt).toDateString();
    const group = map.get(d) ?? [];
    group.push(i);
    map.set(d, group);
  }
  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
  return Array.from(map.entries()).map(([dateStr, items]) => {
    let label = new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    if (dateStr === todayStr) label = "Today";
    else if (dateStr === yesterdayStr) label = "Yesterday";
    return { dateStr, label, items, isRecent: dateStr === todayStr || dateStr === yesterdayStr };
  });
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-800 shrink-0">{title}</h2>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      {sub && <p className="text-sm text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

type Category = { id: string; name: string; items: Item[] };
type Item = { id: string; name: string; price: number; description?: string; isAvailable: boolean; categoryId: string; images: string[] };
type Table = { id: string; tableNumber: number };
type Insight = { id: string; sentiment: string; keyInsights: string[]; interactionTips: string[]; serviceApproach: string; createdAt: string; table: { tableNumber: number } };
type OrderData = { id: string; status: string; totalAmount: number; createdAt: string; notes?: string; table: { tableNumber: number }; items: { quantity: number; specialInstructions?: string; menuItem: { name: string; price: number } }[] };
type FeedbackData = { id: string; rating: number; comment?: string; createdAt: string };
type Tab = "overview" | "menu" | "tables" | "insights" | "orders" | "feedback";

const NAV: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "menu", label: "Menu", icon: UtensilsCrossed },
  { key: "tables", label: "Tables & QR", icon: QrCode },
  { key: "insights", label: "Insights", icon: Brain },
  { key: "orders", label: "Orders", icon: ClipboardList },
  { key: "feedback", label: "Feedback", icon: MessageSquare },
];

export default function RestaurantDash() {
  const [tab, setTab] = useState<Tab>("overview");
  const [highlightInsightId, setHighlightInsightId] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ name: "", brandPrimaryColor: "#0ea5e9", brandSecondaryColor: "#22c55e", description: "", address: "", phone: "" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [qStats, setQStats] = useState<{ totalResponses: number; questionStats: Record<string, Record<string, number>> } | null>(null);
  const [toast, setToast] = useState("");

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const load = async () => {
    const [p, c, t, m, o, f, q] = await Promise.all([
      api.get("/restaurant/profile"), api.get("/restaurant/menu/categories"), api.get("/restaurant/tables"),
      api.get("/restaurant/mood-insights"), api.get("/restaurant/orders"), api.get("/restaurant/feedbacks"),
      api.get("/restaurant/questionnaire-stats"),
    ]);
    setProfile({ name: p.data?.name ?? "", brandPrimaryColor: p.data?.brandPrimaryColor ?? "#0ea5e9", brandSecondaryColor: p.data?.brandSecondaryColor ?? "#22c55e", description: p.data?.description ?? "", address: p.data?.address ?? "", phone: p.data?.phone ?? "" });
    setCategories(c.data); setTables(t.data); setInsights(m.data); setOrders(o.data); setFeedbacks(f.data); setQStats(q.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const accent = profile.brandPrimaryColor;
  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length) : 0;
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;

  const goToInsight = (id: string) => { setHighlightInsightId(id); setTab("insights"); };

  return (
    <div className="min-h-[calc(100dvh-52px)] flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-slate-200 hidden md:flex flex-col py-4">
        <div className="px-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm" style={{ background: accent }}>
              {profile.name.charAt(0).toUpperCase() || "R"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">{profile.name || "Restaurant"}</div>
              <div className="text-xs text-slate-400">Dashboard</div>
            </div>
          </div>
        </div>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.key;
          return (
            <button key={n.key} onClick={() => setTab(n.key)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${active ? "text-sky-600 bg-sky-50/80 border-r-2 border-sky-500" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
            >
              <Icon className="w-4 h-4" />{n.label}
              {n.key === "orders" && pendingOrders > 0 && <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendingOrders}</span>}
            </button>
          );
        })}
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-40">
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <button key={n.key} onClick={() => setTab(n.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${tab === n.key ? "text-sky-600" : "text-slate-400"}`}
            >
              <Icon className="w-4 h-4" />{n.label}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-20 md:pb-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 rounded-2xl bg-slate-200" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-white border border-slate-200" />)}
            </div>
            <div className="h-8 rounded-xl bg-white border border-slate-200" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white border border-slate-200" />)}
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {tab === "overview" && <OverviewTab accent={accent} orders={orders} insights={insights} totalItems={totalItems} tables={tables} avgRating={avgRating} pendingOrders={pendingOrders} profile={profile} setProfile={setProfile} load={load} flash={flash} setTab={setTab} goToInsight={goToInsight} />}
              {tab === "menu" && <MenuTab categories={categories} load={load} flash={flash} accent={accent} />}
              {tab === "tables" && <TablesTab tables={tables} load={load} flash={flash} />}
              {tab === "insights" && <InsightsTab insights={insights} accent={accent} highlightInsightId={highlightInsightId} qStats={qStats} />}
              {tab === "orders" && <OrdersTab orders={orders} load={load} flash={flash} accent={accent} />}
              {tab === "feedback" && <FeedbackTab feedbacks={feedbacks} avgRating={avgRating} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-20 md:bottom-6 right-4 bg-slate-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50"
          >{toast}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Overview ---------- */
function OverviewTab({ accent, orders, insights, totalItems, tables, avgRating, pendingOrders, profile, setProfile, load, flash, setTab, goToInsight }: {
  accent: string; orders: OrderData[]; insights: Insight[]; totalItems: number; tables: Table[];
  avgRating: number; pendingOrders: number;
  profile: { name: string; brandPrimaryColor: string; brandSecondaryColor: string; description: string; address: string; phone: string };
  setProfile: (fn: (s: typeof profile) => typeof profile) => void; load: () => void; flash: (m: string) => void;
  setTab: (tab: Tab) => void; goToInsight: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPwChange, setShowPwChange] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  const save = async () => {
    setSaving(true);
    try { await api.put("/restaurant/profile", profile); load(); flash("Profile saved"); setEditing(false); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwForm.newPassword.length < 6) { setPwError("New password must be at least 6 characters"); return; }
    if (pwForm.newPassword !== pwForm.confirm) { setPwError("Passwords don't match"); return; }
    setPwError(""); setPwSaving(true);
    try {
      await api.put("/restaurant/change-password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      flash("Password updated"); setShowPwChange(false); setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwError(msg ?? "Failed to change password");
    } finally { setPwSaving(false); }
  };

  const sentimentBadge: Record<string, string> = { positive: "bg-emerald-100 text-emerald-700", negative: "bg-red-100 text-red-700", neutral: "bg-amber-100 text-amber-700" };
  const sentimentBorder: Record<string, string> = { positive: "border-l-emerald-400", negative: "border-l-red-400", neutral: "border-l-amber-400" };

  const recentInsights = insights.slice(0, 3);
  const todayStr = new Date().toDateString();
  const todayInsights = insights.filter(i => new Date(i.createdAt).toDateString() === todayStr);
  const mostDelayed = todayInsights.length > 1
    ? todayInsights[todayInsights.length - 1]
    : insights.length > 1 ? insights[insights.length - 1] : null;

  const stats: { label: string; value: number | string; icon: typeof BagIcon; color: string; tab: Tab }[] = [
    { label: "Orders", value: orders.length, icon: BagIcon, color: "bg-sky-100 text-sky-600", tab: "orders" },
    { label: "Pending", value: pendingOrders, icon: ClipboardList, color: "bg-amber-100 text-amber-600", tab: "orders" },
    { label: "Insights", value: insights.length, icon: Brain, color: "bg-purple-100 text-purple-600", tab: "insights" },
    { label: "Menu Items", value: totalItems, icon: UtensilsCrossed, color: "bg-emerald-100 text-emerald-600", tab: "menu" },
    { label: "Tables", value: tables.length, icon: QrCode, color: "bg-rose-100 text-rose-600", tab: "tables" },
    { label: "Avg Rating", value: avgRating ? `${avgRating.toFixed(1)}★` : "—", icon: Star, color: "bg-amber-100 text-amber-600", tab: "feedback" },
  ];

  return (
    <div className="space-y-5">
      {/* Gradient banner */}
      <div className="rounded-2xl p-5 text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl font-bold shrink-0">
            {profile.name.charAt(0).toUpperCase() || "R"}
          </div>
          <div>
            <div className="text-lg font-bold leading-tight">{profile.name || "Your Restaurant"}</div>
            <div className="text-sm text-white/70 mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>
          {pendingOrders > 0 && (
            <div className="ml-auto bg-white/20 rounded-lg px-3 py-1.5 text-center">
              <div className="text-lg font-bold">{pendingOrders}</div>
              <div className="text-[10px] text-white/80 font-medium">pending</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => setTab(s.tab)}
              className="bg-white rounded-xl border border-slate-200 p-3.5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
              <div className="text-xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Recent Insights */}
      {recentInsights.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-purple-500" /> Recent Insights
            </h3>
            <button onClick={() => setTab("insights")} className="text-xs text-sky-500 hover:text-sky-600 font-medium flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentInsights.map((insight) => (
              <button
                key={insight.id}
                onClick={() => goToInsight(insight.id)}
                className={`w-full text-left bg-white border border-slate-200 border-l-4 ${sentimentBorder[insight.sentiment] ?? "border-l-slate-300"} rounded-xl p-3 hover:shadow-md transition-all duration-150 flex items-center gap-3`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-800">Table {insight.table.tableNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sentimentBadge[insight.sentiment] ?? ""}`}>
                      {SENTIMENT_LABEL[insight.sentiment] ?? insight.sentiment}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{(insight.interactionTips as string[])[0] ?? insight.serviceApproach}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium text-slate-500">{relativeTime(insight.createdAt)}</div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 mt-1 ml-auto" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Needs Attention */}
      {mostDelayed && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" /> Needs Attention
            </h3>
            <span className="text-xs text-slate-400">Oldest unaddressed</span>
          </div>
          <button
            onClick={() => goToInsight(mostDelayed.id)}
            className="w-full text-left bg-amber-50 border border-amber-200 border-l-4 border-l-amber-400 rounded-xl p-3 hover:shadow-md transition-all duration-150 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-slate-800">Table {mostDelayed.table.tableNumber}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sentimentBadge[mostDelayed.sentiment] ?? ""}`}>
                  {SENTIMENT_LABEL[mostDelayed.sentiment] ?? mostDelayed.sentiment}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">{(mostDelayed.interactionTips as string[])[0] ?? mostDelayed.serviceApproach}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-bold text-amber-600">{relativeTime(mostDelayed.createdAt)}</div>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 mt-1 ml-auto" />
            </div>
          </button>
        </div>
      )}

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">Restaurant Profile</h3>
          <button
            onClick={() => editing ? save() : setEditing(true)}
            disabled={saving}
            className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors min-w-[60px] flex items-center justify-center gap-1.5"
            style={editing ? { background: accent, color: "white" } : { background: "#f1f5f9", color: "#475569" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing ? "Save" : "Edit"}
          </button>
        </div>
        {editing ? (
          <div className="grid gap-3">
            <input value={profile.name} onChange={(e) => setProfile((s) => ({ ...s, name: e.target.value }))} placeholder="Restaurant name" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
            <textarea value={profile.description} onChange={(e) => setProfile((s) => ({ ...s, description: e.target.value }))} placeholder="Description" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 h-20 resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <input value={profile.address} onChange={(e) => setProfile((s) => ({ ...s, address: e.target.value }))} placeholder="Address" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
              <input value={profile.phone} onChange={(e) => setProfile((s) => ({ ...s, phone: e.target.value }))} placeholder="Phone" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2"><input type="color" value={profile.brandPrimaryColor} onChange={(e) => setProfile((s) => ({ ...s, brandPrimaryColor: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" /><span className="text-xs text-slate-400">Primary</span></div>
              <div className="flex items-center gap-2"><input type="color" value={profile.brandSecondaryColor} onChange={(e) => setProfile((s) => ({ ...s, brandSecondaryColor: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" /><span className="text-xs text-slate-400">Secondary</span></div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 text-sm text-slate-600">
            <div className="font-medium text-slate-800">{profile.name}</div>
            {profile.description && <p className="text-slate-400">{profile.description}</p>}
            {profile.address && <p>📍 {profile.address}</p>}
            {profile.phone && <p>📞 {profile.phone}</p>}
            <div className="flex items-center gap-3 pt-1">
              <div className="w-5 h-5 rounded" style={{ background: profile.brandPrimaryColor }} />
              <div className="w-5 h-5 rounded" style={{ background: profile.brandSecondaryColor }} />
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <button onClick={() => setShowPwChange(!showPwChange)} className="flex items-center justify-between w-full">
          <h3 className="font-semibold text-slate-800 text-sm">Change Password</h3>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showPwChange ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {showPwChange && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid gap-2.5 mt-3">
                <input type="password" value={pwForm.currentPassword} onChange={(e) => { setPwForm(s => ({ ...s, currentPassword: e.target.value })); setPwError(""); }}
                  placeholder="Current password" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                <input type="password" value={pwForm.newPassword} onChange={(e) => { setPwForm(s => ({ ...s, newPassword: e.target.value })); setPwError(""); }}
                  placeholder="New password (min 6 chars)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                <input type="password" value={pwForm.confirm} onChange={(e) => { setPwForm(s => ({ ...s, confirm: e.target.value })); setPwError(""); }}
                  placeholder="Confirm new password" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                {pwError && <p className="text-red-500 text-xs">{pwError}</p>}
                <button onClick={changePassword} disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirm}
                  className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-all disabled:opacity-40"
                  style={{ background: accent }}>
                  {pwSaving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const CATEGORY_EMOJI: Record<string, string> = {
  "Vegan": "🌱", "Gluten-Free": "🌾", "Vegetarian": "🥬", "Non-Vegetarian": "🥩",
  "Sweets": "🍬", "Desserts": "🍰", "Beverages": "☕", "Alcohol": "🍺",
};

/* ---------- Menu ---------- */
function MenuTab({ categories, load, flash, accent }: { categories: Category[]; load: () => void; flash: (m: string) => void; accent: string }) {
  const [newCat, setNewCat] = useState("");
  const [newItem, setNewItem] = useState<{ name: string; price: number; description: string; categoryId: string; images: string[] }>({ name: "", price: 0, description: "", categoryId: "", images: [] });
  const [showAddItem, setShowAddItem] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [editModal, setEditModal] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; price: number; description: string; images: string[]; categoryId: string }>({ name: "", price: 0, description: "", images: [], categoryId: "" });
  const [editDragOver, setEditDragOver] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  const [viewModal, setViewModal] = useState<Item | null>(null);
  const [viewSlide, setViewSlide] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableCategories = MENU_CATEGORIES.filter(cat => !categories.some(c => c.name === cat));

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setNewItem(s => { if (s.images.length >= 5) return s; return { ...s, images: [...s.images, result] }; });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEditFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEditForm(s => { if (s.images.length >= 5) return s; return { ...s, images: [...s.images, result] }; });
      };
      reader.readAsDataURL(file);
    });
  };

  const addCat = async () => {
    if (!newCat) return;
    setSavingCat(true);
    try {
      await api.post("/restaurant/menu/categories", { name: newCat });
      setNewCat(""); load(); flash("Category added");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      flash(msg ?? "Failed to add category");
    } finally { setSavingCat(false); }
  };

  const delCat = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its items?`)) return;
    await api.delete(`/restaurant/menu/categories/${id}`); load(); flash("Category deleted");
  };

  const addItem = async () => {
    if (!newItem.name.trim() || !newItem.categoryId || newItem.price <= 0) return;
    setSavingItem(true);
    try {
      await api.post("/restaurant/menu/items", { name: newItem.name.trim(), price: newItem.price, description: newItem.description, categoryId: newItem.categoryId, images: newItem.images });
      setNewItem({ name: "", price: 0, description: "", categoryId: "", images: [] });
      load(); flash("Item added"); setShowAddItem(false);
    } finally { setSavingItem(false); }
  };

  const delItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await api.delete(`/restaurant/menu/items/${id}`); load(); flash("Item removed");
  };
  const toggleItem = async (id: string, current: boolean) => { await api.put(`/restaurant/menu/items/${id}`, { isAvailable: !current }); load(); };

  const openEdit = (item: Item) => {
    setEditModal(item);
    setEditForm({ name: item.name, price: item.price, description: item.description ?? "", images: item.images ?? [], categoryId: item.categoryId });
  };
  const saveEdit = async () => {
    if (!editModal || !editForm.name.trim() || editForm.price <= 0) return;
    setSavingEdit(true);
    try {
      await api.put(`/restaurant/menu/items/${editModal.id}`, {
        name: editForm.name.trim(), price: editForm.price, description: editForm.description,
        images: editForm.images, categoryId: editForm.categoryId,
      });
      load(); flash("Item updated"); setEditModal(null);
    } finally { setSavingEdit(false); }
  };

  const openView = (item: Item) => { setViewModal(item); setViewSlide(0); };

  const toggleCollapse = (catId: string) => setCollapsed(p => ({ ...p, [catId]: !p[catId] }));
  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Menu</h2>
          <p className="text-xs text-slate-400">{categories.length} categories · {totalItems} items</p>
        </div>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowAddItem(!showAddItem)}
          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
          style={{ background: showAddItem ? "#1e293b" : accent, color: "white" }}>
          <Plus className={`w-3.5 h-3.5 transition-transform duration-300 ${showAddItem ? "rotate-45" : ""}`} />
          {showAddItem ? "Close" : "Add Item"}
        </motion.button>
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {categories.map(cat => {
            const emoji = CATEGORY_EMOJI[cat.name] ?? "🍽️";
            const isOpen = !collapsed[cat.id];
            return (
              <motion.button key={cat.id} whileTap={{ scale: 0.92 }}
                onClick={() => { setCollapsed(p => ({ ...p, [cat.id]: false })); document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border"
                style={isOpen ? { background: `${accent}10`, color: accent, borderColor: `${accent}30` } : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
                <span className="text-xs">{emoji}</span> {cat.name}
                {cat.items.length > 0 && <span className="text-[9px] opacity-50">{cat.items.length}</span>}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Add Item form */}
      <AnimatePresence>
        {showAddItem && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: accent }}>
                <Plus className="w-3.5 h-3.5 text-white" />
                <span className="text-white font-bold text-xs">New Menu Item</span>
              </div>
              <div className="p-4 grid gap-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <input value={newItem.name} onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))} placeholder="Item name *"
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">£</span>
                    <input type="number" min={0} step={0.01} value={newItem.price || ""} onChange={(e) => setNewItem((s) => ({ ...s, price: Number(e.target.value) }))} placeholder="0.00"
                      className="w-full border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                  </div>
                </div>
                <input value={newItem.description} onChange={(e) => setNewItem((s) => ({ ...s, description: e.target.value }))} placeholder="Description (optional)"
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                <select value={newItem.categoryId} onChange={(e) => setNewItem((s) => ({ ...s, categoryId: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white">
                  <option value="">Category *</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{CATEGORY_EMOJI[c.name] ?? "🍽️"} {c.name}</option>)}
                </select>
                {/* Photos */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Photos</span>
                    <span className="text-[10px] font-bold text-slate-400">{newItem.images.length}/5</span>
                  </div>
                  {newItem.images.length < 5 && (
                    <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all ${dragOver ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><Upload className="w-4 h-4 text-slate-400" /></div>
                      <div><p className="text-xs font-medium text-slate-500">Drop or <span style={{ color: accent }}>browse</span></p><p className="text-[10px] text-slate-400">up to 5 photos</p></div>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                    </div>
                  )}
                  {newItem.images.length > 0 && (
                    <div className="grid grid-cols-5 gap-1.5 mt-2">
                      {newItem.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={(e) => { e.stopPropagation(); setNewItem(s => ({ ...s, images: s.images.filter((_, i) => i !== idx) })); }}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2 h-2" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={addItem} disabled={savingItem || !newItem.name.trim() || !newItem.categoryId || newItem.price <= 0}
                  className="text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.97]"
                  style={{ background: accent }}>
                  {savingItem ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Save Item</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add category */}
      <div className="flex gap-2">
        <select value={newCat} onChange={(e) => setNewCat(e.target.value)}
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white">
          <option value="">+ Add category...</option>
          {availableCategories.map(cat => <option key={cat} value={cat}>{CATEGORY_EMOJI[cat] ?? "🍽️"} {cat}</option>)}
        </select>
        <button onClick={addCat} disabled={!newCat || savingCat}
          className="text-white text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-40 flex items-center gap-1 shrink-0 transition-colors"
          style={{ background: accent }}>
          {savingCat ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
        </button>
      </div>

      {/* Empty */}
      {categories.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center bg-white">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-slate-700 font-semibold text-sm">Your menu is empty</p>
          <p className="text-xs text-slate-400 mt-1">Add a category to get started</p>
        </motion.div>
      )}

      {/* ── Collapsible Category Sections ── */}
      {categories.map((cat) => {
        const emoji = CATEGORY_EMOJI[cat.name] ?? "🍽️";
        const isOpen = !collapsed[cat.id];
        return (
          <div key={cat.id} id={`cat-${cat.id}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <button onClick={() => toggleCollapse(cat.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{emoji}</span>
                <div className="text-left">
                  <h3 className="font-bold text-sm text-slate-800 leading-tight">{cat.name}</h3>
                  <p className="text-[10px] text-slate-400">{cat.items.length} item{cat.items.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span onClick={(e) => { e.stopPropagation(); delCat(cat.id, cat.name); }}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors cursor-pointer">
                  <Trash2 className="w-3 h-3" />
                </span>
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 transition-transform" style={{ transform: isOpen ? "rotate(0)" : "rotate(-90deg)" }}>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="border-t border-slate-100 px-3 py-3">
                    {cat.items.length === 0 ? (
                      <div className="py-4 text-center">
                        <p className="text-xs text-slate-400">No items in this category</p>
                        <button onClick={() => { setNewItem(s => ({ ...s, categoryId: cat.id })); setShowAddItem(true); }}
                          className="mt-1.5 text-[10px] font-bold transition-colors" style={{ color: accent }}>+ Add first item</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {cat.items.map((item, i) => (
                          <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.15 }}
                            className={`rounded-xl border border-slate-100 overflow-hidden group hover:shadow-md transition-all ${!item.isAvailable ? "opacity-50 grayscale" : ""}`}>
                            {/* Image */}
                            <div className="relative aspect-[4/3] overflow-hidden bg-slate-50 cursor-pointer" onClick={() => openView(item)}>
                              {item.images?.[0] ? (
                                <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><span className="text-2xl opacity-15">{emoji}</span></div>
                              )}
                              {item.images && item.images.length > 1 && (
                                <div className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">{item.images.length} pics</div>
                              )}
                              <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold backdrop-blur-md ${item.isAvailable ? "bg-emerald-500/90 text-white" : "bg-black/40 text-white/80"}`}>
                                {item.isAvailable ? "Live" : "Off"}
                              </div>
                            </div>

                            {/* Body */}
                            <div className="p-2.5">
                              <div className="flex items-start justify-between gap-1">
                                <p className={`text-xs font-bold leading-tight line-clamp-2 ${item.isAvailable ? "text-slate-800" : "text-slate-400"}`}>{item.name}</p>
                                <span className="text-xs font-extrabold shrink-0 tabular-nums" style={{ color: accent }}>£{item.price.toFixed(2)}</span>
                              </div>
                              {item.description && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>}

                              {/* Controls row */}
                              <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-50">
                                {/* View */}
                                <button onClick={() => openView(item)} title="View details"
                                  className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-1 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
                                  <Eye className="w-2.5 h-2.5" />
                                </button>
                                {/* Edit */}
                                <button onClick={() => openEdit(item)} title="Edit item"
                                  className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-1 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                                {/* Disable / Enable */}
                                <button onClick={() => toggleItem(item.id, item.isAvailable)} title={item.isAvailable ? "Disable item" : "Enable item"}
                                  className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-1 rounded-md transition-colors ${item.isAvailable ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}>
                                  <Power className="w-2.5 h-2.5" />
                                </button>
                                {/* Delete */}
                                <button onClick={() => delItem(item.id)} title="Delete item"
                                  className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-1 rounded-md bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-auto">
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* ═══════════ View Item Popup ═══════════ */}
      <AnimatePresence>
        {viewModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setViewModal(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Image carousel */}
              {viewModal.images && viewModal.images.length > 0 ? (
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img src={viewModal.images[viewSlide]} alt={viewModal.name} className="w-full h-full object-cover" />
                  {viewModal.images.length > 1 && (
                    <>
                      <button onClick={() => setViewSlide(s => (s - 1 + viewModal.images.length) % viewModal.images.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => setViewSlide(s => (s + 1) % viewModal.images.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {viewModal.images.map((_: string, idx: number) => (
                          <button key={idx} onClick={() => setViewSlide(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${viewSlide === idx ? "bg-white scale-125" : "bg-white/50"}`} />
                        ))}
                      </div>
                    </>
                  )}
                  <button onClick={() => setViewModal(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md ${viewModal.isAvailable ? "bg-emerald-500/90 text-white" : "bg-red-500/80 text-white"}`}>
                    {viewModal.isAvailable ? "Live" : "Disabled"}
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[16/10] bg-slate-50 flex items-center justify-center">
                  <span className="text-5xl opacity-10">{CATEGORY_EMOJI[categories.find(c => c.id === viewModal.categoryId)?.name ?? ""] ?? "🍽️"}</span>
                  <button onClick={() => setViewModal(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-800">{viewModal.name}</h3>
                  <span className="text-lg font-extrabold shrink-0 tabular-nums" style={{ color: accent }}>£{viewModal.price.toFixed(2)}</span>
                </div>
                {viewModal.description && <p className="text-sm text-slate-500 mb-3">{viewModal.description}</p>}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                    {CATEGORY_EMOJI[categories.find(c => c.id === viewModal.categoryId)?.name ?? ""] ?? "🍽️"}{" "}
                    {categories.find(c => c.id === viewModal.categoryId)?.name}
                  </span>
                  {viewModal.images && viewModal.images.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">{viewModal.images.length} photo{viewModal.images.length > 1 ? "s" : ""}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button onClick={() => { openEdit(viewModal); setViewModal(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-colors text-white"
                    style={{ background: accent }}>
                    <Pencil className="w-3.5 h-3.5" /> Edit Item
                  </button>
                  <button onClick={() => setViewModal(null)}
                    className="flex-1 text-xs font-bold py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ Edit Item Popup ═══════════ */}
      <AnimatePresence>
        {editModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditModal(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: accent }}>
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Edit Item</h3>
                    <p className="text-[10px] text-slate-400">Update details, photos & category</p>
                  </div>
                </div>
                <button onClick={() => setEditModal(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Item Name *</label>
                  <input value={editForm.name} onChange={(e) => setEditForm(s => ({ ...s, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>

                {/* Price + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Price *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">£</span>
                      <input type="number" min={0} step={0.01} value={editForm.price || ""}
                        onChange={(e) => setEditForm(s => ({ ...s, price: Number(e.target.value) }))}
                        className="w-full border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Category</label>
                    <select value={editForm.categoryId} onChange={(e) => setEditForm(s => ({ ...s, categoryId: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white">
                      {categories.map(c => <option key={c.id} value={c.id}>{CATEGORY_EMOJI[c.name] ?? "🍽️"} {c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
                  <textarea value={editForm.description} onChange={(e) => setEditForm(s => ({ ...s, description: e.target.value }))}
                    rows={2} placeholder="Describe this item..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none" />
                </div>

                {/* Photos */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Photos</label>
                    <span className="text-[10px] font-bold text-slate-400">{editForm.images.length}/5</span>
                  </div>
                  {editForm.images.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mb-2">
                      {editForm.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setEditForm(s => ({ ...s, images: s.images.filter((_, i) => i !== idx) }))}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {editForm.images.length < 5 && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setEditDragOver(true); }}
                      onDragLeave={() => setEditDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setEditDragOver(false); handleEditFiles(e.dataTransfer.files); }}
                      onClick={() => editFileRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${editDragOver ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Upload className="w-3.5 h-3.5 text-slate-400" /></div>
                      <div><p className="text-xs font-medium text-slate-500">Drop or <span style={{ color: accent }}>browse</span></p><p className="text-[10px] text-slate-400">{5 - editForm.images.length} more allowed</p></div>
                      <input ref={editFileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleEditFiles(e.target.files)} />
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <button onClick={saveEdit} disabled={savingEdit || !editForm.name.trim() || editForm.price <= 0}
                    className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-bold py-3 rounded-xl transition-all disabled:opacity-40 active:scale-[0.98]"
                    style={{ background: accent }}>
                    {savingEdit ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
                  </button>
                  <button onClick={() => setEditModal(null)}
                    className="px-5 text-sm font-bold py-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Tables ---------- */
function TablesTab({ tables, load, flash }: { tables: Table[]; load: () => void; flash: (m: string) => void }) {
  const [newNum, setNewNum] = useState(tables.length + 1);
  const [qr, setQr] = useState<{ id: string; tableNumber: number; url: string; qr: string } | null>(null);
  const [loadingQr, setLoadingQr] = useState<string | null>(null);

  const add = async () => {
    await api.post("/restaurant/tables", { tableNumber: newNum });
    setNewNum(newNum + 1); load(); flash("Table added");
  };
  const del = async (id: string) => {
    if (!confirm("Remove table?")) return;
    await api.delete(`/restaurant/tables/${id}`);
    if (qr?.id === id) setQr(null); load(); flash("Table removed");
  };
  const getQr = async (t: Table) => {
    setLoadingQr(t.id);
    try {
      const { data } = await api.get(`/restaurant/tables/${t.id}/qr`);
      setQr({ id: t.id, tableNumber: t.tableNumber, ...data });
    } finally { setLoadingQr(null); }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Tables & QR" sub="Manage tables and generate QR codes" />
      <div className="flex gap-2">
        <input type="number" min={1} value={newNum} onChange={(e) => setNewNum(Number(e.target.value))} className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
        <button onClick={add} className="flex items-center gap-1.5 bg-sky-500 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-sky-600 transition-colors">
          <Plus className="w-4 h-4" /> Add Table
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {tables.map((t) => (
          <div key={t.id} className={`bg-white rounded-xl border p-4 text-center transition-shadow shadow-sm ${qr?.id === t.id ? "border-sky-400 shadow-md shadow-sky-100" : "border-slate-200"}`}>
            <div className="text-2xl font-bold text-slate-800 mb-0.5">{t.tableNumber}</div>
            <div className="text-xs text-slate-400 mb-3">Table</div>
            <div className="flex gap-1.5 justify-center flex-wrap">
              <button onClick={() => getQr(t)} disabled={loadingQr === t.id}
                className="flex items-center gap-1 bg-sky-50 text-sky-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-sky-100 transition-colors disabled:opacity-60">
                {loadingQr === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} View QR
              </button>
              {qr?.id === t.id && (
                <a href={qr.qr} download={`table-${t.tableNumber}-qr.png`}
                  className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                  <Download className="w-3 h-3" /> Save
                </a>
              )}
              <button onClick={() => del(t.id)} className="flex items-center gap-1 bg-red-50 text-red-500 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {qr && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Table {qr.tableNumber} QR Code</div>
          <img src={qr.qr} alt="QR Code" className="w-48 mx-auto rounded-lg border border-slate-100 mb-3" />
          <p className="text-xs text-slate-400 break-all mb-3">{qr.url}</p>
          <a href={qr.qr} download={`table-${qr.tableNumber}-qr.png`}
            className="inline-flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download QR
          </a>
        </motion.div>
      )}
    </div>
  );
}

const QUESTION_ORDER: { key: string; label: string }[] = [
  { key: "emotionalState", label: "What best describes you right now?" },
  { key: "dayContext", label: "How has your day been?" },
  { key: "energy", label: "How charged are you?" },
  { key: "occasion", label: "What's the occasion?" },
  { key: "cravings", label: "What sounds good right now?" },
  { key: "dietaryPreference", label: "Dietary preference?" },
];

const SOOTHING_Q_COLORS = ["#7c93c3", "#8bb8a8", "#c4a882", "#a88bc4", "#82b8c4", "#c49b8b"];

/* ---------- Insights ---------- */
function InsightsTab({ insights, highlightInsightId, qStats }: { insights: Insight[]; accent?: string; highlightInsightId: string; qStats: { totalResponses: number; questionStats: Record<string, Record<string, number>> } | null }) {
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("");

  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

  const isGroupExpanded = (dateStr: string): boolean => {
    if (dateStr in groupOverrides) return groupOverrides[dateStr];
    return dateStr === todayStr || dateStr === yesterdayStr;
  };
  const toggleGroup = (dateStr: string) => setGroupOverrides(prev => ({ ...prev, [dateStr]: !isGroupExpanded(dateStr) }));

  const sentimentConfig: Record<string, { icon: typeof CheckCircle2; badgeClass: string; color: string; bgClass: string; borderColor: string }> = {
    positive: { icon: CheckCircle2, badgeClass: "bg-teal-50 text-teal-700 border border-teal-200", color: "#5eaba4", bgClass: "bg-teal-50/30", borderColor: "#99d5cf" },
    negative: { icon: AlertCircle, badgeClass: "bg-rose-50 text-rose-600 border border-rose-200", color: "#d4838a", bgClass: "bg-rose-50/20", borderColor: "#e8b4b8" },
    neutral: { icon: Clock, badgeClass: "bg-amber-50 text-amber-700 border border-amber-200", color: "#c9a96e", bgClass: "bg-amber-50/20", borderColor: "#ddc99b" },
  };

  const filteredInsights = useMemo(() => insights.filter(i => {
    if (sentimentFilter !== "all" && i.sentiment !== sentimentFilter) return false;
    if (tableFilter && !String(i.table.tableNumber).includes(tableFilter.trim())) return false;
    return true;
  }), [insights, sentimentFilter, tableFilter]);

  const groups = useMemo(() => groupInsightsByDate(filteredInsights), [filteredInsights]);

  useEffect(() => {
    if (!highlightInsightId) return;
    for (const group of groups) {
      if (group.items.some(i => i.id === highlightInsightId)) {
        setGroupOverrides(prev => ({ ...prev, [group.dateStr]: true }));
        break;
      }
    }
    const timer = setTimeout(() => {
      document.querySelector(`[data-insight-id="${highlightInsightId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightInsightId]);

  if (!insights.length && (!qStats || qStats.totalResponses === 0)) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
        <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No insights yet</p>
        <p className="text-xs mt-1">They appear after customers complete the questionnaire.</p>
      </div>
    );
  }

  const moodCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const i of insights) { if (i.sentiment in moodCounts) moodCounts[i.sentiment as keyof typeof moodCounts]++; }

  return (
    <div className="space-y-6">
      <SectionHeader title="Insights" sub={`${insights.length} table insights · ${qStats?.totalResponses ?? 0} questionnaire responses`} />

      {/* ── Mood summary mini-cards ── */}
      {insights.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(["positive", "neutral", "negative"] as const).map(s => {
            const conf = sentimentConfig[s];
            const count = moodCounts[s];
            const pct = insights.length ? Math.round((count / insights.length) * 100) : 0;
            return (
              <div key={s} className="rounded-2xl p-3.5 text-center border" style={{ background: `${conf.color}08`, borderColor: conf.borderColor }}>
                <div className="text-2xl font-bold" style={{ color: conf.color }}>{count}</div>
                <div className="text-[10px] font-semibold text-slate-500 mt-0.5">{SENTIMENT_LABEL[s]}</div>
                <div className="text-[9px] text-slate-400">{pct}%</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-0.5">
          {SENTIMENT_FILTER_OPTIONS.map(f => (
            <button key={f.value} onClick={() => setSentimentFilter(f.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${sentimentFilter === f.value ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input value={tableFilter} onChange={e => setTableFilter(e.target.value)} placeholder="Table #"
          className="w-20 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white" />
        {(sentimentFilter !== "all" || tableFilter) && (
          <button onClick={() => { setSentimentFilter("all"); setTableFilter(""); }} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ═══ SECTION 1: Table Insights (Priority) ═══ */}
      {filteredInsights.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          <p>No insights match your filter.</p>
        </div>
      )}

      {groups.map(group => (
        <div key={group.dateStr}>
          <button onClick={() => toggleGroup(group.dateStr)} className="w-full flex items-center justify-between px-1 mb-2.5 group">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700">{group.label}</span>
              <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {group.items.length} insight{group.items.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isGroupExpanded(group.dateStr) ? "bg-slate-200" : "bg-slate-100 group-hover:bg-slate-200"}`}>
              {isGroupExpanded(group.dateStr) ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            </div>
          </button>

          <AnimatePresence>
            {isGroupExpanded(group.dateStr) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pb-2">
                  {group.items.map(insight => {
                    const conf = sentimentConfig[insight.sentiment] ?? sentimentConfig.neutral;
                    const SentimentIcon = conf.icon;
                    const isHighlighted = insight.id === highlightInsightId;
                    const tips = (insight.interactionTips as string[]).slice(0, 3);

                    return (
                      <motion.div key={insight.id} layout data-insight-id={insight.id}
                        className={`rounded-2xl border overflow-hidden ${isHighlighted ? "ring-2 ring-sky-300 shadow-lg" : ""}`}
                        style={{ background: `${conf.color}06`, borderColor: conf.borderColor, boxShadow: isHighlighted ? undefined : `inset 3px 0 0 ${conf.color}` }}
                      >
                        <div className="p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <SentimentIcon className="w-4 h-4 shrink-0" style={{ color: conf.color }} />
                              <span className="font-semibold text-sm text-slate-800 shrink-0">Table {insight.table.tableNumber}</span>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${conf.badgeClass}`}>
                                {SENTIMENT_LABEL[insight.sentiment] ?? insight.sentiment}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-medium text-slate-500 tabular-nums">{relativeTime(insight.createdAt)}</span>
                            </div>
                          </div>
                          <div className="border-t mt-2.5 pt-2.5 space-y-1.5" style={{ borderColor: `${conf.color}25` }}>
                            <div className="text-[9px] text-slate-400 mb-1">
                              {new Date(insight.createdAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </div>
                            {tips.map((tip, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white mt-0.5" style={{ background: conf.color }}>{idx + 1}</span>
                                <span className="text-xs text-slate-700 leading-relaxed">{tip}</span>
                              </div>
                            ))}
                            {insight.serviceApproach && (
                              <p className="text-[10px] text-slate-400 italic pt-1.5 mt-1.5" style={{ borderTop: `1px solid ${conf.color}15` }}>
                                💡 {insight.serviceApproach}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* ═══ SECTION 2: Overall Analysis (Questionnaire Stats) ═══ */}
      {qStats && qStats.totalResponses > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <h3 className="text-sm font-bold text-slate-700 shrink-0">Overall Analysis</h3>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400 font-medium shrink-0">{qStats.totalResponses} responses</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {QUESTION_ORDER.map(({ key, label }, idx) => {
              const answers = qStats.questionStats[key];
              if (!answers) return null;
              const total = Object.values(answers).reduce((s, v) => s + v, 0);
              const sorted = Object.entries(answers).sort((a, b) => b[1] - a[1]);
              const barColor = SOOTHING_Q_COLORS[idx % SOOTHING_Q_COLORS.length];
              return (
                <div key={key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: `${barColor}08` }}>
                    <span className="text-xs font-semibold text-slate-700">
                      <span className="text-[10px] font-bold mr-1.5" style={{ color: barColor }}>Q{idx + 1}</span>{label}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${barColor}15`, color: barColor }}>{total}</span>
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
                    {sorted.map(([answer, count]) => {
                      const pct = total ? (count / total) * 100 : 0;
                      return (
                        <div key={answer} className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 w-24 truncate text-right capitalize">{answer.replace(/-/g, " ")}</span>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                              className="h-full rounded-full" style={{ background: barColor }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 w-6 text-right">{count}</span>
                          <span className="text-[9px] text-slate-400 w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Orders ---------- */
function OrdersTab({ orders, load, flash, accent }: { orders: OrderData[]; load: () => void; flash: (m: string) => void; accent: string }) {
  const STATUSES = ["PENDING", "PREPARING", "SERVED", "COMPLETED"];
  const statusColors: Record<string, string> = { PENDING: "bg-amber-100 text-amber-700", PREPARING: "bg-blue-100 text-blue-700", SERVED: "bg-purple-100 text-purple-700", COMPLETED: "bg-emerald-100 text-emerald-700" };
  const update = async (id: string, status: string) => { await api.put(`/restaurant/orders/${id}/status`, { status }); load(); flash(`Order → ${status}`); };

  if (!orders.length) return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 shadow-sm">
      <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No orders yet.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionHeader title="Orders" sub={`${orders.length} orders total`} />
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Table {o.table.tableNumber}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColors[o.status] ?? "bg-slate-100"}`}>{o.status}</span>
            </div>
            <span className="font-bold text-sm" style={{ color: accent }}>£{o.totalAmount.toFixed(2)}</span>
          </div>
          <div className="px-4 py-2.5 space-y-1.5">
            {o.items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-700">{it.menuItem.name} <span className="text-slate-400">×{it.quantity}</span></span>
                <span className="text-slate-400">£{(it.menuItem.price * it.quantity).toFixed(2)}</span>
              </div>
            ))}
            {o.notes && <div className="text-xs text-slate-400 italic pt-1">Note: {o.notes}</div>}
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">{new Date(o.createdAt).toLocaleString()}</span>
            <div className="relative group">
              <button className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg px-2.5 py-1.5 hover:bg-slate-200">Status <ChevronDown className="w-3 h-3" /></button>
              <div className="absolute right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden hidden group-hover:block z-10">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => update(o.id, s)} className={`block w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 transition-colors ${o.status === s ? "text-sky-600" : "text-slate-600"}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Feedback ---------- */
function FeedbackTab({ feedbacks, avgRating }: { feedbacks: FeedbackData[]; avgRating: number }) {
  if (!feedbacks.length) return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 shadow-sm">
      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No feedback yet.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionHeader title="Feedback" sub={`${feedbacks.length} responses`} />
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
        <div className="text-3xl font-bold text-slate-800">{avgRating.toFixed(1)}</div>
        <div>
          <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className="w-4 h-4" fill={n <= Math.round(avgRating) ? "#f59e0b" : "none"} stroke={n <= Math.round(avgRating) ? "#f59e0b" : "#cbd5e1"} />)}</div>
          <div className="text-xs text-slate-400 mt-0.5">{feedbacks.length} ratings</div>
        </div>
        <div className="ml-auto flex items-center gap-1 text-emerald-600 text-sm font-medium">
          <TrendingUp className="w-4 h-4" /> {avgRating >= 4 ? "Excellent" : avgRating >= 3 ? "Good" : "Needs improvement"}
        </div>
      </div>
      {feedbacks.map((f) => (
        <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className="w-3.5 h-3.5" fill={n <= f.rating ? "#f59e0b" : "none"} stroke={n <= f.rating ? "#f59e0b" : "#cbd5e1"} />)}</div>
            <span className="text-[10px] text-slate-400">{new Date(f.createdAt).toLocaleString()}</span>
          </div>
          {f.comment && <p className="text-sm text-slate-600">{f.comment}</p>}
        </div>
      ))}
    </div>
  );
}
