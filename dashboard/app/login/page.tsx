"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login gagal");
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl italic tracking-tight text-[var(--foreground)]">
            Auto Job Apply
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--muted-2)]">
            Panel Kendali
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-md border p-7 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <label className="mb-2 block text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">
            Kata Sandi
          </label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mb-4 w-full rounded border bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]"
            style={{ borderColor: "var(--border-strong)" }}
          />

          {error && (
            <p className="mb-4 rounded border px-3 py-2 text-xs" style={{ borderColor: "var(--danger)", background: "var(--danger-bg)", color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded py-2.5 text-sm font-medium tracking-wide transition disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {loading ? "Memproses…" : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-[var(--muted-2)]">
          Dhiyaahaq33 / auto-job
        </p>
      </div>
    </div>
  );
}
