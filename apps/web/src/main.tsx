import { StrictMode, Suspense, lazy, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useData } from "./api";
import { AuthContext, ErrorState, Loading, ToastContext } from "./components";
import Shell from "./Shell";
const Dashboard = lazy(() => import("./Dashboard"));
import Clients from "./Clients";
import ClientProfile from "./ClientProfile";
import ClientForm from "./ClientForm";
import ImportClients from "./ImportClients";
import Leads from "./Leads";
import Worklists from "./Worklists";
import {
  FollowupDetail,
  LeadDetail,
  NewRecord,
  ProductDetail,
  RenewalDetail,
} from "./RecordForms";
import {
  Engagement,
  Notifications,
  Products,
  Reports,
  Settings,
} from "./Supporting";
import Auth from "./Auth";
import "./styles.css";
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15000, refetchOnWindowFocus: false },
  },
});
function Protected() {
  const q = useData("/auth/me");
  if (q.isPending) return <Loading />;
  if (q.error?.status === 401) return <Navigate to="/login" replace />;
  if (q.error) return <ErrorState error={q.error} retry={q.refetch} />;
  return (
    <AuthContext.Provider value={q.data.data}>
      <Outlet />
    </AuthContext.Provider>
  );
}
function App() {
  const [toast, setToast] = useState("");
  const notify = (s: string) => {
    setToast(s);
    window.setTimeout(() => setToast(""), 6000);
  };
  return (
    <ToastContext.Provider value={notify}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/forgot-password" element={<Auth mode="forgot" />} />
          <Route path="/reset-password" element={<Auth mode="reset" />} />
          <Route element={<Protected />}>
            <Route element={<Shell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/new" element={<ClientForm />} />
              <Route path="clients/import" element={<ImportClients />} />
              <Route path="clients/:id" element={<ClientProfile />} />
              <Route path="clients/:id/edit" element={<ClientForm />} />
              <Route path="leads" element={<Leads />} />
              <Route path="leads/new" element={<NewRecord type="leads" />} />
              <Route path="leads/:id" element={<LeadDetail />} />
              <Route path="renewals" element={<Worklists type="renewals" />} />
              <Route path="renewals/:id" element={<RenewalDetail />} />
              <Route
                path="followups"
                element={<Worklists type="followups" />}
              />
              <Route
                path="followups/new"
                element={<NewRecord type="followups" />}
              />
              <Route path="followups/:id" element={<FollowupDetail />} />
              <Route path="products" element={<Products />} />
              <Route
                path="products/new"
                element={<NewRecord type="products" />}
              />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="engagement" element={<Engagement />} />
              <Route path="engagement/new" element={<Engagement compose />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route
                path="*"
                element={
                  <ErrorState
                    error={
                      new Error(
                        "This page does not exist. Use the navigation to return to your workspace.",
                      )
                    }
                  />
                }
              />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
