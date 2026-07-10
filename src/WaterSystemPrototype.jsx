import React, { useState, useEffect, useRef, useCallback } from "react";
import { buildInitialAlerts, genReading, computeBill, peso } from "./data";
import { AdminView } from "./views/AdminView";
import { ResidentView } from "./views/ResidentView";
import { GcashModal } from "./components/GcashModal";
import { Toast } from "./ui/atoms";
import {
  getToken, adminLogin, adminLogout,
  fetchResidents, fetchBills, fetchBillingPeriods, generateBills,
  fetchReadings, fetchLatestReading,
  initiateGcash, recordCash, confirmGcash, fetchPayments,
  residentLogin, residentGoogleLogin, residentLogout,
  updateResidentProfile, resetResidentPassword, resolveAlertApi,
  createHousehold, fetchAlerts,
} from "./api";
import { residentToHousehold } from "./databridge.js";

// ── Mode flag ─────────────────────────────────────────────────
// Set to true once you have the backend running and seeded.
// When false, the app runs fully on mock data (original behaviour).
const USE_API = true;

// The header's Admin/Resident toggle was removed — which portal shows is now
// determined by the URL path instead (/admin or /resident).
function getViewFromPath() {
  return window.location.pathname.startsWith("/resident") ? "resident" : "admin";
}

export default function WaterSystemPrototype() {
  const [view] = useState(getViewFromPath);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [residentAuthenticated, setResidentAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [residentLoginHouseholdId, setResidentLoginHouseholdId] = useState(null);

  // shared state — populated either from API or from mock data
  const [households, setHouseholds] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeResidentId, setActiveResidentId] = useState(null);

  const [toast, setToast] = useState(null);
  const [adminPage, setAdminPage] = useState("login");
  const [residentPage, setResidentPage] = useState("login");
  const [alertFilter, setAlertFilter] = useState("All");
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentStep, setPaymentStep] = useState("confirm");
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [loading, setLoading] = useState(USE_API);

  const toastTimer = useRef(null);

  function showToast(message, tone = "info") {
    setToast({ message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // ── Load data ───────────────────────────────────────────────
  // `silent` skips the full-screen loading state — used when refreshing after
  // an admin/resident action so the current page (filters, expanded rows,
  // scroll position) doesn't get torn down and remounted.
  const loadFromAPI = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [residents, bills, periods, rawAlerts] = await Promise.all([
        fetchResidents(),
        fetchBills(),
        fetchBillingPeriods(),
        fetchAlerts(),
      ]);

      // Group bills by household. Bill rows from GET /api/bills carry
      // `household_id` (not `resident_id` — that field only exists on rows
      // from GET /api/residents).
      const billsByResident = {};
      for (const b of bills) {
        if (!billsByResident[b.household_id]) billsByResident[b.household_id] = [];
        billsByResident[b.household_id].push(b);
      }

      // Fetch latest sensor reading per resident
      const readingResults = await Promise.allSettled(
        residents.map((r) => fetchLatestReading(r.meter_no))
      );

      const mapped = residents.map((r, idx) => {
        const residentBills = billsByResident[r.resident_id] || [];
        const latestBill = residentBills[residentBills.length - 1] || null;
        const reading = readingResults[idx].status === "fulfilled"
          ? readingResults[idx].value
          : null;
        return residentToHousehold(r, latestBill, reading, residentBills);
      });

      setHouseholds(mapped);
      setAlerts(
        rawAlerts.map((a) => ({
          id: a.id,
          householdId: a.household_id,
          name: a.name,
          standpost: a.standpost,
          type: a.type,
          flowRate: a.flow_rate,
          threshold: a.threshold,
          time: new Date(a.created_at.replace(" ", "T") + "Z").toLocaleString("en-PH", {
            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
          }),
          status: a.status,
        }))
      );
      // Functional updates avoid reading activeResidentId/residentLoginHouseholdId
      // from this useCallback's stale closure (it's memoized with `[]` deps).
      if (mapped.length > 0) {
        setActiveResidentId((prev) => prev || mapped[0].id);
        setResidentLoginHouseholdId((prev) => prev || mapped[0].id);
      }
    } catch (err) {
      showToast("Could not connect to backend: " + err.message, "warn");
      // Fall back to mock data
      loadMockData();
    } finally {
      if (!silent) setLoading(false);
    }
  }, []); // eslint-disable-line

  function loadMockData() {
    // Original mock bootstrap (imported lazily to keep bundle clean)
    import("./data.js").then(({ buildInitialHouseholds, buildInitialAlerts }) => {
      const h = buildInitialHouseholds();
      setHouseholds(h);
      setAlerts(buildInitialAlerts(h));
      setActiveResidentId((prev) => prev || h[0].id);
      setResidentLoginHouseholdId((prev) => prev || h[0].id);
    });
  }

  useEffect(() => {
    if (USE_API) {
      loadFromAPI();
    } else {
      loadMockData();
    }
  }, []); // eslint-disable-line

  // Normalize the address bar to the canonical /admin or /resident path
  // (e.g. a visit to "/" becomes "/admin") now that there's no in-app toggle.
  useEffect(() => {
    const canonicalPath = view === "resident" ? "/resident" : "/admin";
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState(null, "", canonicalPath);
    }
  }, [view]);

  // ── IoT simulation (mock mode only) ─────────────────────────
  useEffect(() => {
    if (USE_API) return; // backend pushes real data; no simulation needed
    if (households.length === 0) return;

    const interval = setInterval(() => {
      setHouseholds((prev) => {
        const idx = Math.floor(Math.random() * prev.length);
        const target = prev[idx];
        const { current, isAnomaly } = genReading(target.currCm3, 0.1);
        const consumption = current - target.prevCm3;
        const amount = computeBill(consumption);

        if (isAnomaly) {
          const newAlert = {
            id: `ALT-${Math.floor(Math.random() * 900 + 100)}`,
            householdId: target.id,
            name: target.name,
            standpost: target.standpost,
            type: Math.random() > 0.5 ? "Leak Detected" : "High Flow",
            flowRate: `${(60 + Math.random() * 40).toFixed(0)} L/m`,
            threshold: "50 L/m",
            time: "Just now",
            status: "Unresolved",
          };
          setAlerts((a) => [newAlert, ...a].slice(0, 10));
          showToast(`Abnormal usage detected — ${target.id} (${target.name})`, "warn");
        }

        const updated = [...prev];
        updated[idx] = {
          ...target,
          currCm3: current,
          consumption,
          amount,
          totalDue: +(amount + target.prevBalance).toFixed(2),
          lastFlow: isAnomaly ? 15 + Math.floor(Math.random() * 10) : 2 + Math.floor(Math.random() * 5),
          flowType: isAnomaly ? "High flow" : "Normal",
        };
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [households.length]);

  // ── Admin login (Google) ─────────────────────────────────────
  async function handleAdminLogin({ email, password }) {
    if (!email || !password) {
      return { success: false, message: "Email and password are required." };
    }

    if (USE_API) {
      try {
        const user = await adminLogin(email, password);
        setAdminEmail(user.email || email);
        setAdminAuthenticated(true);
        setAdminPage("dashboard");
        return { success: true };
      } catch (err) {
        return { success: false, message: err.message };
      }
    }

    if (email.toLowerCase() !== "admin@barangay.local" && email.toLowerCase() !== "wateroffice@barangay.local") {
      return { success: false, message: "Use an admin email such as admin@barangay.local." };
    }
    if (password.length < 8) {
      return { success: false, message: "Password must be at least 8 characters." };
    }

    setAdminEmail(email);
    setAdminAuthenticated(true);
    setAdminPage("dashboard");
    return { success: true };
  }

  function handleAdminLogout() {
    if (USE_API) adminLogout();
    setAdminEmail("");
    setAdminAuthenticated(false);
    setAdminPage("login");
  }

  // ── Resident login (standpost/password) ───────────────────────
  function isStrongPassword(value) {
    return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
  }

  async function handleResidentLogin({ householdId, password, confirmPassword }) {
    if (USE_API) {
      try {
        const result = await residentLogin({ householdId, password, confirmPassword });
        if (result.success) {
          setActiveResidentId(householdId);
          setResidentAuthenticated(true);
          setResidentPage("dashboard");
          await loadFromAPI(true); // refresh so the newly-set password flag etc. show up
        }
        return result;
      } catch (err) {
        return { success: false, message: err.message };
      }
    }

    const household = households.find((h) => h.id === householdId);
    if (!household) {
      return { success: false, message: "Select your standpost before logging in." };
    }

    const isNewPassword = !household.password;
    if (isNewPassword) {
      if (!isStrongPassword(password)) {
        return {
          success: false,
          message: "Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.",
        };
      }
      if (password !== confirmPassword) {
        return { success: false, message: "Passwords do not match." };
      }
      setHouseholds((prev) => prev.map((h) => (h.id === householdId ? { ...h, password } : h)));
    }

    if (!isNewPassword && household.password !== password) {
      return { success: false, message: "Invalid password for this standpost." };
    }

    setActiveResidentId(householdId);
    setResidentAuthenticated(true);
    setResidentPage("dashboard");
    return { success: true };
  }

  // ── Resident login via Google ──────────────────────────────────
  // credential = the verified ID token string from Google's Sign-In button.
  // Only available when USE_API is true, since verifying a Google token
  // requires the backend (mock mode has no way to validate it).
  async function handleResidentGoogleLogin({ householdId, credential }) {
    if (!USE_API) {
      return {
        success: false,
        message: "Google Sign-In requires the backend to be running. Connect to the API first.",
      };
    }
    try {
      const result = await residentGoogleLogin({ householdId, credential });
      if (result.success) {
        setActiveResidentId(householdId);
        setResidentAuthenticated(true);
        setResidentPage("dashboard");
        await loadFromAPI(true);
      }
      return result;
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  function handleResidentLogout() {
    if (USE_API) residentLogout();
    setResidentAuthenticated(false);
    setResidentPage("login");
  }

  // ── Resident profile edits ──────────────────────────────────
  async function handleUpdateProfile(householdId, updates) {
    if (USE_API) {
      try {
        await updateResidentProfile(householdId, updates);
      } catch (err) {
        return { success: false, message: err.message };
      }
    }
    setHouseholds((prev) =>
      prev.map((h) => (h.id === householdId ? { ...h, ...updates } : h))
    );
    return { success: true };
  }

  async function handleResetResidentPassword(householdId) {
    if (USE_API) {
      try {
        await resetResidentPassword(householdId);
        await loadFromAPI(true);
        showToast(`${householdId} password reset — resident must set a new one on next login.`, "info");
      } catch (err) {
        showToast("Could not reset password: " + err.message, "warn");
      }
      return;
    }
    setHouseholds((prev) => prev.map((h) => (h.id === householdId ? { ...h, password: null } : h)));
    showToast(`${householdId} password reset — resident must set a new one on next login.`, "info");
  }

  async function handleAddHousehold(payload) {
    if (!USE_API) {
      return { success: false, message: "Adding households requires the backend to be running." };
    }
    try {
      const result = await createHousehold(payload);
      await loadFromAPI(true);
      showToast(`Household ${result.id} connected.`, "success");
      return { success: true, id: result.id };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async function handleGenerateBills(period) {
    if (!USE_API) {
      showToast("Bill generation requires the backend to be running.", "warn");
      return;
    }
    try {
      const result = await generateBills(period);
      await loadFromAPI(true);
      showToast(
        `Generated ${result.created} bill(s) for ${period}` +
          (result.skipped ? ` — ${result.skipped} household(s) already billed for this period.` : "."),
        "success"
      );
    } catch (err) {
      showToast("Could not generate bills: " + err.message, "warn");
    }
  }

  // ── Mark paid ────────────────────────────────────────────────
  async function markPaid(id, paymentMethod = "Offline", paymentStamp) {
    if (USE_API) {
      try {
        const household = households.find((h) => h.id === id);
        if (!household?.bill_id) throw new Error("No bill found for this household.");
        await recordCash(household.bill_id, household.totalDue);
        await loadFromAPI(true); // refresh from backend
        showToast("Payment recorded.", "success");
      } catch (err) {
        showToast("Payment error: " + err.message, "warn");
      }
      return;
    }

    // Mock path
    setHouseholds((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, paymentStatus: "Paid", paymentMethod, paymentStamp: paymentStamp || h.paymentStamp }
          : h
      )
    );
  }

  async function receiveGcashPayment(id) {
    if (USE_API) {
      try {
        const household = households.find((h) => h.id === id);
        if (!household?.bill_id) throw new Error("No bill found for this household.");
        await confirmGcash(household.bill_id);
        await loadFromAPI(true); // refresh from backend
        showToast(`${id} GCash payment received and confirmed`, "success");
      } catch (err) {
        showToast("GCash confirmation error: " + err.message, "warn");
      }
      return;
    }

    // Mock path
    setHouseholds((prev) =>
      prev.map((h) =>
        h.id === id && h.paymentStatus === "GCash Pending"
          ? { ...h, paymentStatus: "Paid" }
          : h
      )
    );
    showToast(`${id} GCash payment received and confirmed`, "success");
  }

  async function resolveAlert(id) {
    if (USE_API) {
      try {
        await resolveAlertApi(id);
      } catch (err) {
        showToast("Could not resolve alert: " + err.message, "warn");
        return;
      }
    }
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Resolved" } : a)));
    showToast("Alert marked as resolved", "success");
  }

  // ── GCash payment ────────────────────────────────────────────
  function startGcashPayment(id) {
    setPaymentModal(id);
    setPaymentStep("confirm");
  }

  async function confirmGcashPayment() {
    setPaymentStep("processing");

    if (USE_API) {
      try {
        const household = households.find((h) => h.id === paymentModal);
        if (!household?.bill_id) throw new Error("No bill found.");
        const result = await initiateGcash(household.bill_id);
        if (result.checkout_url) {
          // Real PayMongo integration would redirect here; actual confirmation
          // arrives via webhook, so just reset the modal.
          window.open(result.checkout_url, "_blank");
          setPaymentStep("confirm");
          setPaymentModal(null);
          showToast("Redirected to GCash payment page.", "info");
        } else {
          // This backend mocks GCash (no real payment gateway configured) —
          // the bill is already marked "GCash Pending"; show a pending-
          // confirmation receipt instead of a real payment redirect.
          const receipt = {
            ref: result.ref,
            date: new Date().toLocaleString("en-PH", {
              month: "short", day: "numeric", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            }),
            method: "GCash",
          };
          await loadFromAPI(true);
          setPaymentStep("success");
          setPaymentReceipt(receipt);
          showToast("GCash payment initiated — pending admin confirmation.", "info");
        }
      } catch (err) {
        setPaymentStep("confirm");
        showToast("GCash error: " + err.message, "warn");
      }
      return;
    }

    // Mock path: Set status to "GCash Pending" and wait for admin to confirm
    setTimeout(() => {
      const receipt = {
        ref: `GC${Date.now().toString().slice(-8)}`,
        date: new Date().toLocaleString("en-PH", {
          month: "short", day: "numeric", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }),
        method: "GCash",
      };
      
      setHouseholds((prev) =>
        prev.map((h) =>
          h.id === paymentModal
            ? { ...h, paymentStatus: "GCash Pending", paymentMethod: "GCash", paymentStamp: receipt }
            : h
        )
      );
      
      setPaymentStep("success");
      setPaymentReceipt(receipt);
      showToast("GCash payment initiated - Pending admin confirmation", "info");
    }, 1500);
  }

  const totalCollected = households
    .filter((h) => h.paymentStatus === "Paid")
    .reduce((s, h) => s + h.totalDue, 0);
  const unpaidCount = households.filter((h) => h.paymentStatus === "Unpaid" || h.paymentStatus === "GCash Pending").length;
  const billsGenerated = households.length;

  if (loading) {
    return (
      <div className="w-full min-h-[700px] bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-sky-600 border-t-transparent rounded-full animate-spin" />
          Connecting to backend…
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[700px] bg-slate-50 text-slate-800" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
      `}</style>

      {view === "admin" ? (
        <AdminView
          households={households}
          alerts={alerts}
          totalCollected={totalCollected}
          unpaidCount={unpaidCount}
          billsGenerated={billsGenerated}
          page={adminPage}
          setPage={setAdminPage}
          adminAuthenticated={adminAuthenticated}
          onAdminLogin={handleAdminLogin}
          onAdminLogout={handleAdminLogout}
          adminEmail={adminEmail}
          markPaid={markPaid}
          receiveGcashPayment={receiveGcashPayment}
          showToast={showToast}
          alertFilter={alertFilter}
          setAlertFilter={setAlertFilter}
          selectedAlertId={selectedAlertId}
          setSelectedAlertId={setSelectedAlertId}
          resolveAlert={resolveAlert}
          onResetResidentPassword={handleResetResidentPassword}
          onGenerateBills={handleGenerateBills}
          onAddHousehold={handleAddHousehold}
        />
      ) : (
        <ResidentView
          households={households}
          activeId={activeResidentId || (households[0]?.id ?? null)}
          setActiveId={setActiveResidentId}
          page={residentPage}
          setPage={setResidentPage}
          residentAuthenticated={residentAuthenticated}
          onResidentLogin={handleResidentLogin}
          onResidentGoogleLogin={handleResidentGoogleLogin}
          onResidentLogout={handleResidentLogout}
          residentLoginHouseholdId={residentLoginHouseholdId}
          onResidentLoginHouseholdSelect={setResidentLoginHouseholdId}
          startGcashPayment={startGcashPayment}
          onUpdateProfile={handleUpdateProfile}
          useApi={USE_API}
        />
      )}

      {paymentModal && (
        <GcashModal
          household={households.find((h) => h.id === paymentModal)}
          step={paymentStep}
          receipt={paymentReceipt}
          onConfirm={confirmGcashPayment}
          onClose={() => {
            setPaymentModal(null);
            setPaymentStep("confirm");
            setPaymentReceipt(null);
          }}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}