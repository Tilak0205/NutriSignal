import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, ShoppingBag, Users, Pencil, Trash2, Check, Plus,
  BarChart3, Table2, UtensilsCrossed, MessageSquare, Copy, Eye, EyeOff,
  ArrowRight, ChevronDown, Filter, LayoutDashboard, CreditCard, ClipboardList,
  Loader2, Menu,
} from "lucide-react";
import { api } from "../lib/api";

type Restaurant = {
  id: string; name: string; isActive: boolean; phone?: string; address?: string;
  subscriptionPlan?: SubPlan | null; subscriptionPlanId?: string | null;
  users?: { id: string; email: string; name: string; role: string }[];
  _count?: { tables: number; orders: number; items: number };
};
type SubPlan = { id: string; name: string; price: number; maxTables: number };
type Analytics = {
  restaurants: number; orders: number; activeSessions: number;
  moodDistribution: { sentiment: string; _count: number }[];
  totalTables: number; totalMenuItems: number; totalFeedbacks: number;
};
type QStats = { totalResponses: number; questionStats: Record<string, Record<string, number>> };

type Tab = "overview" | "restaurants" | "plans" | "insights";

const QUESTION_ORDER: { key: string; label: string }[] = [
  { key: "emotionalState", label: "What best describes you right now?" },
  { key: "dayContext", label: "How has your day been?" },
  { key: "energy", label: "How charged are you?" },
  { key: "occasion", label: "What's the occasion?" },
  { key: "cravings", label: "What sounds good right now?" },
  { key: "dietaryPreference", label: "Dietary preference?" },
];

const NAV_ITEMS: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "restaurants", label: "Restaurants", icon: Building2 },
  { key: "plans", label: "Plans", icon: CreditCard },
  { key: "insights", label: "Insights", icon: ClipboardList },
];

function MoodBar({ data, height = 100 }: { data: { sentiment: string; _count: number }[]; height?: number }) {
  const max = Math.max(...data.map(d => d._count), 1);
  const colors: Record<string, string> = { positive: "#22c55e", neutral: "#f59e0b", negative: "#ef4444" };
  const labels: Record<string, string> = { positive: "Good Vibes", neutral: "Mellow", negative: "Needs Care" };
  return (
    <div className="flex items-end gap-4 justify-center" style={{ height }}>
      {data.map(d => (
        <div key={d.sentiment} className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-slate-500">{d._count}</span>
          <motion.div initial={{ height: 0 }} animate={{ height: (d._count / max) * (height - 30) }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-10 rounded-t-lg" style={{ background: colors[d.sentiment] ?? "#94a3b8" }} />
          <span className="text-[9px] text-slate-400 font-medium">{labels[d.sentiment] ?? d.sentiment}</span>
        </div>
      ))}
    </div>
  );
}

function HBar({ data, accent }: { data: Record<string, number>; accent: string }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-1.5">
      {sorted.map(([label, count]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-28 truncate text-right capitalize">{label.replace(/-/g, " ")}</span>
          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(count / total) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full rounded-full" style={{ background: accent }} />
          </div>
          <span className="text-[10px] font-bold text-slate-600 w-8">{count}</span>
          <span className="text-[9px] text-slate-400 w-10">{((count / total) * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdmin() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [subs, setSubs] = useState<SubPlan[]>([]);
  const [qStats, setQStats] = useState<QStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({ name: "", email: "", ownerName: "", phone: "", address: "", subscriptionPlanId: "" });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; tempPassword: string; ownerName: string; restaurantName: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [newSub, setNewSub] = useState({ name: "", price: 0, maxTables: 20 });
  const [subError, setSubError] = useState("");
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editSub, setEditSub] = useState({ name: "", price: 0, maxTables: 20 });
  const [toast, setToast] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const load = async () => {
    const [a, r, s, q] = await Promise.all([
      api.get("/admin/analytics"),
      api.get("/admin/restaurants"),
      api.get("/admin/subscriptions"),
      api.get("/admin/questionnaire-stats"),
    ]);
    setAnalytics(a.data); setRestaurants(r.data); setSubs(s.data); setQStats(q.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const switchTab = (t: Tab) => { setTab(t); setSidebarOpen(false); };

  const addRestaurant = async () => {
    const { name, email, ownerName } = newRestaurant;
    if (!name.trim()) { setAddError("Restaurant name is required"); return; }
    if (!email.trim()) { setAddError("Email is required"); return; }
    if (!ownerName.trim()) { setAddError("Owner name is required"); return; }
    setAddError(""); setAddLoading(true);
    try {
      const payload: Record<string, string> = { name: name.trim(), email: email.trim(), ownerName: ownerName.trim() };
      if (newRestaurant.phone.trim()) payload.phone = newRestaurant.phone.trim();
      if (newRestaurant.address.trim()) payload.address = newRestaurant.address.trim();
      if (newRestaurant.subscriptionPlanId) payload.subscriptionPlanId = newRestaurant.subscriptionPlanId;
      const { data } = await api.post("/admin/restaurants", payload);
      setCreatedCreds({ ...data.credentials, restaurantName: name.trim() });
      setNewRestaurant({ name: "", email: "", ownerName: "", phone: "", address: "", subscriptionPlanId: "" });
      load(); flash("Restaurant created");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddError(msg ?? "Failed to create restaurant");
    } finally { setAddLoading(false); }
  };

  const toggleActive = async (id: string, isActive: boolean) => { await api.put(`/admin/restaurants/${id}`, { isActive: !isActive }); load(); flash(isActive ? "Deactivated" : "Activated"); };
  const deleteRestaurant = async (id: string, name: string) => { if (!confirm(`Delete "${name}"?`)) return; await api.delete(`/admin/restaurants/${id}`); load(); flash("Deleted"); };

  const addSub = async () => {
    if (!newSub.name.trim()) { setSubError("Name required"); return; }
    setSubError(""); await api.post("/admin/subscriptions", { ...newSub, name: newSub.name.trim(), features: { aiInsights: true }, isActive: true });
    setNewSub({ name: "", price: 0, maxTables: 20 }); load(); flash("Plan added");
  };
  const saveSubEdit = async (id: string) => { if (!editSub.name.trim()) return; await api.put(`/admin/subscriptions/${id}`, { name: editSub.name.trim(), price: editSub.price, maxTables: editSub.maxTables }); setEditSubId(null); load(); flash("Plan updated"); };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); flash("Copied to clipboard"); };

  const filteredRestaurants = restaurants
    .filter(r => {
      if (planFilter === "all") return true;
      if (planFilter === "none") return !r.subscriptionPlanId;
      return r.subscriptionPlanId === planFilter;
    })
    .sort((a, b) => (a.subscriptionPlan?.name ?? "zzz").localeCompare(b.subscriptionPlan?.name ?? "zzz"));

  const statCards = [
    { label: "Restaurants", value: analytics?.restaurants ?? "—", icon: Building2, gradient: "from-emerald-500 to-green-600" },
    { label: "Total Orders", value: analytics?.orders ?? "—", icon: ShoppingBag, gradient: "from-green-500 to-emerald-600" },
    { label: "Active Sessions", value: analytics?.activeSessions ?? "—", icon: Users, gradient: "from-lime-500 to-green-600" },
    { label: "Tables", value: analytics?.totalTables ?? "—", icon: Table2, gradient: "from-emerald-400 to-green-500" },
    { label: "Menu Items", value: analytics?.totalMenuItems ?? "—", icon: UtensilsCrossed, gradient: "from-green-400 to-emerald-500" },
    { label: "Feedbacks", value: analytics?.totalFeedbacks ?? "—", icon: MessageSquare, gradient: "from-teal-500 to-emerald-600" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="text-sm text-slate-400">Loading admin dashboard...</span>
      </div>
    );
  }

  /* ─── Sidebar (shared across desktop/mobile) ─── */
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin Panel</div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button key={item.key} onClick={() => switchTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}>
              <Icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
              {item.key === "restaurants" && (
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-slate-200/60 text-slate-500"}`}>
                  {restaurants.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar footer stats */}
      <div className="px-5 pb-5 mt-auto">
        <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
          <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Quick Stats</div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Restaurants</span>
            <span className="font-bold text-slate-700">{analytics?.restaurants ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Orders</span>
            <span className="font-bold text-slate-700">{analytics?.orders ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Sessions</span>
            <span className="font-bold text-slate-700">{analytics?.activeSessions ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 52px)" }}>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-200 shrink-0 sticky top-[52px]" style={{ height: "calc(100vh - 52px)" }}>
        {sidebarContent}
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/30 z-40 md:hidden" />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-[52px] left-0 bottom-0 w-60 bg-white shadow-xl z-50 md:hidden">
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 bg-slate-50">
        {/* Mobile header bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 sticky top-[52px] z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="font-bold text-slate-800 text-sm capitalize">{tab}</h2>
        </div>

        <div className="p-5 md:p-6 max-w-5xl">
          {/* Page title */}
          <div className="mb-5 hidden md:block">
            <h2 className="text-xl font-bold text-slate-800 capitalize">{tab === "overview" ? "Dashboard Overview" : tab === "plans" ? "Subscription Plans" : tab === "insights" ? "Questionnaire & Mood Insights" : "Restaurants"}</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {tab === "overview" && "Platform metrics and quick actions"}
              {tab === "restaurants" && `${restaurants.length} restaurant${restaurants.length !== 1 ? "s" : ""} on the platform`}
              {tab === "plans" && `${subs.length} plan${subs.length !== 1 ? "s" : ""} configured`}
              {tab === "insights" && `${qStats?.totalResponses ?? 0} questionnaire responses`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>

              {/* ══════════ OVERVIEW ══════════ */}
              {tab === "overview" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {statCards.map((s) => {
                      const Icon = s.icon;
                      return (
                        <div key={s.label} className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                          <div className={`absolute -top-4 -right-4 w-14 h-14 rounded-full bg-gradient-to-br ${s.gradient} opacity-10`} />
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${s.gradient} mb-2`}><Icon className="w-4 h-4" /></div>
                          <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {analytics?.moodDistribution && analytics.moodDistribution.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <BarChart3 className="w-4 h-4 text-emerald-600" />
                          <h3 className="font-semibold text-slate-800 text-sm">Mood Distribution</h3>
                          <span className="text-[10px] text-slate-400 ml-auto">All restaurants</span>
                        </div>
                        <MoodBar data={analytics.moodDistribution} height={130} />
                      </div>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-semibold text-slate-800 text-sm">Quick Actions</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { switchTab("restaurants"); setTimeout(() => setShowAddForm(true), 200); }}
                          className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors">
                          <Plus className="w-4 h-4" /> Add Restaurant
                        </button>
                        <button onClick={() => switchTab("plans")}
                          className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors">
                          <CreditCard className="w-4 h-4" /> Manage Plans
                        </button>
                        <button onClick={() => switchTab("restaurants")}
                          className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors">
                          <Building2 className="w-4 h-4" /> All Restaurants
                        </button>
                        <button onClick={() => switchTab("insights")}
                          className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors">
                          <BarChart3 className="w-4 h-4" /> View Insights
                        </button>
                      </div>
                    </div>
                  </div>

                  {restaurants.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-800 text-sm">Recent Restaurants</h3>
                        <button onClick={() => switchTab("restaurants")} className="text-xs text-emerald-600 font-medium hover:text-emerald-700 transition-colors">View all &rarr;</button>
                      </div>
                      <div className="space-y-1">
                        {restaurants.slice(0, 5).map(r => (
                          <button key={r.id} onClick={() => nav(`/super-admin/restaurant/${r.id}`)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${r.isActive ? "bg-emerald-500" : "bg-slate-300"}`}>
                              {(r.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-800 truncate">{r.name}</div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                {r.subscriptionPlan && <span className="font-medium text-emerald-600">{r.subscriptionPlan.name}</span>}
                                {r._count && <span>{r._count.orders} orders · {r._count.tables} tables</span>}
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ RESTAURANTS ══════════ */}
              {tab === "restaurants" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div />
                    <button onClick={() => { setShowAddForm(!showAddForm); setCreatedCreds(null); }}
                      className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
                      <Plus className={`w-3.5 h-3.5 transition-transform ${showAddForm ? "rotate-45" : ""}`} />
                      {showAddForm ? "Close" : "Add Restaurant"}
                    </button>
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <button onClick={() => setPlanFilter("all")}
                      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${planFilter === "all" ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
                      All ({restaurants.length})
                    </button>
                    {subs.map(plan => {
                      const count = restaurants.filter(r => r.subscriptionPlanId === plan.id).length;
                      return (
                        <button key={plan.id} onClick={() => setPlanFilter(planFilter === plan.id ? "all" : plan.id)}
                          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${planFilter === plan.id ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
                          {plan.name} ({count})
                        </button>
                      );
                    })}
                    <button onClick={() => setPlanFilter(planFilter === "none" ? "all" : "none")}
                      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${planFilter === "none" ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
                      No Plan ({restaurants.filter(r => !r.subscriptionPlanId).length})
                    </button>
                  </div>

                  {/* Add form */}
                  <AnimatePresence>
                    {showAddForm && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-white" />
                            <span className="text-white font-semibold text-sm">New Restaurant</span>
                          </div>
                          <div className="p-5 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Restaurant Name *</label>
                                <input value={newRestaurant.name} onChange={(e) => { setNewRestaurant(s => ({ ...s, name: e.target.value })); setAddError(""); }}
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Owner Name *</label>
                                <input value={newRestaurant.ownerName} onChange={(e) => { setNewRestaurant(s => ({ ...s, ownerName: e.target.value })); setAddError(""); }}
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Owner Email *</label>
                                <input value={newRestaurant.email} onChange={(e) => { setNewRestaurant(s => ({ ...s, email: e.target.value })); setAddError(""); }}
                                  type="email" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Phone</label>
                                <input value={newRestaurant.phone} onChange={(e) => setNewRestaurant(s => ({ ...s, phone: e.target.value }))}
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white" />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Address</label>
                              <input value={newRestaurant.address} onChange={(e) => setNewRestaurant(s => ({ ...s, address: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Subscription Plan</label>
                              <select value={newRestaurant.subscriptionPlanId} onChange={(e) => setNewRestaurant(s => ({ ...s, subscriptionPlanId: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white">
                                <option value="">No plan</option>
                                {subs.map(p => <option key={p.id} value={p.id}>{p.name} — £{p.price}/mo ({p.maxTables} tables)</option>)}
                              </select>
                            </div>
                            {addError && <p className="text-red-500 text-xs">{addError}</p>}
                            <button onClick={addRestaurant} disabled={addLoading}
                              className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                              {addLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Restaurant</>}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Credentials card */}
                  <AnimatePresence>
                    {createdCreds && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-bold text-emerald-800">Restaurant Created — Share These Credentials</span>
                          </div>
                          <p className="text-xs text-emerald-600 mb-3">The owner can reset their password from the restaurant dashboard.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="bg-white rounded-xl p-3 border border-emerald-100"><div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Restaurant</div><div className="text-sm font-medium text-slate-800">{createdCreds.restaurantName}</div></div>
                            <div className="bg-white rounded-xl p-3 border border-emerald-100"><div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Owner</div><div className="text-sm font-medium text-slate-800">{createdCreds.ownerName}</div></div>
                            <div className="bg-white rounded-xl p-3 border border-emerald-100"><div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Email (Login)</div><div className="flex items-center gap-2"><span className="text-sm font-mono text-slate-800 truncate">{createdCreds.email}</span><button onClick={() => copyToClipboard(createdCreds.email)} className="p-1 rounded hover:bg-emerald-50"><Copy className="w-3 h-3 text-slate-400" /></button></div></div>
                            <div className="bg-white rounded-xl p-3 border border-emerald-100"><div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Temporary Password</div><div className="flex items-center gap-2"><span className="text-sm font-mono text-slate-800">{showPassword ? createdCreds.tempPassword : "••••••••"}</span><button onClick={() => setShowPassword(!showPassword)} className="p-1 rounded hover:bg-emerald-50">{showPassword ? <EyeOff className="w-3 h-3 text-slate-400" /> : <Eye className="w-3 h-3 text-slate-400" />}</button><button onClick={() => copyToClipboard(createdCreds.tempPassword)} className="p-1 rounded hover:bg-emerald-50"><Copy className="w-3 h-3 text-slate-400" /></button></div></div>
                          </div>
                          <button onClick={() => { setCreatedCreds(null); setShowAddForm(false); }} className="mt-3 text-xs font-medium text-emerald-700 hover:text-emerald-800">Dismiss</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Restaurant list */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {filteredRestaurants.map((r, i) => (
                      <div key={r.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors cursor-pointer ${i > 0 ? "border-t border-slate-100" : ""}`}
                        onClick={() => nav(`/super-admin/restaurant/${r.id}`)}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${r.isActive ? "bg-emerald-500" : "bg-slate-300"}`}>
                          {(r.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{r.name || "Unnamed"}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase ${r.isActive ? "text-emerald-600" : "text-slate-400"}`}>{r.isActive ? "Active" : "Inactive"}</span>
                            {r.users?.[0] && <span className="text-[10px] text-slate-400">· {r.users[0].email}</span>}
                            {r.subscriptionPlan && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">{r.subscriptionPlan.name}</span>}
                            {r._count && <span className="text-[10px] text-slate-400">· {r._count.tables} tables · {r._count.orders} orders · {r._count.items} items</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => nav(`/super-admin/restaurant/${r.id}?edit=true`)} title="Edit Restaurant"
                            className="p-2 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleActive(r.id, r.isActive)}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${r.isActive ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
                            {r.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button onClick={() => deleteRestaurant(r.id, r.name)}
                            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {!filteredRestaurants.length && <div className="px-4 py-10 text-center text-sm text-slate-400">{planFilter === "all" ? "No restaurants yet" : "No restaurants with this plan"}</div>}
                  </div>
                </div>
              )}

              {/* ══════════ PLANS ══════════ */}
              {tab === "plans" && (
                <div className="space-y-4">
                  {/* Add plan form */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Create New Plan</p>
                    <div className="flex gap-3 flex-wrap items-end">
                      <div className="flex-1 min-w-[160px]">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Plan Name</label>
                        <input value={newSub.name} onChange={(e) => { setNewSub((s) => ({ ...s, name: e.target.value })); setSubError(""); }}
                          placeholder="e.g. AI Basic" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white" />
                      </div>
                      <div className="w-28">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">£ Price</label>
                        <input type="number" value={newSub.price || ""} onChange={(e) => setNewSub((s) => ({ ...s, price: Number(e.target.value) }))}
                          placeholder="0" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white" />
                      </div>
                      <div className="w-28">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Tables</label>
                        <input type="number" value={newSub.maxTables} onChange={(e) => setNewSub((s) => ({ ...s, maxTables: Number(e.target.value) }))}
                          placeholder="20" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white" />
                      </div>
                      <button onClick={addSub}
                        className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors">
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>
                    {subError && <p className="text-red-500 text-xs mt-2">{subError}</p>}
                  </div>

                  {/* Plan cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subs.map((s) => {
                      const planCount = restaurants.filter(r => r.subscriptionPlanId === s.id).length;
                      return (
                        <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                          {editSubId === s.id ? (
                            <div className="space-y-2.5">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Name</label>
                                <input value={editSub.name} onChange={(e) => setEditSub((p) => ({ ...p, name: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Price (£)</label>
                                  <input type="number" value={editSub.price} onChange={(e) => setEditSub((p) => ({ ...p, price: Number(e.target.value) }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tables</label>
                                  <input type="number" value={editSub.maxTables} onChange={(e) => setEditSub((p) => ({ ...p, maxTables: Number(e.target.value) }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => saveSubEdit(s.id)} className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2 rounded-xl hover:bg-emerald-700">Save</button>
                                <button onClick={() => setEditSubId(null)} className="flex-1 bg-slate-100 text-slate-500 text-xs font-semibold py-2 rounded-xl hover:bg-slate-200">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-slate-800">{s.name}</h4>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{planCount} restaurant{planCount !== 1 ? "s" : ""}</span>
                              </div>
                              <div className="text-3xl font-extrabold text-emerald-700 my-2">£{s.price}<span className="text-sm text-slate-400 font-normal">/mo</span></div>
                              <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
                                <Table2 className="w-4 h-4 text-slate-400" />
                                <span>{s.maxTables} tables</span>
                              </div>
                              <button onClick={() => { setEditSubId(s.id); setEditSub({ name: s.name, price: s.price, maxTables: s.maxTables }); }}
                                className="w-full text-xs font-semibold text-slate-500 bg-slate-50 py-2.5 rounded-xl hover:bg-slate-100 transition-colors">
                                Edit Plan
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {!subs.length && <div className="col-span-full text-center py-10 text-sm text-slate-400">No plans yet — create one above</div>}
                  </div>
                </div>
              )}

              {/* ══════════ INSIGHTS ══════════ */}
              {tab === "insights" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {analytics?.moodDistribution && analytics.moodDistribution.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <BarChart3 className="w-4 h-4 text-emerald-600" />
                          <h3 className="font-semibold text-slate-800 text-sm">Mood Distribution</h3>
                        </div>
                        <MoodBar data={analytics.moodDistribution} height={140} />
                      </div>
                    )}

                    {qStats && qStats.totalResponses > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-800 text-sm mb-1">Response Summary</h3>
                        <p className="text-xs text-slate-400 mb-4">{qStats.totalResponses} total questionnaire responses</p>
                        <div className="grid grid-cols-3 gap-2">
                          {QUESTION_ORDER.map(({ key, label }) => {
                            const answers = qStats.questionStats[key];
                            if (!answers) return null;
                            const total = Object.values(answers).reduce((s, v) => s + v, 0);
                            const top = Object.entries(answers).sort((a, b) => b[1] - a[1])[0];
                            return (
                              <div key={key} className="text-center p-2.5 rounded-xl bg-slate-50">
                                <div className="text-lg font-bold text-slate-800">{total}</div>
                                <div className="text-[9px] text-slate-400 truncate">{label.split(" ").slice(0, 3).join(" ")}</div>
                                {top && <div className="text-[9px] text-emerald-700 font-medium mt-0.5 truncate capitalize">{top[0].replace(/-/g, " ")}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {qStats && qStats.totalResponses > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <h3 className="font-semibold text-slate-800 text-sm mb-4">Detailed Question Breakdown</h3>
                      <div className="space-y-2">
                        {QUESTION_ORDER.map(({ key, label }, idx) => {
                          const answers = qStats.questionStats[key];
                          if (!answers) return null;
                          return (
                            <div key={key} className="border border-slate-100 rounded-xl overflow-hidden">
                              <button onClick={() => setExpandedQ(expandedQ === key ? null : key)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                                <span className="text-sm font-medium text-slate-700 text-left">
                                  <span className="text-xs text-slate-400 mr-2">Q{idx + 1}.</span>{label}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-slate-400 font-medium">{Object.values(answers).reduce((s, v) => s + v, 0)} responses</span>
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedQ === key ? "rotate-180" : ""}`} />
                                </div>
                              </button>
                              <AnimatePresence>
                                {expandedQ === key && (
                                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4">
                                      <HBar data={answers} accent="#16a34a" />
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-6 right-6 bg-slate-800 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50"
          >{toast}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
