import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, UtensilsCrossed, QrCode, Brain, ClipboardList,
  MessageSquare, Plus, Trash2, Eye, EyeOff, Download, ChevronDown,
  TrendingUp, ShoppingBag as BagIcon, Star,
} from "lucide-react";
import { api } from "../lib/api";

type Category = { id: string; name: string; items: Item[] };
type Item = { id: string; name: string; price: number; description?: string; isAvailable: boolean; categoryId: string };
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
  };

  useEffect(() => { load(); }, []);

  const accent = profile.brandPrimaryColor;
  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length) : 0;
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;

  return (
    <div className="min-h-[calc(100dvh-52px)] flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-slate-200 hidden md:flex flex-col py-4">
        <div className="px-4 mb-4">
          <div className="text-sm font-bold text-slate-800 truncate">{profile.name || "Restaurant"}</div>
          <div className="text-xs text-slate-400">Dashboard</div>
        </div>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.key;
          return (
            <button key={n.key} onClick={() => setTab(n.key)}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${active ? "text-sky-600 bg-sky-50 border-r-2 border-sky-500" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
            >
              <Icon className="w-4 h-4" />{n.label}
              {n.key === "orders" && pendingOrders > 0 && <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendingOrders}</span>}
            </button>
          );
        })}
      </aside>

      {/* Mobile tabs */}
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

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-20 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {tab === "overview" && <OverviewTab accent={accent} orders={orders} insights={insights} totalItems={totalItems} tables={tables} avgRating={avgRating} pendingOrders={pendingOrders} profile={profile} setProfile={setProfile} load={load} flash={flash} />}
            {tab === "menu" && <MenuTab categories={categories} load={load} flash={flash} />}
            {tab === "tables" && <TablesTab tables={tables} load={load} flash={flash} />}
            {tab === "insights" && <InsightsTab insights={insights} accent={accent} />}
            {tab === "orders" && <OrdersTab orders={orders} load={load} flash={flash} accent={accent} />}
            {tab === "feedback" && <FeedbackTab feedbacks={feedbacks} avgRating={avgRating} />}
          </motion.div>
        </AnimatePresence>
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
function OverviewTab({ accent, orders, insights, totalItems, tables, avgRating, pendingOrders, profile, setProfile, load, flash }: {
  accent: string; orders: OrderData[]; insights: Insight[]; totalItems: number; tables: Table[];
  avgRating: number; pendingOrders: number;
  profile: { name: string; brandPrimaryColor: string; brandSecondaryColor: string; description: string; address: string; phone: string };
  setProfile: (fn: (s: typeof profile) => typeof profile) => void; load: () => void; flash: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const save = async () => { await api.put("/restaurant/profile", profile); load(); flash("Profile saved"); setEditing(false); };

  const stats = [
    { label: "Orders", value: orders.length, icon: BagIcon, color: "bg-sky-50 text-sky-600" },
    { label: "Pending", value: pendingOrders, icon: ClipboardList, color: "bg-amber-50 text-amber-600" },
    { label: "Insights", value: insights.length, icon: Brain, color: "bg-purple-50 text-purple-600" },
    { label: "Menu Items", value: totalItems, icon: UtensilsCrossed, color: "bg-emerald-50 text-emerald-600" },
    { label: "Tables", value: tables.length, icon: QrCode, color: "bg-rose-50 text-rose-600" },
    { label: "Avg Rating", value: avgRating ? `${avgRating.toFixed(1)}★` : "—", icon: Star, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Overview</h2>
        <p className="text-sm text-slate-400">Your restaurant at a glance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}><Icon className="w-4 h-4" /></div>
              <div className="text-xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">Restaurant Profile</h3>
          <button onClick={() => editing ? save() : setEditing(true)} className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors" style={editing ? { background: accent, color: "white" } : { background: "#f1f5f9", color: "#475569" }}>
            {editing ? "Save" : "Edit"}
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
  const [newItem, setNewItem] = useState({ name: "", price: 0, description: "", categoryId: "" });
  const [showAddItem, setShowAddItem] = useState(false);

  const addCat = async () => { if (!newCat.trim()) return; await api.post("/restaurant/menu/categories", { name: newCat.trim() }); setNewCat(""); load(); flash("Category added"); };
  const delCat = async (id: string, name: string) => { if (!confirm(`Delete "${name}" and all items?`)) return; await api.delete(`/restaurant/menu/categories/${id}`); load(); flash("Category deleted"); };
  const addItem = async () => {
    if (!newItem.name.trim() || !newItem.categoryId || newItem.price <= 0) return;
    await api.post("/restaurant/menu/items", { name: newItem.name.trim(), price: newItem.price, description: newItem.description, categoryId: newItem.categoryId });
    setNewItem({ name: "", price: 0, description: "", categoryId: "" }); load(); flash("Item added"); setShowAddItem(false);
  };
  const delItem = async (id: string) => { await api.delete(`/restaurant/menu/items/${id}`); load(); flash("Item removed"); };
  const toggleItem = async (id: string, current: boolean) => { await api.put(`/restaurant/menu/items/${id}`, { isAvailable: !current }); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-slate-800">Menu</h2><p className="text-sm text-slate-400">Manage categories and items</p></div>
        <button onClick={() => setShowAddItem(!showAddItem)} className="flex items-center gap-1.5 bg-sky-500 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-sky-600 transition-colors">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <AnimatePresence>
        {showAddItem && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-xl border border-slate-200 p-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={newItem.name} onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))} placeholder="Item name" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                <input type="number" min={0} step={0.01} value={newItem.price || ""} onChange={(e) => setNewItem((s) => ({ ...s, price: Number(e.target.value) }))} placeholder="Price" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
              </div>
              <input value={newItem.description} onChange={(e) => setNewItem((s) => ({ ...s, description: e.target.value }))} placeholder="Description (optional)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
              <div className="flex gap-3">
                <select value={newItem.categoryId} onChange={(e) => setNewItem((s) => ({ ...s, categoryId: e.target.value }))} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200">
                  <option value="">Select category...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={addItem} className="bg-sky-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-sky-600">Save</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add category */}
      <div className="flex gap-2">
        <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" onKeyDown={(e) => e.key === "Enter" && addCat()} />
        <button onClick={addCat} className="bg-slate-100 text-slate-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors">Add Category</button>
      </div>

      {categories.map((cat) => (
        <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-700">{cat.name}</h3>
              <span className="text-xs text-slate-400">{cat.items.length} items</span>
            </div>
            <button onClick={() => delCat(cat.id, cat.name)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          {cat.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0">
              <div>
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
          {cat.items.length === 0 && <div className="px-4 py-4 text-sm text-slate-400 text-center">No items in this category yet</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------- Tables ---------- */
function TablesTab({ tables, load, flash }: { tables: Table[]; load: () => void; flash: (m: string) => void }) {
  const [newNum, setNewNum] = useState(tables.length + 1);
  const [qr, setQr] = useState<{ id: string; url: string; qr: string } | null>(null);

  const add = async () => { await api.post("/restaurant/tables", { tableNumber: newNum }); setNewNum(newNum + 1); load(); flash("Table added"); };
  const del = async (id: string) => { if (!confirm("Remove table?")) return; await api.delete(`/restaurant/tables/${id}`); if (qr?.id === id) setQr(null); load(); flash("Table removed"); };
  const getQr = async (id: string) => { const { data } = await api.get(`/restaurant/tables/${id}/qr`); setQr({ id, ...data }); };

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-slate-800">Tables & QR</h2><p className="text-sm text-slate-400">Manage tables and generate QR codes</p></div>
      <div className="flex gap-2">
        <input type="number" min={1} value={newNum} onChange={(e) => setNewNum(Number(e.target.value))} className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
        <button onClick={add} className="flex items-center gap-1.5 bg-sky-500 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-sky-600"><Plus className="w-4 h-4" /> Add Table</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {tables.map((t) => (
          <div key={t.id} className={`bg-white rounded-xl border p-4 text-center transition-shadow ${qr?.id === t.id ? "border-sky-400 shadow-md shadow-sky-100" : "border-slate-200"}`}>
            <div className="text-2xl font-bold text-slate-800 mb-1">{t.tableNumber}</div>
            <div className="text-xs text-slate-400 mb-3">Table</div>
            <div className="flex gap-1.5 justify-center">
              <button onClick={() => getQr(t.id)} className="flex items-center gap-1 bg-sky-50 text-sky-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-sky-100"><Download className="w-3 h-3" /> QR</button>
              <button onClick={() => del(t.id)} className="flex items-center gap-1 bg-red-50 text-red-500 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-100"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>

      {qr && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <img src={qr.qr} alt="QR Code" className="w-48 mx-auto rounded-lg border border-slate-100 mb-3" />
          <p className="text-xs text-slate-400 break-all mb-2">{qr.url}</p>
          <p className="text-xs text-slate-400">Print and place this on the table</p>
        </motion.div>
      )}
    </div>
  );
}

/* ---------- Insights ---------- */
function InsightsTab({ insights, accent }: { insights: Insight[]; accent: string }) {
  if (!insights.length) return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400"><Brain className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No insights yet. They appear after customers complete the questionnaire.</p></div>;

  const sentimentColors: Record<string, string> = { positive: "border-l-emerald-400 bg-emerald-50/40", negative: "border-l-red-400 bg-red-50/40", neutral: "border-l-amber-400 bg-amber-50/40" };
  const sentimentBadge: Record<string, string> = { positive: "bg-emerald-100 text-emerald-700", negative: "bg-red-100 text-red-700", neutral: "bg-amber-100 text-amber-700" };

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-slate-800">Mood Insights</h2><p className="text-sm text-slate-400">AI-powered analysis of customer moods</p></div>
      {insights.map((i) => (
        <div key={i.id} className={`rounded-xl border-l-4 border border-slate-200 p-4 ${sentimentColors[i.sentiment] ?? ""}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-800">Table {i.table.tableNumber}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${sentimentBadge[i.sentiment] ?? ""}`}>{i.sentiment}</span>
            </div>
            <span className="text-[10px] text-slate-400">{new Date(i.createdAt).toLocaleString()}</span>
          </div>
          <p className="text-sm text-slate-600 mb-3">{i.serviceApproach}</p>
          <div className="space-y-1">
            {(i.interactionTips as string[]).map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <span className="font-bold mt-0.5" style={{ color: accent }}>→</span>
                <span className="text-slate-600">{tip}</span>
              </div>
            ))}
          </div>
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

  if (!orders.length) return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400"><ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No orders yet.</p></div>;

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-slate-800">Orders</h2><p className="text-sm text-slate-400">{orders.length} orders total</p></div>
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
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
  if (!feedbacks.length) return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400"><MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No feedback yet.</p></div>;

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-slate-800">Feedback</h2><p className="text-sm text-slate-400">{feedbacks.length} responses</p></div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
        <div className="text-3xl font-bold text-slate-800">{avgRating.toFixed(1)}</div>
        <div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => <Star key={n} className="w-4 h-4" fill={n <= Math.round(avgRating) ? "#f59e0b" : "none"} stroke={n <= Math.round(avgRating) ? "#f59e0b" : "#cbd5e1"} />)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{feedbacks.length} ratings</div>
        </div>
        <div className="ml-auto flex items-center gap-1 text-emerald-600 text-sm font-medium">
          <TrendingUp className="w-4 h-4" /> {avgRating >= 4 ? "Excellent" : avgRating >= 3 ? "Good" : "Needs improvement"}
        </div>
      </div>

      {feedbacks.map((f) => (
        <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-4">
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
