"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RunItem {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
  event: string;
}

interface TrackerData {
  [key: string]: unknown;
}

interface StatusResponse {
  runs: RunItem[];
  tracker: TrackerData | null;
  error?: string;
}

interface BotConfig {
  kata_kunci: string[];
  tipe_kerja: string[];
  gaji_min: number;
  lokasi_kerja: string[];
  max_apply_per_hari: number;
  jam_mulai: string;
  aktifkan_linkedin: boolean;
  aktifkan_indeed: boolean;
  aktifkan_jobstreet: boolean;
  aktifkan_glints: boolean;
  aktifkan_kalibrr: boolean;
}

function StatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  let label = status;
  let color = "bg-neutral-700 text-neutral-200";
  if (status === "completed") {
    if (conclusion === "success") {
      label = "sukses";
      color = "bg-green-900 text-green-300";
    } else if (conclusion === "failure") {
      label = "gagal";
      color = "bg-red-900 text-red-300";
    } else {
      label = conclusion || "selesai";
      color = "bg-yellow-900 text-yellow-300";
    }
  } else if (status === "in_progress" || status === "queued") {
    label = status === "queued" ? "antre" : "jalan...";
    color = "bg-blue-900 text-blue-300";
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState("");
  const [running, setRunning] = useState(false);

  const [config, setConfig] = useState<BotConfig | null>(null);
  const [configText, setConfigText] = useState({ kata_kunci: "", tipe_kerja: "", lokasi_kerja: "" });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState("");

  const [creds, setCreds] = useState<Record<string, string>>({});
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsMsg, setCredsMsg] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "gagal load status");
      setStatus(data);
      setStatusError("");
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "error");
    }
  }, []);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/config");
    const data = await res.json();
    if (res.ok) {
      setConfig(data);
      setConfigText({
        kata_kunci: data.kata_kunci.join(", "),
        tipe_kerja: data.tipe_kerja.join(", "),
        lokasi_kerja: data.lokasi_kerja.join(", "),
      });
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadConfig();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus, loadConfig]);

  async function handleRunNow() {
    setRunning(true);
    await fetch("/api/run", { method: "POST" });
    setTimeout(loadStatus, 3000);
    setRunning(false);
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSavingConfig(true);
    setConfigMsg("");
    const payload: BotConfig = {
      ...config,
      kata_kunci: configText.kata_kunci.split(",").map((s) => s.trim()).filter(Boolean),
      tipe_kerja: configText.tipe_kerja.split(",").map((s) => s.trim()).filter(Boolean),
      lokasi_kerja: configText.lokasi_kerja.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSavingConfig(false);
    setConfigMsg(res.ok ? "Tersimpan ✓" : `Error: ${data.error}`);
    if (res.ok) setConfig(payload);
  }

  async function handleSaveCreds(e: React.FormEvent) {
    e.preventDefault();
    const filled = Object.fromEntries(Object.entries(creds).filter(([, v]) => v.trim() !== ""));
    if (Object.keys(filled).length === 0) {
      setCredsMsg("Isi minimal 1 field buat diupdate");
      return;
    }
    setSavingCreds(true);
    setCredsMsg("");
    const res = await fetch("/api/secrets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filled),
    });
    const data = await res.json();
    setSavingCreds(false);
    setCredsMsg(res.ok ? `Tersimpan: ${data.updated.join(", ")}` : `Error: ${data.error}`);
    if (res.ok) setCreds({});
  }

  const appliedCount =
    status?.tracker && typeof status.tracker === "object"
      ? Object.keys(status.tracker).length
      : 0;

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Auto Job Apply — Dashboard</h1>
            <p className="text-sm text-neutral-400">D:\BOT\AUTO JOB · repo Dhiyaahaq33/auto-job</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
          >
            Keluar
          </button>
        </div>

        {/* Status & Run */}
        <section className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Status Bot</h2>
            <button
              onClick={handleRunNow}
              disabled={running}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
            >
              {running ? "Memicu..." : "Run Now"}
            </button>
          </div>

          {statusError && <p className="text-sm text-red-400">{statusError}</p>}

          {status && (
            <>
              <p className="mb-3 text-sm text-neutral-400">
                Total lamaran tercatat: <span className="text-neutral-200">{appliedCount}</span>
              </p>
              <ul className="space-y-2">
                {status.runs.slice(0, 5).map((run) => (
                  <li
                    key={run.id}
                    className="flex items-center justify-between rounded-md border border-neutral-800 px-3 py-2 text-sm"
                  >
                    <div>
                      <a href={run.html_url} target="_blank" rel="noreferrer" className="hover:underline">
                        Run #{run.id}
                      </a>
                      <span className="ml-2 text-neutral-500">
                        {new Date(run.created_at).toLocaleString("id-ID")} · {run.event}
                      </span>
                    </div>
                    <StatusBadge status={run.status} conclusion={run.conclusion} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Config */}
        {config && (
          <form onSubmit={handleSaveConfig} className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <h2 className="mb-4 font-medium">Konfigurasi Pencarian</h2>

            <label className="mb-1 block text-xs text-neutral-400">Kata kunci (pisah koma)</label>
            <input
              value={configText.kata_kunci}
              onChange={(e) => setConfigText((s) => ({ ...s, kata_kunci: e.target.value }))}
              className="mb-3 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
            />

            <label className="mb-1 block text-xs text-neutral-400">Lokasi kerja (pisah koma)</label>
            <input
              value={configText.lokasi_kerja}
              onChange={(e) => setConfigText((s) => ({ ...s, lokasi_kerja: e.target.value }))}
              className="mb-3 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
            />

            <label className="mb-1 block text-xs text-neutral-400">Tipe kerja (pisah koma)</label>
            <input
              value={configText.tipe_kerja}
              onChange={(e) => setConfigText((s) => ({ ...s, tipe_kerja: e.target.value }))}
              className="mb-3 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
            />

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-400">Gaji minimum (Rp)</label>
                <input
                  type="number"
                  value={config.gaji_min}
                  onChange={(e) => setConfig({ ...config, gaji_min: Number(e.target.value) })}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-400">Batas apply/hari</label>
                <input
                  type="number"
                  value={config.max_apply_per_hari}
                  onChange={(e) => setConfig({ ...config, max_apply_per_hari: Number(e.target.value) })}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <label className="mb-1 block text-xs text-neutral-400">Jam mulai (WIB, HH:MM)</label>
            <input
              value={config.jam_mulai}
              onChange={(e) => setConfig({ ...config, jam_mulai: e.target.value })}
              className="mb-4 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
            />

            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              {([
                ["aktifkan_linkedin", "LinkedIn"],
                ["aktifkan_indeed", "Indeed"],
                ["aktifkan_jobstreet", "Jobstreet"],
                ["aktifkan_glints", "Glints"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config[key]}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                  />
                  {label}
                  {key === "aktifkan_indeed" && (
                    <span className="text-xs text-neutral-500">(passwordless, gak bisa diotomasi)</span>
                  )}
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingConfig}
                className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
              >
                {savingConfig ? "Menyimpan..." : "Simpan Config"}
              </button>
              {configMsg && <span className="text-sm text-neutral-400">{configMsg}</span>}
            </div>
          </form>
        )}

        {/* Credentials */}
        <form onSubmit={handleSaveCreds} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-1 font-medium">Kredensial</h2>
          <p className="mb-4 text-xs text-neutral-500">
            Kosongin field yang gak mau diubah. Tersimpan langsung sebagai GitHub Secret terenkripsi.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {["NAMA", "EMAIL", "PASSWORD", "NO_HP", "LOKASI", "LINKEDIN_EMAIL", "LINKEDIN_PASS", "GLINTS_EMAIL", "GLINTS_PASS"].map(
              (field) => (
                <div key={field}>
                  <label className="mb-1 block text-xs text-neutral-400">{field}</label>
                  <input
                    type={field.includes("PASS") ? "password" : "text"}
                    value={creds[field] || ""}
                    onChange={(e) => setCreds((s) => ({ ...s, [field]: e.target.value }))}
                    className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                  />
                </div>
              )
            )}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={savingCreds}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
            >
              {savingCreds ? "Menyimpan..." : "Update Kredensial"}
            </button>
            {credsMsg && <span className="text-sm text-neutral-400">{credsMsg}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
