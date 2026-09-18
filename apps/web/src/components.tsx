import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Users,
  UserRound,
  Building2,
  Target,
  CheckSquare,
  ChartNoAxesColumnIncreasing,
  Clock,
  Flame,
  X,
  Car,
  House,
  HeartPulse,
  FileText,
  Lightbulb,
  Upload,
  Send,
  UserPlus,
  CalendarPlus,
  type LucideIcon,
} from "lucide-react";
import { date, initials, useWrite } from "./api";
export const icons: Record<string, LucideIcon> = {
  clients: Users,
  individual: UserRound,
  business: Building2,
  renewals: CalendarDays,
  leads: Target,
  followups: CheckSquare,
  revenue: ChartNoAxesColumnIncreasing,
  attention: Clock,
  hot: Flame,
  won: Check,
  lost: X,
  insurance: ShieldCheck,
};
export const AuthContext = createContext<any>(null);
export const useAuth = () => useContext(AuthContext);
export const ToastContext = createContext<(s: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const C = icons[name] || FileText;
  return <C size={size} {...props} />;
}
export function Avatar({
  name,
  size = "normal",
  photoId,
}: {
  name: string;
  size?: string;
  photoId?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`avatar ${size} hue-${(name.charCodeAt(0) || 0) % 4}`}>
      {photoId && !failed ? (
        <img
          src={"/api/documents/" + photoId + "/download"}
          alt={name}
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: string;
}) {
  const text = String(children);
  const type =
    tone ||
    (text.match(/Overdue|Due Today|Lost|Urgent|Rejected/)
      ? "rose"
      : text.match(/Active|Won|Completed|Renewed|Connected/)
        ? "mint"
        : text.match(/Attention|Upcoming|High|Pending|Quarantined/)
          ? "amber"
          : text.match(/Lead|Qualified|Meeting/)
            ? "lavender"
            : "blue");
  return <span className={`badge ${type}`}>{children}</span>;
}
export function ProductIcon({
  category,
  size = 18,
}: {
  category: string;
  size?: number;
}) {
  const C = category.includes("Health")
    ? HeartPulse
    : category.includes("Vehicle")
      ? Car
      : category.includes("Loan")
        ? House
        : category.includes("Investment") || category.includes("Bond")
          ? ChartNoAxesColumnIncreasing
          : ShieldCheck;
  return (
    <span
      className={`product-icon ${category.includes("Health") ? "rose" : category.includes("Loan") ? "amber" : category.includes("Investment") ? "lavender" : "blue"}`}
    >
      <C size={size} />
    </span>
  );
}
export function Panel({
  title,
  children,
  action,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function PageHeading({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}
export function Metrics({
  items,
}: {
  items: {
    label: string;
    value: any;
    icon: string;
    tone?: string;
    note?: string;
    to?: string;
    tooltip?: string;
  }[];
}) {
  return (
    <div
      className="metrics"
      style={{ gridTemplateColumns: `repeat(${items.length},minmax(0,1fr))` }}
    >
      {items.map((m, i) => (
        <Link
          to={m.to || "#"}
          className={`metric ${m.tone || ["mint", "rose", "lavender", "blue", "amber"][i % 5]}`}
          key={m.label}
          title={m.tooltip || m.note}
        >
          <span className="metric-icon">
            <Icon name={m.icon} size={29} />
          </span>
          <div>
            <strong>{m.value ?? "—"}</strong>
            <div>{m.label}</div>
            {m.note && <small>{m.note}</small>}
          </div>
        </Link>
      ))}
    </div>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((t) => (
        <button
          role="tab"
          aria-selected={value === t}
          className={value === t ? "selected" : ""}
          onClick={() => onChange(t)}
          key={t}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-input">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Pagination({
  total,
  page,
  limit,
  onChange,
}: {
  total: number;
  page: number;
  limit: number;
  onChange: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pagination">
      <span>
        Showing {total ? (page - 1) * limit + 1 : 0} -{" "}
        {Math.min(page * limit, total)} of {total} records
      </span>
      <div>
        <button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(
          (n) => (
            <button
              key={n}
              className={page === n ? "primary" : ""}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ),
        )}
        {pages > 5 && <span>… {pages}</span>}
        <button
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function ContactActions({
  client,
  detail,
  compact = false,
}: {
  client: any;
  detail?: string;
  compact?: boolean;
}) {
  const write = useWrite(),
    toast = useToast();
  const open = async (channel: string) => {
    try {
      await write.mutateAsync({
        path: "/communications",
        body: { clientId: client.id, channel, event: "Conversation opened" },
      });
      if (channel === "WhatsApp")
        window.open(
          `https://wa.me/${client.phone.replace(/\D/g, "")}`,
          "_blank",
          "noopener,noreferrer",
        );
      else window.location.href = `tel:${client.phone}`;
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <span className="contact-actions">
      <button
        title="Open WhatsApp conversation"
        aria-label={`WhatsApp ${client.name}`}
        onClick={(e) => {
          e.stopPropagation();
          void open("WhatsApp");
        }}
      >
        <MessageCircle size={17} />
        {!compact && "WhatsApp"}
      </button>
      <button
        aria-label={`Call ${client.name}`}
        title="Open phone dialler"
        onClick={(e) => {
          e.stopPropagation();
          void open("Call");
        }}
      >
        <Phone size={16} />
        {!compact && "Call"}
      </button>
      {detail && (
        <Link
          aria-label={`Open ${client.name} details`}
          to={detail}
          onClick={(e) => e.stopPropagation()}
        >
          <Ellipsis size={18} />
        </Link>
      )}
    </span>
  );
}
export function Calendar({
  selected,
  onSelect,
  title,
  markers = [],
}: {
  selected: string;
  onSelect: (s: string) => void;
  title?: string;
  markers?: { date: string; tone: string }[];
}) {
  const [month, setMonth] = useState(
    () => new Date(selected.slice(0, 7) + "-01T12:00:00"),
  );
  const y = month.getFullYear(),
    m = month.getMonth(),
    first = new Date(y, m, 1).getDay(),
    days = new Date(y, m + 1, 0).getDate();
  const move = (n: number) => setMonth(new Date(y, m + n, 1, 12));
  return (
    <div className="calendar">
      {title && <h2>{title}</h2>}
      <div className="calendar-header">
        <button aria-label="Previous month" onClick={() => move(-1)}>
          <ChevronLeft size={16} />
        </button>
        <strong>
          {month.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button aria-label="Next month" onClick={() => move(1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <small key={d}>{d}</small>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <span key={"b" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = `${y}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
          return (
            <button
              key={d}
              className={d === selected ? "active" : ""}
              aria-label={
                date(d) +
                (markers.some((m) => m.date === d)
                  ? " · scheduled activity"
                  : "")
              }
              aria-pressed={d === selected}
              onClick={() => onSelect(d)}
            >
              {i + 1}
              {markers.some((m) => m.date === d) && (
                <i
                  className={
                    "date-marker " + markers.find((m) => m.date === d)?.tone
                  }
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
const quickItems: [string, LucideIcon, string, string][] = [
  ["Add Client", UserPlus, "/clients/new", "mint"],
  ["Add Lead", Target, "/leads/new", "lavender"],
  ["Send WhatsApp", MessageCircle, "/engagement/new", "mint"],
  ["Create Reminder", CalendarPlus, "/followups/new", "rose"],
  ["Upload Document", Upload, "/clients?upload=1", "blue"],
  ["View Renewals", CalendarDays, "/renewals", "amber"],
  ["Prepare Message", Send, "/engagement/new", "lavender"],
  ["View Reports", ChartNoAxesColumnIncreasing, "/reports", "mint"],
];
export function QuickActions({
  profile,
  followup = false,
}: {
  profile?: string;
  followup?: boolean;
}) {
  const items = profile
    ? ([
        [
          "WhatsApp",
          MessageCircle,
          `/engagement/new?clientId=${profile}`,
          "mint",
        ],
        [
          "Call",
          Phone,
          `/engagement/new?clientId=${profile}&channel=Call`,
          "blue",
        ],
        [
          "Email",
          Mail,
          `/engagement/new?clientId=${profile}&channel=Email`,
          "blue",
        ],
        [
          "Add Follow-up",
          CalendarPlus,
          `/followups/new?clientId=${profile}`,
          "rose",
        ],
      ] as typeof quickItems)
    : followup
      ? ([
          quickItems[2],
          ["Make a Call", Phone, "/engagement/new?channel=Call", "blue"],
          ["Schedule Follow-up", CalendarPlus, "/followups/new", "mint"],
          ["Add Note", FileText, "/clients", "mint"],
        ] as typeof quickItems)
      : quickItems;
  return (
    <div className={`quick-grid ${followup ? "two" : ""}`}>
      {items.map(([name, C, to, tone]) => (
        <Link key={name} to={to}>
          <span className={`quick-icon ${tone}`}>
            <C size={25} />
          </span>
          <span>{name}</span>
        </Link>
      ))}
    </div>
  );
}
export function Botanical({
  text = "Helping You Build a Secure Tomorrow",
}: {
  text?: string;
}) {
  return (
    <div className="botanical">
      <img src="/assets/botanical.png" alt="" />
      <p>
        {text}
        <i />
      </p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading your workspace…
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <h2>Unable to load this view</h2>
      <p>{error.message}</p>
      {retry && <button onClick={retry}>Try again</button>}
    </div>
  );
}
export function Empty({
  text = "No records found",
  action,
}: {
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <FileText size={26} />
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} className="modal">
      <div className="panel-heading">
        <h2>{title}</h2>
        <button aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Tip({
  title = "Tip",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="tip">
      <Lightbulb size={26} />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
export function ExportButton({ module }: { module: string }) {
  return (
    <a className="button" href={`/api/reports/export?module=${module}`}>
      <Download size={16} />
      Export
    </a>
  );
}
export function Back({
  to = "/clients",
  children = "Back to Clients",
}: {
  to?: string;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <button className="back-link" onClick={() => navigate(to)}>
      <ChevronLeft size={16} />
      {children}
    </button>
  );
}
export function FormError({ error }: { error: any }) {
  return error ? (
    <div role="alert" className="form-error">
      {error.message || String(error)}
    </div>
  ) : null;
}
export function Submit({
  busy,
  children = "Save changes",
}: {
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <button className="primary" type="submit" disabled={busy}>
      {busy ? "Saving…" : children}
      <ArrowRight size={16} />
    </button>
  );
}
export {
  ArrowRight,
  Plus,
  Check,
  Download,
  Search,
  CalendarDays,
  MessageCircle,
  Phone,
  ShieldCheck,
  FileText,
};
