"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Waves } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-ocean-800 to-ocean-950 text-ocean-200">
          Lädt…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo(
          "Konto erstellt! Falls E-Mail-Bestätigung aktiviert ist, prüfe dein Postfach. Danach kannst du dich anmelden.",
        );
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirect);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-ocean-800 to-ocean-950 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white/95 p-8 shadow-xl backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-ocean-600 text-white">
            <Waves size={30} />
          </div>
          <h1 className="text-2xl font-bold text-ocean-900">DivingLog</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "signin"
              ? "Melde dich an, um dein Logbuch zu öffnen"
              : "Erstelle dein persönliches Tauchlogbuch"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              E-Mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-200"
              placeholder="taucher@beispiel.ch"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Passwort
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-200"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ocean-600 py-2.5 text-sm font-semibold text-white transition hover:bg-ocean-700 disabled:opacity-60"
          >
            {loading
              ? "Bitte warten…"
              : mode === "signin"
                ? "Anmelden"
                : "Registrieren"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "signin" ? "Noch kein Konto?" : "Schon registriert?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="font-semibold text-ocean-600 hover:underline"
          >
            {mode === "signin" ? "Registrieren" : "Anmelden"}
          </button>
        </p>
      </div>
      <p className="mt-6 text-center text-xs text-ocean-200">
        Mobile-first Tauchlogbuch · Karte · Statistiken · Import/Export
      </p>
    </main>
  );
}
