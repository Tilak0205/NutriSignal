import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ShoppingBag, Users, Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { api } from "../lib/api";

type Restaurant = { id: string; name: string; isActive: boolean };
type SubPlan = { id: string; name: string; price: number; maxTables: number };
type Analytics = { restaurants: number; orders: number; activeSessions: number };

export default function SuperAdmin() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [subs, setSubs] = useState<SubPlan[]>([]);

  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [newSub, setNewSub] = useState({ name: "", price: 0, maxTables: 20 });
  const [subError, setSubError] = useState("");
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editSub, setEditSub] = useState({ name: "", price: 0, maxTables: 20 });
  const [toast, setToast] = useState("");

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const load = async () => {
    const [a, r, s] = await Promise.all([api.get("/admin/analytics"), api.get("/admin/restaurants"), api.get("/admin/subscriptions")]);
    setAnalytics(a.data); setRestaurants(r.data); setSubs(s.data);
  };
  useEffect(() => { load(); }, []);

  const addRestaurant = async () => {
    const t = newName.trim();
    if (!t) { setNameError("Name is required"); return; }
    setNameError(""); await api.post("/admin/restaurants", { name: t }); setNewName(""); load(); flash("Restaurant added");
  };
  const saveEdit = async (id: string) => { if (!editName.trim()) return; await api.put(`/admin/restaurants/${id}`, { name: editName.trim() }); setEditId(null); load(); flash("Updated"); };
  const toggleActive = async (id: string, isActive: boolean) => { await api.put(`/admin/restaurants/${id}`, { isActive: !isActive }); load(); flash(isActive ? "Deactivated" : "Activated"); };
  const deleteRestaurant = async (id: string, name: string) => { if (!confirm(`Delete "${name}"?`)) return; await api.delete(`/admin/restaurants/${id}`); load(); flash("Deleted"); };

  const addSub = async () => {
    if (!newSub.name.trim()) { setSubError("Name required"); return; }
    setSubError(""); await api.post("/admin/subscriptions", { ...newSub, name: newSub.name.trim(), features: { aiInsights: true }, isActive: true });
    setNewSub({ name: "", price: 0, maxTables: 20 }); load(); flash("Plan added");
  };
  const saveSubEdit = async (id: string) => { if (!editSub.name.trim()) return; await api.put(`/admin/subscriptions/${id}`, { name: editSub.name.trim(), price: editSub.price, maxTables: editSub.maxTables }); setEditSubId(null); load(); flash("Plan updated"); };

  const stats = [
    { label: "Restaurants", value: analytics?.restaurants ?? "—", icon: Building2, gradient: "from-sky-500 to-blue-600" },
    { label: "Total Orders", value: analytics?.orders ?? "—", icon: ShoppingBag, gradient: "from-emerald-500 to-green-600" },
    { label: "Active Sessions", value: analytics?.activeSessions ?? "—", icon: Users, gradient: "from-purple-500 to-violet-600" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div><h2 className="text-lg font-bold text-slate-800">Super Admin</h2><p className="text-sm text-slate-400">Platform management and analytics</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="relative overflow-hidden bg-white rounded-xl border border-slate-200 p-4">
              <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${s.gradient} opacity-10`} />
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br ${s.gradient} mb-2`}><Icon className="w-4 h-4" /></div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Restaurants */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Restaurants</h3>
          <div className="flex gap-2 mt-3">
            <input value={newName} onChange={(e) => { setNewName(e.target.value); setNameError(""); }} onKeyDown={(e) => e.key === "Enter" && addRestaurant()} placeholder="Restaurant name" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
            <button onClick={addRestaurant} className="flex items-center gap-1.5 bg-sky-500 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-sky-600 transition-colors"><Plus className="w-4 h-4" />Add</button>
          </div>
          {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
        </div>
        <div className="divide-y divide-slate-100">
          {restaurants.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${r.isActive ? "bg-emerald-500" : "bg-slate-300"}`}>
                {(r.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {editId === r.id ? (
                  <div className="flex gap-1.5">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus className="flex-1 border border-sky-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" onKeyDown={(e) => e.key === "Enter" && saveEdit(r.id)} />
                    <button onClick={() => saveEdit(r.id)} className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium text-slate-800 truncate">{r.name || "Unnamed"}</div>
                    <span className={`text-[10px] font-bold uppercase ${r.isActive ? "text-emerald-600" : "text-slate-400"}`}>{r.isActive ? "Active" : "Inactive"}</span>
                  </>
                )}
              </div>
              {editId !== r.id && (
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditId(r.id); setEditName(r.name); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleActive(r.id, r.isActive)} className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${r.isActive ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
                    {r.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => deleteRestaurant(r.id, r.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
          {!restaurants.length && <div className="px-4 py-8 text-center text-sm text-slate-400">No restaurants yet</div>}
        </div>
      </div>

      {/* Subscriptions */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Subscription Plans</h3>
          <div className="flex gap-2 mt-3 flex-wrap">
            <input value={newSub.name} onChange={(e) => { setNewSub((s) => ({ ...s, name: e.target.value })); setSubError(""); }} placeholder="Plan name" className="flex-1 min-w-[140px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
            <input type="number" value={newSub.price || ""} onChange={(e) => setNewSub((s) => ({ ...s, price: Number(e.target.value) }))} placeholder="£ Price" className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
            <input type="number" value={newSub.maxTables} onChange={(e) => setNewSub((s) => ({ ...s, maxTables: Number(e.target.value) }))} placeholder="Max tables" className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
            <button onClick={addSub} className="flex items-center gap-1.5 bg-sky-500 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-sky-600"><Plus className="w-4 h-4" />Add</button>
          </div>
          {subError && <p className="text-red-500 text-xs mt-1">{subError}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4">
          {subs.map((s) => (
            <div key={s.id} className="border border-slate-200 rounded-xl p-4">
              {editSubId === s.id ? (
                <div className="space-y-2">
                  <input value={editSub.name} onChange={(e) => setEditSub((p) => ({ ...p, name: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  <div className="flex gap-2">
                    <input type="number" value={editSub.price} onChange={(e) => setEditSub((p) => ({ ...p, price: Number(e.target.value) }))} className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                    <input type="number" value={editSub.maxTables} onChange={(e) => setEditSub((p) => ({ ...p, maxTables: Number(e.target.value) }))} className="w-16 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => saveSubEdit(s.id)} className="flex-1 bg-sky-500 text-white text-xs font-medium py-1.5 rounded-lg">Save</button>
                    <button onClick={() => setEditSubId(null)} className="flex-1 bg-slate-100 text-slate-500 text-xs font-medium py-1.5 rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="font-semibold text-slate-800">{s.name}</div>
                  <div className="text-2xl font-bold text-sky-600 my-1">£{s.price}<span className="text-xs text-slate-400 font-normal">/mo</span></div>
                  <div className="text-xs text-slate-400 mb-3">Up to {s.maxTables} tables</div>
                  <button onClick={() => { setEditSubId(s.id); setEditSub({ name: s.name, price: s.price, maxTables: s.maxTables }); }} className="w-full text-xs font-medium text-slate-500 bg-slate-50 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">Edit Plan</button>
                </>
              )}
            </div>
          ))}
          {!subs.length && <div className="col-span-full text-center py-6 text-sm text-slate-400">No plans yet</div>}
        </div>
      </div>

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
