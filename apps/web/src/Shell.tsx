import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Bell,
  ChartNoAxesColumnIncreasing,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  House,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Plus,
  Search,
  Settings,
  Target,
  Users,
  X,
  CalendarDays,
  Moon,
  Sun,
} from "lucide-react";
import { api, useData } from "./api";
import { Avatar, Botanical, useAuth } from "./components";
import { ThemeToggle, useTheme } from "./theme";
const nav = [
  ["Dashboard", "/dashboard", House],
  ["Clients", "/clients", Users],
  ["Leads", "/leads", Target],
  ["Renewals", "/renewals", CalendarDays],
  ["Follow-ups", "/followups", CheckSquare],
  ["Products", "/products", Package],
  ["Engagement", "/engagement", MessageCircle],
  ["Reports", "/reports", ChartNoAxesColumnIncreasing],
  ["Settings", "/settings", Settings],
] as const;
export default function Shell() {
  const user = useAuth(),
    location = useLocation(),
    navigate = useNavigate(),
    { resolvedTheme, toggleTheme } = useTheme();
  const [drawer, setDrawer] = useState(false),
    [search, setSearch] = useState(""),
    [account, setAccount] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 999px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 999px)");
    const update = () => {
      setCompact(media.matches);
      setDrawer(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!drawer || !compact) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = sidebar.current;
    const focusable = () =>
      Array.from(
        element?.querySelectorAll<HTMLElement>("a,button") || [],
      ).filter((node) => node.getClientRects().length > 0);
    focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    element?.addEventListener("keydown", trap);
    return () => {
      element?.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [drawer, compact]);
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 180);
    return () => clearTimeout(t);
  }, [search]);
  const results = useData(
      "/search?q=" + encodeURIComponent(debounced),
      debounced.length >= 2,
    ),
    notifications = useData("/notifications");
  useEffect(() => {
    setDrawer(false);
    setSearch("");
    setAccount(false);
  }, [location.pathname]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        input.current?.focus();
      }
      if (e.key === "Escape") {
        setDrawer(false);
        setSearch("");
        setAccount(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const isLead = location.pathname.startsWith("/leads"),
    isFollow = location.pathname.startsWith("/followups");
  const primary = isLead
    ? ["Add Lead", "/leads/new"]
    : isFollow
      ? ["Add Follow-up", "/followups/new"]
      : ["Add Client", "/clients/new"];
  return (
    <div className="app-shell">
      {drawer && (
        <button
          className="drawer-backdrop"
          tabIndex={-1}
          aria-label="Close navigation"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        ref={sidebar}
        id="main-navigation"
        className={"sidebar " + (drawer ? "open" : "")}
        inert={compact && !drawer}
        role={compact && drawer ? "dialog" : undefined}
        aria-modal={compact && drawer ? true : undefined}
        aria-label={compact && drawer ? "Navigation" : undefined}
      >
        <Link className="brand" to="/dashboard">
          <img src="/assets/logo.png" alt="" />
          <span>
            <strong>Parvath FinServ</strong>
            <small>Your Financial Partner</small>
          </span>
        </Link>
        <button
          className="drawer-close"
          aria-label="Close navigation"
          onClick={() => setDrawer(false)}
        >
          <X />
        </button>
        <nav aria-label="Main navigation">
          {nav.map(([label, to, C]) => (
            <NavLink key={to} to={to}>
              <C size={21} />
              <span>{label}</span>
              {["Products", "Engagement"].includes(label) && (
                <ChevronRight className="nav-chevron" size={16} />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Botanical
            text={
              isLead
                ? "Clients Today Secure Tomorrow"
                : isFollow
                  ? "Grow Protect Invest Together"
                  : "Helping You Build a Secure Tomorrow"
            }
          />
          <div className="sidebar-footer">
            <strong>Parvath FinServ</strong>
            <small>Your Trusted Financial Partner</small>
          </div>
        </div>
      </aside>
      <div className="workspace" inert={compact && drawer}>
        <header className="topbar">
          <button
            className="menu-toggle"
            aria-label="Open navigation"
            aria-expanded={drawer}
            aria-controls="main-navigation"
            onClick={() => setDrawer(true)}
          >
            <Menu />
          </button>
          <div className="global-search">
            <Search size={19} />
            <input
              ref={input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients, leads, policies, or press / to quick search..."
              aria-label="Search all records"
            />
            {debounced.length >= 2 && (
              <div className="search-results">
                {results.isPending ? (
                  <p>Searching…</p>
                ) : results.error ? (
                  <p>{results.error.message}</p>
                ) : results.data?.data.length ? (
                  results.data.data.map((r: any) => (
                    <Link key={r.id} to={r.url}>
                      <Search size={15} />
                      <span>
                        <strong>{r.title}</strong>
                        <small>{r.subtitle}</small>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p>No matching records</p>
                )}
              </div>
            )}
          </div>
          <div className="top-actions">
            <Link to="/engagement/new" className="button whatsapp-button">
              <MessageCircle size={20} /> <span>Send WhatsApp</span>
            </Link>
            {(user.role !== "Operations" || isFollow) && (
              <Link className="button primary" to={primary[1]}>
                <Plus size={19} />
                <span>{primary[0]}</span>
              </Link>
            )}
            <ThemeToggle />
            <Link
              className="notification-button"
              to="/notifications"
              aria-label="Notifications"
            >
              <Bell size={23} />
              {notifications.data?.data.filter((n: any) => !n.readAt).length >
                0 && (
                <b>
                  {notifications.data.data.filter((n: any) => !n.readAt).length}
                </b>
              )}
            </Link>
            <div className="account">
              <button
                onClick={() => setAccount(!account)}
                aria-expanded={account}
                aria-label="Account menu"
              >
                <Avatar name={user.name} />
                <span>{user.name.split(" ")[0]}</span>
                <ChevronDown size={15} />
              </button>
              {account && (
                <div className="account-menu">
                  <p>{user.role}</p>
                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                    }}
                  >
                    {resolvedTheme === "dark" ? (
                      <Sun size={16} />
                    ) : (
                      <Moon size={16} />
                    )}
                    {resolvedTheme === "dark"
                      ? "Light appearance"
                      : "Dark appearance"}
                  </button>
                  <Link to="/settings">
                    <Settings size={16} />
                    Account settings
                  </Link>
                  <button
                    onClick={async () => {
                      await api("/auth/logout", { method: "POST" });
                      navigate("/login");
                      window.location.reload();
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
