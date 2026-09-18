import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { Botanical, FormError, Submit } from "./components";
import { ThemeToggle } from "./theme";
export default function Auth({
  mode = "login",
}: {
  mode?: "login" | "forgot" | "reset";
}) {
  const navigate = useNavigate(),
    qc = useQueryClient(),
    [params] = useSearchParams(),
    [error, setError] = useState<Error>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await api(
        "/auth/" +
          (mode === "login"
            ? "login"
            : mode === "forgot"
              ? "forgot-password"
              : "reset-password"),
        {
          method: "POST",
          body: JSON.stringify({
            ...f,
            ...(mode === "reset" ? { token: params.get("token") } : {}),
          }),
        },
      );
      if (mode === "login") {
        await qc.invalidateQueries();
        navigate("/dashboard");
      } else
        setMessage(
          mode === "forgot"
            ? result.data.message
            : "Password updated. You can sign in now.",
        );
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-theme-corner">
        <ThemeToggle />
      </div>
      <div className="auth-brand">
        <Link className="brand" to="/login">
          <img src="/assets/logo.png" alt="" />
          <span>
            <strong>Parvath FinServ</strong>
            <small>Your Financial Partner</small>
          </span>
        </Link>
        <h1>
          Strong relationships.
          <br />
          Secure tomorrows.
        </h1>
        <p>A thoughtful workspace for every financial relationship.</p>
        <Botanical text="Grow Protect Invest Together" />
      </div>
      <div className="auth-card">
        <span className="circle-icon mint">
          <ShieldCheck size={30} />
        </span>
        <h1>
          {mode === "login"
            ? "Welcome back"
            : mode === "forgot"
              ? "Reset your password"
              : "Choose a new password"}
        </h1>
        <p>
          {mode === "login"
            ? "Sign in to your Parvath FinServ workspace."
            : "Secure access to your financial relationships."}
        </p>
        {message ? (
          <div role="status" className="success-note">
            {message}
            <Link to="/login">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            {mode !== "reset" && (
              <label>
                Email Address
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="you@company.com"
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={mode === "reset" ? 12 : 1}
                  required
                  placeholder={
                    mode === "reset"
                      ? "At least 12 characters"
                      : "Enter your password"
                  }
                />
              </label>
            )}
            <FormError error={error} />
            <Submit busy={busy}>
              {mode === "login"
                ? "Sign In"
                : mode === "forgot"
                  ? "Send Reset Link"
                  : "Reset Password"}
            </Submit>
          </form>
        )}
        <Link
          className="text-link"
          to={mode === "login" ? "/forgot-password" : "/login"}
        >
          {mode === "login" ? "Forgot password?" : "Back to sign in"}
        </Link>
        <small className="auth-footer">
          Private by design. Built around your relationships.
        </small>
      </div>
    </div>
  );
}
