import React, { useState } from "react";
import { Badge, Btn } from "../ui/atoms";
import {
  DashboardPage,
  ConsumptionPage,
  BillingPage,
  AlertsPage,
  HouseholdsPage,
  RecordsPage,
  SettingsPage,
  BillStatementsPage,
} from "./AdminPages";
import { adminForgotPassword, adminResetPassword } from "../api";
import logoImage from "../assets/brgy.jpg";

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: "consumption",
    label: "Consumption",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    id: "billing",
    label: "Billing",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    id: "statements",
    label: "Bill Statements",
    icon: "M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3M4 7h16M4 11h7m-7 4h7m-7 4h7",
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  {
    id: "households",
    label: "Households",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: "records",
    label: "Records",
    icon: "M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3M4 7h16M4 11h7m-7 4h7m-7 4h7",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  },
];

export function AdminView(props) {
  const {
    households,
    alerts,
    totalCollected,
    unpaidCount,
    billsGenerated,
    page,
    setPage,
    adminAuthenticated,
    onAdminLogin,
    onAdminLogout,
    adminEmail,
    markPaid,
    receiveGcashPayment,
    showToast,
    alertFilter,
    setAlertFilter,
    selectedAlertId,
    setSelectedAlertId,
    resolveAlert,
    onResetResidentPassword,
    onGenerateBills,
    onAddHousehold,
  } = props;

  const unresolvedCount = alerts.filter((a) => a.status === "Unresolved").length;
  const gcashPendingCount = households.filter((h) => h.paymentStatus === "GCash Pending").length;

  if (!adminAuthenticated || page === "login") {
    return <AdminLoginScreen onAdminLogin={onAdminLogin} />;
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-52 bg-[#1e3a5f] min-h-[680px] text-white flex flex-col flex-shrink-0">
        {/* Logo block */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
          <img
            src={logoImage}
            alt="logo"
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow"
          />
          <div className="leading-[1.25]">
            <div className="font-extrabold text-[10px] uppercase tracking-wide">Barangay</div>
            <div className="font-extrabold text-[10px] uppercase tracking-wide">Kinamlutan</div>
            <div className="font-extrabold text-[10px] uppercase tracking-wide">Water System</div>
          </div>
        </div>

        {/* Admin info */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-white truncate">{adminEmail || "Admin"}</div>
            <div className="text-[10px] text-blue-300">Water Office</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full text-left px-4 py-2.5 text-[12px] flex items-center gap-2.5 transition border-l-2 ${
                  isActive
                    ? "bg-white/15 font-semibold border-sky-400 text-white"
                    : "text-blue-100 hover:bg-white/5 border-transparent"
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                </svg>
                <span className="truncate">{item.label}</span>
                {item.id === "alerts" && unresolvedCount > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {unresolvedCount}
                  </span>
                )}
                {item.id === "billing" && gcashPendingCount > 0 && (
                  <span className="ml-auto bg-sky-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {gcashPendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={() => {
            if (typeof onAdminLogout === "function") onAdminLogout();
          }}
          className="flex items-center gap-2 px-4 py-3 text-[12px] text-rose-300 hover:text-white border-t border-white/10 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 bg-slate-50 min-w-0">
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between">
          <div className="text-[12px] text-slate-500">
            Signed in as <span className="font-semibold text-slate-700">{adminEmail || "Admin"}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
        <div className="p-6 max-h-[640px] overflow-y-auto">
          {page === "dashboard" && (
            <DashboardPage
              households={households}
              alerts={alerts}
              totalCollected={totalCollected}
              unpaidCount={unpaidCount}
              setPage={setPage}
            />
          )}
          {page === "consumption" && <ConsumptionPage households={households} />}
          {page === "billing" && (
            <BillingPage
              households={households}
              markPaid={markPaid}
              receiveGcashPayment={receiveGcashPayment}
              showToast={showToast}
              billsGenerated={billsGenerated}
              unpaidCount={unpaidCount}
              totalCollected={totalCollected}
              onGenerateBills={onGenerateBills}
            />
          )}
          {page === "alerts" && (
            <AlertsPage
              alerts={alerts}
              filter={alertFilter}
              setFilter={setAlertFilter}
              selectedAlertId={selectedAlertId}
              setSelectedAlertId={setSelectedAlertId}
              resolveAlert={resolveAlert}
            />
          )}
          {page === "households" && (
            <HouseholdsPage
              households={households}
              showToast={showToast}
              onResetPassword={onResetResidentPassword}
              onAddHousehold={onAddHousehold}
            />
          )}
          {page === "records" && <RecordsPage households={households} showToast={showToast} />}
          {page === "statements" && <BillStatementsPage households={households} />}
          {page === "settings" && <SettingsPage showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADMIN LOGIN — matches handleAdminLogin({ email, password })
//   -> returns/resolves { success, message? }
// Valid demo creds: admin@barangay.local / wateroffice@barangay.local
// with any password 8+ characters.
// ─────────────────────────────────────────────────────────────
function AdminLoginScreen({ onAdminLogin }) {
  const [mode, setMode] = useState("login"); // 'login' | 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await onAdminLogin({ email, password });
      if (!result || !result.success) {
        setError((result && result.message) || "Login failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "forgot") {
    return (
      <ForgotPasswordScreen
        initialEmail={email}
        onDone={(resetEmail, message) => {
          setEmail(resetEmail);
          setPassword("");
          setInfo(message);
          setMode("login");
        }}
        onCancel={() => setMode("login")}
      />
    );
  }

  return (
    <div className="min-h-[680px] flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header band */}
          <div className="bg-[#1e3a5f] px-8 py-6 text-center">
            <img
              src={logoImage}
              alt="Barangay Kinamlutan logo"
              className="mx-auto mb-3 h-16 w-16 rounded-full object-cover shadow-lg border-2 border-white/20"
            />
            <div className="font-extrabold text-white text-[15px] leading-tight">
              Barangay Kinamlutan
            </div>
            <div className="font-semibold text-sky-300 text-[12px] mt-0.5">
              Water Billing & Monitoring System
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            <div className="text-[13px] font-semibold text-slate-700 mb-1 text-center">
              Admin Sign In
            </div>
            <div className="text-[11px] text-slate-400 mb-5 text-center">
              Enter your admin credentials to access the water system dashboard.
            </div>

            {info && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 mb-4 text-[11px] text-emerald-700">
                {info}
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 mb-4 flex items-start gap-2">
                <svg className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-[11px] text-rose-700">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-[13px] focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition placeholder-slate-300"
                    placeholder="admin@barangay.local"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-1">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-10 py-2.5 text-[13px] focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition placeholder-slate-300"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="text-right mb-5">
                <button
                  type="button"
                  onClick={() => { setError(""); setInfo(""); setMode("forgot"); }}
                  className="text-[11px] text-sky-600 hover:text-sky-800 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full text-white text-[13px] font-semibold py-2.5 rounded-lg transition active:scale-[0.98] ${
                  submitting ? "bg-slate-400 cursor-not-allowed" : "bg-[#1e3a5f] hover:bg-[#16304f]"
                }`}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-[11px] text-slate-400">
          Barangay Kinamlutan, Butuan City · ZIP 8600
        </div>
        <div className="text-center mt-2 text-[11px] text-slate-500">
          Resident?{" "}
          <a href="/resident" className="text-sky-600 hover:text-sky-800 font-medium">
            Go to the resident portal
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FORGOT PASSWORD — two steps on one screen:
//   1) request a reset code for an email
//   2) enter the code + a new password
// No email service is configured, so the code is shown directly on screen
// instead of being emailed (the code still expires and is rate-limited
// server-side, same as a real flow).
// ─────────────────────────────────────────────────────────────
function ForgotPasswordScreen({ initialEmail, onDone, onCancel }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [resetCode, setResetCode] = useState(null);
  const [expiresInMinutes, setExpiresInMinutes] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestCode(e) {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Email is required.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await adminForgotPassword(email);
      if (!result.success) {
        setError(result.message || "Could not send a reset code.");
        return;
      }
      setResetCode(result.resetCode);
      setCodeInput(result.resetCode);
      setExpiresInMinutes(result.expiresInMinutes);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    if (!codeInput || !newPassword) {
      setError("Reset code and new password are required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await adminResetPassword({ email, code: codeInput, newPassword });
      if (!result.success) {
        setError(result.message || "Could not reset your password.");
        return;
      }
      onDone(email, "Password reset successfully. Sign in with your new password.");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[680px] flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header band */}
          <div className="bg-[#1e3a5f] px-8 py-6 text-center">
            <img
              src={logoImage}
              alt="Barangay Kinamlutan logo"
              className="mx-auto mb-3 h-16 w-16 rounded-full object-cover shadow-lg border-2 border-white/20"
            />
            <div className="font-extrabold text-white text-[15px] leading-tight">
              Barangay Kinamlutan
            </div>
            <div className="font-semibold text-sky-300 text-[12px] mt-0.5">
              Water Billing & Monitoring System
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            <div className="text-[13px] font-semibold text-slate-700 mb-1 text-center">
              Reset Password
            </div>
            <div className="text-[11px] text-slate-400 mb-5 text-center">
              {resetCode
                ? "Enter the reset code and choose a new password."
                : "Enter your admin email to get a reset code."}
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 mb-4 text-[11px] text-rose-700">
                {error}
              </div>
            )}

            {!resetCode ? (
              <form onSubmit={handleRequestCode}>
                <div className="mb-5">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-[13px] focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition placeholder-slate-300"
                      placeholder="admin@barangay.local"
                      autoComplete="username"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full text-white text-[13px] font-semibold py-2.5 rounded-lg transition active:scale-[0.98] ${
                    submitting ? "bg-slate-400 cursor-not-allowed" : "bg-[#1e3a5f] hover:bg-[#16304f]"
                  }`}
                >
                  {submitting ? "Sending…" : "Send Reset Code"}
                </button>
              </form>
            ) : (
              <>
                <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5 mb-4 text-[11px] text-sky-800">
                  <div className="font-semibold mb-1">
                    No email service is configured, so here's your reset code:
                  </div>
                  <div className="text-2xl font-mono font-bold tracking-widest text-center py-1 text-slate-800">
                    {resetCode}
                  </div>
                  <div className="text-[11px] text-sky-600 text-center">
                    Valid for {expiresInMinutes} minutes.
                  </div>
                </div>

                <form onSubmit={handleResetPassword}>
                  <div className="mb-3">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Reset Code
                    </label>
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => { setCodeInput(e.target.value); setError(""); }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-[13px] font-mono tracking-widest focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition placeholder-slate-300"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="mb-5">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition"
                      autoComplete="new-password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full text-white text-[13px] font-semibold py-2.5 rounded-lg transition active:scale-[0.98] ${
                      submitting ? "bg-slate-400 cursor-not-allowed" : "bg-[#1e3a5f] hover:bg-[#16304f]"
                    }`}
                  >
                    {submitting ? "Resetting…" : "Reset Password"}
                  </button>
                </form>
              </>
            )}

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onCancel}
                className="text-[11px] text-slate-500 hover:text-slate-700 font-medium"
              >
                ← Back to sign in
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-[11px] text-slate-400">
          Barangay Kinamlutan, Butuan City · ZIP 8600
        </div>
      </div>
    </div>
  );
}