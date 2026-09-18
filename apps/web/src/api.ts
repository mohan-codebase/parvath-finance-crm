import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
let csrf = "";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any,
  ) {
    super(message);
  }
}
export async function api(path: string, options: RequestInit = {}) {
  const method = options.method || "GET";
  if (method !== "GET" && !csrf) {
    const r = await fetch("/api/auth/csrf", { credentials: "include" });
    csrf = (await r.json()).data.csrf;
  }
  const r = await fetch("/api" + path, {
    ...options,
    credentials: "include",
    headers: {
      ...(!(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
      ...options.headers,
    },
  });
  const raw = await r.text();
  let result: any;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new ApiError(
      "The server is temporarily unavailable. Please try again.",
      r.status || 503,
    );
  }
  if (!r.ok)
    throw new ApiError(
      result.error?.message || "Request failed",
      r.status,
      result.error?.details,
    );
  if (result.data?.csrf) csrf = result.data.csrf;
  return result;
}
export const query = (params: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== undefined && v !== null) p.set(k, String(v));
  });
  return p.toString();
};
export const useData = (path: string, enabled = true) =>
  useQuery<any, ApiError>({
    queryKey: [path],
    queryFn: () => api(path),
    enabled,
    retry: (n, e) => e.status >= 500 && n < 1,
  });
export function useWrite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      body,
      method = "POST",
    }: {
      path: string;
      body?: any;
      method?: string;
    }) =>
      api(path, {
        method,
        body: body instanceof FormData ? body : JSON.stringify(body || {}),
      }),
    onSuccess: () => qc.invalidateQueries(),
  });
}
export const rupees = (minor: unknown) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(minor || 0) / 100);
export const date = (v: string | undefined) =>
  v
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date(v))
    : "—";
export const time = (v: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(v));
export const initials = (v: string) =>
  v
    .split(" ")
    .slice(0, 2)
    .map((v) => v[0])
    .join("")
    .toUpperCase();

export function toMinor(amount: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(amount))
    throw new Error(
      "Enter a positive rupee amount with at most two decimal places",
    );
  const [whole, fraction = ""] = amount.split(".");
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))).toString();
}
