import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Sparkles,
  Plug,
  Menu,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/team", label: "Team", icon: Users },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/integrations", label: "Integrations", icon: Plug },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navContent = (
    <nav className="flex flex-col h-full" aria-label="Main navigation">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <span className="text-black font-bold text-sm">B</span>
        </div>
        <span className="font-semibold text-sm text-text-primary tracking-tight">
          BlackBox
        </span>
        <span className="text-xs font-medium text-accent">COO</span>
      </div>

      {/* Nav items */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "text-accent bg-accent-subtle border-l-[3px] border-accent rounded-l-none"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border-l-[3px] border-transparent"
              }`}
            >
              <item.icon
                size={18}
                className={isActive ? "text-accent" : "text-text-muted group-hover:text-text-secondary"}
              />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-3 border-t border-border pt-4">
        <button
          onClick={() => {
            setMobileOpen(false);
            navigate("/assistant");
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all duration-150 text-sm font-medium"
        >
          <Sparkles size={16} />
          <span className="flex-1 text-left">Ask the COO</span>
          <ChevronRight size={14} className="text-accent" />
        </button>

        {/* User profile placeholder */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">Admin</p>
            <p className="text-xs text-text-muted truncate">Admin</p>
          </div>
          <button
            className="text-text-muted hover:text-danger transition-colors p-1"
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-primary"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-sm bg-bg border-r border-border transform transition-transform duration-200 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end h-16 px-4 border-b border-border">
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[240px] lg:fixed lg:inset-y-0 lg:border-r lg:border-border bg-bg z-30">
        {navContent}
      </aside>
    </>
  );
}