import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, UtensilsCrossed, QrCode, Brain, ClipboardList,
  MessageSquare, Plus, Trash2, Eye, EyeOff, Download, ChevronDown, ChevronUp,
  TrendingUp, ShoppingBag as BagIcon, Star, X, Upload, CheckCircle2,
  AlertCircle, Clock, ArrowRight, Image as ImageIcon, Loader2,
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
  const [toast, setToast] = useState("");

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const load = async () => {
    const [p, c, t, m, o, f] = await Promise.all([
      api.get("/restaurant/profile"), api.get("/restaurant/menu/categories"), api.get("/restaurant/tables"),
      api.get("/restaurant/mood-insights"), api.get("/restaurant/orders"), api.get("/restaurant/feedbacks"),
    ]);
    setProfile({ name: p.data?.name ?? "", brandPrimaryColor: p.data?.brandPrimaryColor ?? "#0ea5e9", brandSecondaryColor: p.data?.brandSecondaryColor ?? "#22c55e", description: p.data?.description ?? "", address: p.data?.address ?? "", phone: p.data?.phone ?? "" });
    setCategories(c.data); setTables(t.data); setInsights(m.data); setOrders(o.data); setFeedbacks(f.data);
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
              {tab === "menu" && <MenuTab categories={categories} load={load} flash={flash} />}
              {tab === "tables" && <TablesTab tables={tables} load={load} flash={flash} />}
              {tab === "insights" && <InsightsTab insights={insights} accent={accent} highlightInsightId={highlightInsightId} />}
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

  const save = async () => {
    setSaving(true);
    try { await api.put("/restaurant/profile", profile); load(); flash("Profile saved"); setEditing(false); }
    finally { setSaving(false); }
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
    </div>
  );
}

/* ---------- Menu ---------- */
function MenuTab({ categories, load, flash }: { categories: Category[]; load: () => void; flash: (m: string) => void }) {
  const [newCat, setNewCat] = useState("");
  const [newItem, setNewItem] = useState<{ name: string; price: number; description: string; categoryId: string; images: string[] }>({ name: "", price: 0, description: "", categoryId: "", images: [] });
  const [showAddItem, setShowAddItem] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
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

  const delItem = async (id: string) => { await api.delete(`/restaurant/menu/items/${id}`); load(); flash("Item removed"); };
  const toggleItem = async (id: string, current: boolean) => { await api.put(`/restaurant/menu/items/${id}`, { isAvailable: !current }); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 flex-1">
          <h2 className="text-lg font-bold text-slate-800 shrink-0">Menu</h2>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <button onClick={() => setShowAddItem(!showAddItem)} className="ml-3 flex items-center gap-1.5 bg-sky-500 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-sky-600 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <AnimatePresence>
        {showAddItem && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-xl border border-slate-200 p-4 grid gap-3 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <input value={newItem.name} onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))} placeholder="Item name" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                <input type="number" min={0} step={0.01} value={newItem.price || ""} onChange={(e) => setNewItem((s) => ({ ...s, price: Number(e.target.value) }))} placeholder="Price" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
              </div>
              <input value={newItem.description} onChange={(e) => setNewItem((s) => ({ ...s, description: e.target.value }))} placeholder="Description (optional)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
              <select value={newItem.categoryId} onChange={(e) => setNewItem((s) => ({ ...s, categoryId: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200">
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {/* Image upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Photos <span className="text-slate-300">(optional, up to 5)</span>
                  </span>
                  <span className={`text-xs font-semibold ${newItem.images.length >= 5 ? "text-amber-500" : "text-slate-400"}`}>{newItem.images.length}/5</span>
                </div>
                {newItem.images.length < 5 && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-all ${dragOver ? "border-sky-400 bg-sky-50 scale-[1.01]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs text-slate-400">Drop images here or <span className="text-sky-500 font-medium">browse</span></span>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  </div>
                )}
                {newItem.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {newItem.images.map((img, idx) => (
                      <div key={idx} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setNewItem(s => ({ ...s, images: s.images.filter((_, i) => i !== idx) })); }}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={addItem} disabled={savingItem} className="bg-sky-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
                {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Item"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add category */}
      <div className="flex gap-2">
        <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white">
          <option value="">Select a category to add...</option>
          {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <button onClick={addCat} disabled={!newCat || savingCat} className="bg-slate-100 text-slate-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1.5 min-w-[130px] justify-center">
          {savingCat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add Category"}
        </button>
      </div>

      {availableCategories.length === 0 && <p className="text-xs text-slate-400 text-center py-1">All categories have been added.</p>}

      {categories.map((cat) => (
        <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-700">{cat.name}</h3>
              <span className="text-xs text-slate-400">{cat.items.length} items</span>
            </div>
            <button onClick={() => delCat(cat.id, cat.name)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          {cat.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0">
              {item.images?.[0] ? (
                <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-slate-100">
                  <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                  {item.images.length > 1 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold">+{item.images.length - 1}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-slate-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${item.isAvailable ? "text-slate-800" : "text-slate-400 line-through"}`}>{item.name}</div>
                <div className="text-xs text-slate-400">${item.price.toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggleItem(item.id, item.isAvailable)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  {item.isAvailable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => delItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {cat.items.length === 0 && <div className="px-4 py-4 text-sm text-slate-400 text-center">No items yet</div>}
        </div>
      ))}
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

/* ---------- Insights ---------- */
function InsightsTab({ insights, accent, highlightInsightId }: { insights: Insight[]; accent: string; highlightInsightId: string }) {
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("");

  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

  const isGroupExpanded = (dateStr: string): boolean => {
    if (dateStr in groupOverrides) return groupOverrides[dateStr];
    return dateStr === todayStr || dateStr === yesterdayStr;
  };
  const toggleGroup = (dateStr: string) => setGroupOverrides(prev => ({ ...prev, [dateStr]: !isGroupExpanded(dateStr) }));

  const sentimentConfig: Record<string, { icon: typeof CheckCircle2; badgeClass: string; glowColor: string; bgClass: string; iconColor: string }> = {
    positive: { icon: CheckCircle2, badgeClass: "bg-emerald-100 text-emerald-700", glowColor: "#10b981", bgClass: "bg-emerald-50/20", iconColor: "#10b981" },
    negative: { icon: AlertCircle, badgeClass: "bg-red-100 text-red-700", glowColor: "#ef4444", bgClass: "bg-red-50/20", iconColor: "#ef4444" },
    neutral: { icon: Clock, badgeClass: "bg-amber-100 text-amber-700", glowColor: "#f59e0b", bgClass: "bg-amber-50/20", iconColor: "#f59e0b" },
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
        setExpandedCards(prev => ({ ...prev, [highlightInsightId]: true }));
        break;
      }
    }
    const timer = setTimeout(() => {
      document.querySelector(`[data-insight-id="${highlightInsightId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightInsightId]);

  if (!insights.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 shadow-sm">
        <Brain className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p>No insights yet. They appear after customers complete the questionnaire.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Mood Insights" sub={`AI-powered customer analysis — ${insights.length} total`} />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 gap-0.5 shadow-sm">
          {SENTIMENT_FILTER_OPTIONS.map(f => (
            <button key={f.value} onClick={() => setSentimentFilter(f.value)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${sentimentFilter === f.value ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input value={tableFilter} onChange={e => setTableFilter(e.target.value)} placeholder="Table #"
          className="w-20 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white shadow-sm" />
        {(sentimentFilter !== "all" || tableFilter) && (
          <button onClick={() => { setSentimentFilter("all"); setTableFilter(""); }} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {filteredInsights.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 shadow-sm">
          <p>No insights match your filter.</p>
        </div>
      )}

      {/* Date groups */}
      {groups.map(group => (
        <div key={group.dateStr}>
          <button onClick={() => toggleGroup(group.dateStr)} className="w-full flex items-center justify-between px-1 mb-2 group">
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
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-2">
                {group.items.map(insight => {
                  const conf = sentimentConfig[insight.sentiment] ?? sentimentConfig.neutral;
                  const SentimentIcon = conf.icon;
                  const isExpanded = !!expandedCards[insight.id];
                  const isHighlighted = insight.id === highlightInsightId;
                  const tips = (insight.interactionTips as string[]).slice(0, 3);

                  return (
                    <motion.div key={insight.id} layout data-insight-id={insight.id}
                      className={`rounded-xl border border-slate-200 overflow-hidden ${conf.bgClass} ${isHighlighted ? "ring-2 ring-sky-400 shadow-lg shadow-sky-100" : "shadow-sm"}`}
                      style={{ boxShadow: isHighlighted ? undefined : `inset 3px 0 0 ${conf.glowColor}, 0 1px 3px 0 rgba(0,0,0,0.05)` }}
                    >
                      <button onClick={() => setExpandedCards(prev => ({ ...prev, [insight.id]: !isExpanded }))} className="w-full text-left p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <SentimentIcon className="w-4 h-4 shrink-0" style={{ color: conf.iconColor }} />
                            <span className="font-semibold text-sm text-slate-800 shrink-0">Table {insight.table.tableNumber}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${conf.badgeClass}`}>
                              {SENTIMENT_LABEL[insight.sentiment] ?? insight.sentiment}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold text-slate-600 tabular-nums">{relativeTime(insight.createdAt)}</div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(insight.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-slate-500 mt-2 truncate">{tips[0] ?? insight.serviceApproach}</p>
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.16 }} className="overflow-hidden px-3.5 pb-3.5 space-y-2.5">
                            <p className="text-xs text-slate-500 italic border-t border-slate-200/60 pt-2.5">{insight.serviceApproach}</p>
                            <div className="space-y-1">
                              {tips.map((tip, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="font-bold mt-0.5 shrink-0" style={{ color: accent }}>→</span>
                                  <span className="text-slate-600 text-xs">{tip}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
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
            <span className="font-bold text-sm" style={{ color: accent }}>${o.totalAmount.toFixed(2)}</span>
          </div>
          <div className="px-4 py-2.5 space-y-1.5">
            {o.items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-700">{it.menuItem.name} <span className="text-slate-400">×{it.quantity}</span></span>
                <span className="text-slate-400">${(it.menuItem.price * it.quantity).toFixed(2)}</span>
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
