import { NavLink, useNavigate } from "react-router-dom";
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
  ShoppingCart,
  Package,
  UploadCloud,
  FileText,
  Wallet,
  Settings,
  Cpu,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

const mainNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/command-center", label: "Command Center", icon: Cpu },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
];

const secondaryNav = [
  { to: "/upload", label: "Upload Data", icon: UploadCloud },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";

  const renderNavItem = (item: { to: string; label: string; icon: typeof LayoutDashboard }) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
          isActive
            ? "text-accent bg-accent-subtle border-l-[3px] border-accent rounded-l-none"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border-l-[3px] border-transparent"
        }`
      }
    >
      <item.icon
        size={18}
        className="group-hover:text-text-secondary transition-colors"
      />
      <span>{item.label}</span>
    </NavLink>
  );

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
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Operations
        </p>
        {mainNav.map(renderNavItem)}

        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Tools
        </p>
        {secondaryNav.map(renderNavItem)}

        <NavLink
          to="/assistant"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
              isActive
                ? "text-accent bg-accent-subtle border-l-[3px] border-accent rounded-l-none"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border-l-[3px] border-transparent"
            }`
          }
        >
          <Sparkles size={18} />
          <span>AI Assistant</span>
        </NavLink>
      </div>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-3 border-t border-border pt-4">
        <button
          onClick={() => {
            setMobileOpen(false);
            navigate("/assistant");
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all duration-150 text-sm font-medium cursor-pointer"
        >
          <Sparkles size={16} />
          <span className="flex-1 text-left">Ask the COO</span>
          <ChevronRight size={14} className="text-accent" />
        </button>

        {/* User profile */}
        <NavLink
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
          aria-label="View your profile"
        >
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
            <p className="text-xs text-text-muted truncate">{profile?.role ?? "owner"}</p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              signOut();
            }}
            className="text-text-muted hover:text-danger transition-colors p-1 cursor-pointer"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </NavLink>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-primary cursor-pointer"
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
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer"
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