import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Utensils, ArrowRight, Shield, Loader2 } from "lucide-react";
import { api, setAuthToken } from "../lib/api";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 ${className}`}>{children}</div>;
}

export function Home() {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-sky-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.15 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-200/40"
        >
          <Utensils className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">NutriSignal</h1>
        <p className="text-slate-400 mb-8">Smart restaurant experience powered by AI mood analysis</p>

        <div className="space-y-3">
          <Link to="/login" className="flex items-center justify-between w-full px-5 py-3.5 bg-sky-500 text-white rounded-xl font-semibold text-sm hover:bg-sky-600 transition-colors">
            <span>Sign In</span><ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/register" className="flex items-center justify-between w-full px-5 py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
            <span>Create Account</span><ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/bootstrap-super-admin" className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mt-4 transition-colors">
            <Shield className="w-3 h-3" /> Setup Super Admin
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!email || !password) { setError("All fields required"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuthToken(data.token, data.user.role);
      nav(data.user.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-sky-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center"><Utensils className="w-4 h-4 text-white" /></div>
          <span className="font-bold text-slate-800">NutriSignal</span>
        </Link>
        <Card>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-sm text-slate-400 mb-4">Sign in to your account</p>
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>}
          <form onSubmit={submit} className="space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400" />
            <button disabled={loading} className="w-full py-2.5 rounded-lg bg-sky-500 text-white font-semibold text-sm hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Sign In
            </button>
          </form>
          <div className="text-center mt-4 text-sm text-slate-400">No account? <Link to="/register" className="text-sky-500 font-medium hover:underline">Register</Link></div>
        </Card>
      </motion.div>
    </div>
  );
}

export function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ ownerName: "", email: "", password: "", restaurantName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.email || !form.password || !form.ownerName || !form.restaurantName) { setError("All fields required"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setAuthToken(data.token, data.user.role);
      nav("/dashboard");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-sky-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center"><Utensils className="w-4 h-4 text-white" /></div>
          <span className="font-bold text-slate-800">NutriSignal</span>
        </Link>
        <Card>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Create account</h2>
          <p className="text-sm text-slate-400 mb-4">Start your restaurant journey</p>
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>}
          <form onSubmit={submit} className="space-y-3">
            <input value={form.ownerName} onChange={(e) => setForm((s) => ({ ...s, ownerName: e.target.value }))} placeholder="Your name" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400" />
            <input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="Email" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400" />
            <input type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} placeholder="Password" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400" />
            <input value={form.restaurantName} onChange={(e) => setForm((s) => ({ ...s, restaurantName: e.target.value }))} placeholder="Restaurant name" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400" />
            <button disabled={loading} className="w-full py-2.5 rounded-lg bg-sky-500 text-white font-semibold text-sm hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Create Account
            </button>
          </form>
          <div className="text-center mt-4 text-sm text-slate-400">Already registered? <Link to="/login" className="text-sky-500 font-medium hover:underline">Sign in</Link></div>
        </Card>
      </motion.div>
    </div>
  );
}

export function BootstrapAdmin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "Super Admin", email: "", password: "", key: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.email || !form.password || !form.key) { setError("All fields required"); return; }
    setLoading(true);
    try {
      await api.post("/auth/bootstrap-super-admin", form);
      setSuccess(true);
      setTimeout(() => nav("/login"), 1500);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Bootstrap failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-sky-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center"><Utensils className="w-4 h-4 text-white" /></div>
          <span className="font-bold text-slate-800">NutriSignal</span>
        </Link>
        <Card>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Super Admin Setup</h2>
          <p className="text-sm text-slate-400 mb-4">One-time admin bootstrap</p>
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 text-sm rounded-lg px-3 py-2 mb-3">Admin created! Redirecting to login...</div>}
          <form onSubmit={submit} className="space-y-3">
            <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Admin name" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400" />
            <input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="Admin email" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400" />
            <input type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} placeholder="Password" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400" />
            <input type="password" value={form.key} onChange={(e) => setForm((s) => ({ ...s, key: e.target.value }))} placeholder="Bootstrap key" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400" />
            <button disabled={loading} className="w-full py-2.5 rounded-lg bg-sky-500 text-white font-semibold text-sm hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Initialize
            </button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
