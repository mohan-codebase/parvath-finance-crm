import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { addDays, addMonths } from "date-fns";
import { config } from "./config.js";
export const now = () =>
  config.DEMO_DATE ? new Date(config.DEMO_DATE) : new Date();
export const day = (date: Date = now(), timezone = "Asia/Kolkata") =>
  formatInTimeZone(date, timezone, "yyyy-MM-dd");
export const dateOnly = (s: string) =>
  new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
export const datePlus = (s: string, n: number) =>
  addDays(dateOnly(s), n).toISOString().slice(0, 10);
export const nextEventDate = (date: Date, months: number) =>
  addMonths(date, months);
export function timing(
  f: { state: string; dueAt: Date },
  timezone = "Asia/Kolkata",
) {
  if (f.state !== "pending")
    return f.state === "completed" ? "Completed" : "Cancelled";
  if (f.dueAt < now()) return "Overdue";
  return day(f.dueAt, timezone) === day(now(), timezone)
    ? "Due Today"
    : "Upcoming";
}
export function eventTiming(
  e: { status: string; dueDate: Date },
  timezone = "Asia/Kolkata",
) {
  if (e.status === "Confirmed") return "Renewed";
  const d = e.dueDate.toISOString().slice(0, 10);
  return d < day(now(), timezone)
    ? "Overdue"
    : d === day(now(), timezone)
      ? "Due Today"
      : "Upcoming";
}
export const rangeBounds = (range: string, timezone = "Asia/Kolkata") => {
  const today = day(now(), timezone);
  if (range === "Today")
    return { gte: dateOnly(today), lt: dateOnly(datePlus(today, 1)) };
  if (range === "Tomorrow")
    return {
      gte: dateOnly(datePlus(today, 1)),
      lt: dateOnly(datePlus(today, 2)),
    };
  if (range === "Overdue") return { lt: dateOnly(today) };
  if (range === "Next 7 Days" || range === "This Week")
    return { gte: dateOnly(today), lt: dateOnly(datePlus(today, 7)) };
  if (range === "Next Week")
    return {
      gte: dateOnly(datePlus(today, 7)),
      lt: dateOnly(datePlus(today, 14)),
    };
  if (range === "Next 30 Days")
    return { gte: dateOnly(today), lt: dateOnly(datePlus(today, 30)) };
  return undefined;
};
export const timestampBounds = (range: string, timezone: string) => {
  const r = rangeBounds(range, timezone);
  return r
    ? Object.fromEntries(
        Object.entries(r).map(([k, v]) => [
          k,
          fromZonedTime(v.toISOString().slice(0, 10) + "T00:00:00", timezone),
        ]),
      )
    : undefined;
};
export const jsonSafe = (x: unknown) =>
  JSON.parse(
    JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
export const verifiedContact = (c: any) =>
  c.communications?.find(
    (m: any) =>
      m.event === "Manual outcome" &&
      !["No answer", "Not needed"].includes(m.body),
  );
export const contactHistoryFilter = {
  event: "Manual outcome",
  NOT: { body: { in: ["No answer", "Not needed"] } },
};
export const flattenClient = (c: any) => ({
  ...c,
  ...c.contact,
  id: c.id,
  contactId: c.contactId,
  version: c.version,
  lastContactAt: verifiedContact(c)?.createdAt,
  photoId: c.documents?.find(
    (d: any) => d.purpose === "Photo" && d.status === "Available",
  )?.id,
  tags: c.tags?.map((t: any) => t.tag.name),
  contact: undefined,
});
export const clientInclude = {
  contact: true,
  documents: {
    where: { purpose: "Photo", status: "Available" },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { id: true, purpose: true, status: true },
  },
  tags: { include: { tag: true } },
  products: {
    include: {
      definition: { include: { provider: true } },
      events: {
        where: { status: "Pending" },
        orderBy: { dueDate: "asc" as const },
        take: 1,
      },
    },
  },
  communications: {
    where: contactHistoryFilter,
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
};
export function health(c: any) {
  const last = verifiedContact(c)?.createdAt;
  const days = last
    ? Math.max(
        0,
        Math.floor((now().getTime() - new Date(last).getTime()) / 86400000),
      )
    : 999;
  const signals = {
    recentContact: days <= 30 ? 40 : days <= 90 ? 20 : 0,
    completeContact: c.contact?.email && c.contact?.phone ? 20 : 10,
    activeProducts: c.products?.some((p: any) => p.status === "Active")
      ? 20
      : 0,
    noOverdueFollowups: !c.followups?.some((f: any) => timing(f) === "Overdue")
      ? 20
      : 0,
  };
  return { score: Object.values(signals).reduce((a, b) => a + b, 0), signals };
}
