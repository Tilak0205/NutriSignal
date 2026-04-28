import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ShoppingBag, Table2, UtensilsCrossed, Pencil,
  MessageSquare, Users, Star, Save, Loader2, ChevronDown,
} from "lucide-react";
import { api } from "../lib/api";

type User = { id: string; email: string; name: string; role: string };
type SubPlan = { id: string; name: string; price: number; maxTables: number };
type RestaurantData = {
  id: string; name: string; phone?: string; address?: string; description?: string;
  isActive: boolean; brandPrimaryColor: string; subscriptionPlan?: SubPlan | null;
  users?: User[];
};
type Stats = { orders: number; tables: number; menuItems: number; feedbacks: number; sessions: number; avgRating: number };
type MoodDist = { sentiment: string; _count: number }[];
type OrderData = { id: string; status: string; totalAmount: number; createdAt: string; items: { quantity: number; menuItem: { name: string; price: number } }[] };
type FeedbackData = { id: string; rating: number; comment?: string; createdAt: string };
type QStats = { totalResponses: number; questionStats: Record<string, Record<string, number>> };

const QUESTION_LABELS: Record<string, string> = {
  emotionalState: "Emotional State",
  dayContext: "Day Context",
  energy: "Energy Level",
  occasion: "Occasion",
  cravings: "Cravings",
  dietaryPreference: "Dietary Preference",
};

const moodColors: Record<string, string> = { positive: "#22c55e", neutral: "#f59e0b", negative: "#ef4444" };
const moodLabels: Record<string, string> = { positive: "Good Vibes", neutral: "Mellow", negative: "Needs Care" };
const statusColors: Record<string, string> = { PENDING: "bg-amber-100 text-amber-700", PREPARING: "bg-blue-100 text-blue-700", SERVED: "bg-emerald-100 text-emerald-700", COMPLETED: "bg-slate-100 text-slate-600" };

function HBar({ data, accent }: { data: Record<string, number>; accent: string }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-1.5">
      {sorted.map(([label, count]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-24 truncate text-right capitalize">{label.replace(/-/g, " ")}</span>
          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(count / total) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full rounded-full" style={{ background: accent }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-600 w-8">{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminRestaurantDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [moodDist, setMoodDist] = useState<MoodDist>([]);
  const [recentOrders, setRecentOrders] = useState<OrderData[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [qStats, setQStats] = useState<QStats | null>(null);
  const [allPlans, setAllPlans] = useState<SubPlan[]>([]);

  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "", description: "", subscriptionPlanId: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const load = async () => {
    const [detail, plans] = await Promise.all([
      api.get(`/admin/restaurants/${id}/analytics`),
      api.get("/admin/subscriptions"),
    ]);
    const d = detail.data;
    setRestaurant(d.restaurant);
    setStats(d.stats);
    setMoodDist(d.moodDistribution);
    setRecentOrders(d.recentOrders);
    setFeedbacks(d.feedbackList);
    setQStats(d.questionnaireStats);
    setAllPlans(plans.data);
    setEditForm({
      name: d.restaurant.name ?? "",
      phone: d.restaurant.phone ?? "",
      address: d.restaurant.address ?? "",
      description: d.restaurant.description ?? "",
      subscriptionPlanId: d.restaurant.subscriptionPlan?.id ?? "",
    });
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/restaurants/${id}`, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        address: editForm.address.trim() || null,
        description: editForm.description.trim() || null,
        subscriptionPlanId: editForm.subscriptionPlanId || null,
      });
      load(); flash("Restaurant updated"); setEditing(false);
    } finally { setSaving(false); }
  };

  const accent = restaurant?.brandPrimaryColor ?? "#0ea5e9";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
        <span className="text-sm text-slate-400">Loading restaurant details...</span>
      </div>
    );
  }

  if (!restaurant) return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-400">Restaurant not found</div>;

  const statCards = [
    { label: "Orders", value: stats?.orders ?? 0, icon: ShoppingBag, color: "from-sky-500 to-blue-600" },
    { label: "Tables", value: stats?.tables ?? 0, icon: Table2, color: "from-amber-500 to-orange-600" },
    { label: "Menu Items", value: stats?.menuItems ?? 0, icon: UtensilsCrossed, color: "from-pink-500 to-rose-600" },
    { label: "Sessions", value: stats?.sessions ?? 0, icon: Users, color: "from-purple-500 to-violet-600" },
    { label: "Feedbacks", value: stats?.feedbacks ?? 0, icon: MessageSquare, color: "from-teal-500 to-cyan-600" },
    { label: "Avg Rating", value: stats?.avgRating ? stats.avgRating.toFixed(1) : "—", icon: Star, color: "from-yellow-500 to-amber-600" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <button onClick={() => nav("/super-admin")} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ background: accent }}>
            {restaurant.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800 truncate">{restaurant.name}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap mt-0.5">
              <span className={`font-bold uppercase ${restaurant.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                {restaurant.isActive ? "Active" : "Inactive"}
              </span>
              {restaurant.users?.[0] && <span>· {restaurant.users[0].email}</span>}
              {restaurant.subscriptionPlan && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-600">{restaurant.subscriptionPlan.name}</span>}
              {restaurant.phone && <span>· {restaurant.phone}</span>}
              {restaurant.address && <span>· {restaurant.address}</span>}
            </div>
          </div>
          <button onClick={() => { const next = !editing; setEditing(next); if (!next) { searchParams.delete("edit"); setSearchParams(searchParams, { replace: true }); } }}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
            style={editing ? { background: "#1e293b", color: "white" } : { background: "#f1f5f9", color: "#475569" }}>
            <Pencil className="w-3 h-3" /> {editing ? "Cancel" : "Edit Details"}
          </button>
        </div>
      </div>

      {/* Edit form */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Edit Restaurant Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Name *</label>
                  <input value={editForm.name} onChange={(e) => setEditForm(s => ({ ...s, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Phone</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm(s => ({ ...s, phone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Address</label>
                  <input value={editForm.address} onChange={(e) => setEditForm(s => ({ ...s, address: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Subscription Plan</label>
                  <select value={editForm.subscriptionPlanId} onChange={(e) => setEditForm(s => ({ ...s, subscriptionPlanId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white">
                    <option value="">No plan</option>
                    {allPlans.map(p => <option key={p.id} value={p.id}>{p.name} — £{p.price}/mo ({p.maxTables} tables)</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm(s => ({ ...s, description: e.target.value }))} rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none" />
              </div>
              <button onClick={saveEdit} disabled={saving || !editForm.name.trim()}
                className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-40"
                style={{ background: accent }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className={`absolute -top-4 -right-4 w-14 h-14 rounded-full bg-gradient-to-br ${s.color} opacity-10`} />
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${s.color} mb-2`}><Icon className="w-4 h-4" /></div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mood distribution */}
        {moodDist.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Mood Distribution</h3>
            <div className="flex items-end gap-4 justify-center h-[100px]">
              {moodDist.map(d => {
                const max = Math.max(...moodDist.map(m => m._count), 1);
                return (
                  <div key={d.sentiment} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500">{d._count}</span>
                    <motion.div initial={{ height: 0 }} animate={{ height: (d._count / max) * 70 }}
                      transition={{ duration: 0.6 }} className="w-10 rounded-t-md"
                      style={{ background: moodColors[d.sentiment] ?? "#94a3b8" }} />
                    <span className="text-[9px] text-slate-400 font-medium">{moodLabels[d.sentiment] ?? d.sentiment}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rating distribution */}
        {feedbacks.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Rating Distribution</h3>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map(r => {
                const count = feedbacks.filter(f => f.rating === r).length;
                const pct = feedbacks.length ? (count / feedbacks.length) * 100 : 0;
                return (
                  <div key={r} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-4 text-right">{r}★</span>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }} className="h-full rounded-full bg-amber-400" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 w-6">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Questionnaire stats */}
      {qStats && qStats.totalResponses > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Questionnaire Responses</h3>
          <p className="text-xs text-slate-400 mb-4">{qStats.totalResponses} total responses</p>
          <div className="space-y-2">
            {Object.entries(qStats.questionStats).map(([key, answers]) => (
              <div key={key} className="border border-slate-100 rounded-xl overflow-hidden">
                <button onClick={() => setExpandedQ(expandedQ === key ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-medium text-slate-700">{QUESTION_LABELS[key] ?? key}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">{Object.values(answers).reduce((s, v) => s + v, 0)} answers</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedQ === key ? "rotate-180" : ""}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {expandedQ === key && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3">
                        <HBar data={answers} accent={accent} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Recent Orders</h3>
          <div className="space-y-2">
            {recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColors[o.status] ?? "bg-slate-100"}`}>{o.status}</span>
                    <span className="text-[10px] text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {o.items.map(it => `${it.quantity}× ${it.menuItem.name}`).join(", ")}
                  </div>
                </div>
                <span className="font-bold text-sm" style={{ color: accent }}>£{o.totalAmount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-6 right-4 bg-slate-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50"
          >{toast}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
