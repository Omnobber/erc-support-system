import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const linksByRole = {
  admin: [
    { to: "/admin", label: "Dashboard" },
    { to: "/calls", label: "Calls" },
    { to: "/inventory", label: "Inventory" },
    { to: "/reports", label: "Reports" }
  ],
  engineer: [{ to: "/engineer", label: "Engineer Board" }],
  client: [{ to: "/client", label: "Client Desk" }]
};

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const links = user ? linksByRole[user.role] || [] : [];

  const logoutNow = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-ink-950 dark:text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-r border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <div className="rounded-2xl bg-[linear-gradient(140deg,#0f172a,#1a8f5d)] p-4 text-white">
            <p className="font-heading text-lg font-semibold">ERC Support</p>
            <p className="text-xs opacity-80">Tenant: {user?.tenantName || "ERC Main Facility"}</p>
          </div>
          <nav className="mt-5 space-y-2">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-brand-500 text-white"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div>
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div>
              <p className="font-heading text-lg font-semibold">Operations Workspace</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.name} ({user?.role})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold dark:border-slate-700"
              >
                {theme === "dark" ? "Light" : "Dark"}
              </button>
              <button
                onClick={logoutNow}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-brand-500"
              >
                Logout
              </button>
            </div>
          </header>
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
