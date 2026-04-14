import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { initAuth, setAuthToken, getRole } from "./lib/api";
import { Home, Login, Register, BootstrapAdmin } from "./pages/Auth";
import SuperAdmin from "./pages/SuperAdmin";
import RestaurantDash from "./pages/RestaurantDash";
import CustomerFlow from "./pages/CustomerFlow";
import { Utensils, LogOut } from "lucide-react";
import type { ReactElement } from "react";
import "./index.css";

initAuth();

type Role = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "STAFF";

function Navbar() {
  const nav = useNavigate();
  const loc = useLocation();
  const role = getRole();
  const isLoggedIn = !!localStorage.getItem("token");

  const isAuth = ["/login", "/register", "/bootstrap-super-admin", "/"].includes(loc.pathname);
  if (isAuth) return null;

  const logout = () => { setAuthToken(null); nav("/login"); };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-[52px]">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
            <Utensils className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-800 text-sm">NutriSignal</span>
        </Link>
        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <>
              {role === "SUPER_ADMIN" && <Link to="/super-admin" className="text-sm text-slate-600 font-medium hover:text-sky-600 transition-colors">Dashboard</Link>}
              {["OWNER", "MANAGER", "STAFF"].includes(role ?? "") && <Link to="/dashboard" className="text-sm text-slate-600 font-medium hover:text-sky-600 transition-colors">Dashboard</Link>}
              <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors ml-2">
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function RequireRole({ allow, children }: { allow: Role[]; children: ReactElement }) {
  const role = getRole() as Role;
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" />;
  if (!allow.includes(role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/t/:tableUuid" element={<CustomerFlow />} />
        <Route path="*" element={<WithNavbar />} />
      </Routes>
    </BrowserRouter>
  );
}

function WithNavbar() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/bootstrap-super-admin" element={<BootstrapAdmin />} />
        <Route path="/dashboard" element={<RequireRole allow={["OWNER", "MANAGER", "STAFF"]}><RestaurantDash /></RequireRole>} />
        <Route path="/super-admin" element={<RequireRole allow={["SUPER_ADMIN"]}><SuperAdmin /></RequireRole>} />
      </Routes>
    </>
  );
}
