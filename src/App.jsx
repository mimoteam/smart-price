import React, { useEffect, useMemo, useState } from "react";
import SmartPriceGenerator from "./SmartPriceGenerator";
import "./index.css";

const AUTH_KEY = "MIMO_SALES_AUTH";
const USER_OK = "sales";
const PASS_OK = "Disney2026!!";
const IDLE_MS = 60 * 60 * 1000; // 1 hora

function LoginForm({ onSuccess }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    if (user === USER_OK && pass === PASS_OK) {
      const payload = {
        u: user,
        t: Date.now(),
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
      onSuccess();
    } else {
      setErr("Invalid credentials.");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-sky-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1">MIMO SALES — Login</h1>
        <p className="text-sm text-slate-600 mb-6">
          Restricted access to the pricing generator.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Login</label>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {err && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {err}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);

  // valida sessão ao carregar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj?.t && Date.now() - obj.t < IDLE_MS) {
        setAuthed(true);
      } else {
        localStorage.removeItem(AUTH_KEY);
      }
    } catch {
      localStorage.removeItem(AUTH_KEY);
    }
  }, []);

  // logout automático por inatividade
  useEffect(() => {
    if (!authed) return;
    const bump = () => {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      obj.t = Date.now();
      localStorage.setItem(AUTH_KEY, JSON.stringify(obj));
    };

    let idleTimer = setTimeout(() => {
      localStorage.removeItem(AUTH_KEY);
      setAuthed(false);
    }, IDLE_MS);

    const onAny = () => {
      clearTimeout(idleTimer);
      bump();
      idleTimer = setTimeout(() => {
        localStorage.removeItem(AUTH_KEY);
        setAuthed(false);
      }, IDLE_MS);
    };

    window.addEventListener("mousemove", onAny);
    window.addEventListener("keydown", onAny);
    window.addEventListener("click", onAny);
    window.addEventListener("scroll", onAny);
    return () => {
      window.removeEventListener("mousemove", onAny);
      window.removeEventListener("keydown", onAny);
      window.removeEventListener("click", onAny);
      window.removeEventListener("scroll", onAny);
      clearTimeout(idleTimer);
    };
  }, [authed]);

  if (!authed) return <LoginForm onSuccess={() => setAuthed(true)} />;

  return <SmartPriceGenerator />;
}
