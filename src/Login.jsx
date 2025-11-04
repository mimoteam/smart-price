import { useEffect, useState, useRef } from "react";
import SmartPriceGenerator from "./SmartPriceGenerator.jsx";
import Login from "./Login.jsx";

const AUTH_KEY = "mimo_sales_auth";
const LAST_ACTIVITY_KEY = "mimo_sales_last_activity";
const IDLE_MS = 60 * 60 * 1000; // 1h

export default function App() {
  const [authed, setAuthed] = useState(
    typeof window !== "undefined" && localStorage.getItem(AUTH_KEY) === "1"
  );
  const idleTimer = useRef(null);

  function markActivity() {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    resetIdleTimer();
  }

  function resetIdleTimer() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => logout(true), IDLE_MS);
  }

  function handleSuccess() {
    localStorage.setItem(AUTH_KEY, "1");
    markActivity();
    setAuthed(true);
  }

  function logout(isIdle = false) {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setAuthed(false);
    if (isIdle) alert("Session expired due to inactivity (1 hour).");
  }

  // configura listeners de atividade quando autenticado
  useEffect(() => {
    if (!authed) return;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handler = () => markActivity();
    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
    // checa se já expirou quando recarrega
    const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || "0");
    if (!last || Date.now() - last > IDLE_MS) {
      logout(true);
    } else {
      resetIdleTimer();
    }
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [authed]);

  if (!authed) return <Login onSuccess={handleSuccess} />;

  return (
    <>
      <button
        onClick={() => logout(false)}
        className="fixed right-3 top-3 rounded-xl border border-slate-300 bg-white/90 px-3 py-1 text-sm font-medium text-slate-700 shadow hover:bg-white"
        title="Logout"
      >
        Logout
      </button>
      <SmartPriceGenerator />
    </>
  );
}
