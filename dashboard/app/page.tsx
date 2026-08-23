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

interface AppliedJob {
  platform: string;
  title: string;
  url: string;
  applied_at: string;
}

interface TrackerData {
  applied?: Record<string, AppliedJob>;
  total_hari_ini?: number;
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

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="rounded-md border p-6"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {children}
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg tracking-tight text-[var(--foreground)]">{children}</h2>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded border bg-transparent px-3 py-2 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]";

function StatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  let label = status;
  let color = "var(--muted)";
  let bg = "rgba(255,255,255,0.06)";
  if (status === "completed") {
    if (conclusion === "success") {
      label = "sukses";
      color = "var(--success)";
      bg = "var(--success-bg)";
    } else if (conclusion === "failure") {
      label = "gagal";
      color = "var(--danger)";
      bg = "var(--danger-bg)";
    } else {
      label = conclusion || "selesai";
      color = "var(--info)";
      bg = "var(--info-bg)";
    }
  } else if (status === "in_progress" || status === "queued") {
    label = status === "queued" ? "antre" : "berjalan";
    color = "var(--info)";
    bg = "var(--info-bg)";
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide"
      style={{ color, background: bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

const PLATFORM_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  jobstreet: "Jobstreet",
  glints: "Glints",
};

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
    setConfigMsg(res.ok ? "Tersimpan" : `Error: ${data.error}`);
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

  const appliedEntries = status?.tracker?.applied
    ? Object.entries(status.tracker.applied).sort(
        (a, b) => new Date(b[1].applied_at).getTime() - new Date(a[1].applied_at).getTime()
      )
    : [];

  return (
    <div className="min-h-screen px-4 py-10" style={{ color: "var(--foreground)" }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-end justify-between border-b pb-6" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="font-display text-2xl italic tracking-tight">Auto Job Apply</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--muted-2)]">
              Dhiyaahaq33 / auto-job · Panel Kendali
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded border px-3.5 py-1.5 text-xs uppercase tracking-wide text-[var(--muted)] transition hover:text-[var(--foreground)]"
            style={{ borderColor: "var(--border-strong)" }}
          >
            Keluar
          </button>
        </div>

        <div className="space-y-6">
          {/* Status & Run */}
          <SectionCard>
            <div className="mb-5 flex items-center justify-between">
              <SectionTitle>Status Operasional</SectionTitle>
              <button
                onClick={handleRunNow}
                disabled={running}
                className="rounded px-4 py-2 text-xs font-medium uppercase tracking-wide transition disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {running ? "Memicu…" : "Jalankan Sekarang"}
              </button>
            </div>

            {statusError && (
              <p className="mb-4 rounded border px-3 py-2 text-xs" style={{ borderColor: "var(--danger)", background: "var(--danger-bg)", color: "var(--danger)" }}>
                {statusError}
              </p>
            )}

            {status && (
              <>
                <div className="mb-5 flex items-baseline gap-2">
                  <span className="font-display text-3xl">{appliedEntries.length}</span>
                  <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                    lamaran tercatat
                  </span>
                </div>

                <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  Riwayat Eksekusi
                </p>
                <ul className="mb-6 divide-y" style={{ borderColor: "var(--border)" }}>
                  {status.runs.slice(0, 5).map((run) => (
                    <li key={run.id} className="flex items-center justify-between border-t py-2.5 text-sm first:border-t-0" style={{ borderColor: "var(--border)" }}>
                      <div>
                        <a href={run.html_url} target="_blank" rel="noreferrer" className="text-[var(--foreground)] hover:text-[var(--accent)]">
                          Eksekusi #{run.id}
                        </a>
                        <span className="ml-2 text-xs text-[var(--muted-2)]">
                          {new Date(run.created_at).toLocaleString("id-ID")} · {run.event === "schedule" ? "terjadwal" : "manual"}
                        </span>
                      </div>
                      <StatusBadge status={run.status} conclusion={run.conclusion} />
                    </li>
                  ))}
                </ul>

                {appliedEntries.length > 0 && (
                  <>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                      Lamaran Terkirim
                    </p>
                    <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                      {appliedEntries.slice(0, 8).map(([id, job]) => (
                        <li key={id} className="flex items-center justify-between border-t py-2.5 text-sm first:border-t-0" style={{ borderColor: "var(--border)" }}>
                          <div className="min-w-0 pr-4">
                            {job.url ? (
                              <a href={job.url} target="_blank" rel="noreferrer" className="block truncate text-[var(--foreground)] hover:text-[var(--accent)]">
                                {job.title}
                              </a>
                            ) : (
                              <span className="block truncate">{job.title}</span>
                            )}
                            <span className="text-xs text-[var(--muted-2)]">
                              {new Date(job.applied_at).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px]" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                            {PLATFORM_LABEL[job.platform] || job.platform}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </SectionCard>

          {/* Config */}
          {config && (
            <form onSubmit={handleSaveConfig}>
              <SectionCard>
                <SectionTitle>Kriteria Pencarian</SectionTitle>
                <div className="mt-5 space-y-4">
                  <div>
                    <FieldLabel>Kata Kunci</FieldLabel>
                    <input
                      value={configText.kata_kunci}
                      onChange={(e) => setConfigText((s) => ({ ...s, kata_kunci: e.target.value }))}
                      className={inputClass}
                      style={{ borderColor: "var(--border-strong)" }}
                    />
                  </div>

                  <div>
                    <FieldLabel>Lokasi Kerja</FieldLabel>
                    <input
                      value={configText.lokasi_kerja}
                      onChange={(e) => setConfigText((s) => ({ ...s, lokasi_kerja: e.target.value }))}
                      className={inputClass}
                      style={{ borderColor: "var(--border-strong)" }}
                    />
                  </div>

                  <div>
                    <FieldLabel>Tipe Kerja</FieldLabel>
                    <input
                      value={configText.tipe_kerja}
                      onChange={(e) => setConfigText((s) => ({ ...s, tipe_kerja: e.target.value }))}
                      className={inputClass}
                      style={{ borderColor: "var(--border-strong)" }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Gaji Minimum (Rp)</FieldLabel>
                      <input
                        type="number"
                        value={config.gaji_min}
                        onChange={(e) => setConfig({ ...config, gaji_min: Number(e.target.value) })}
                        className={inputClass}
                        style={{ borderColor: "var(--border-strong)" }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Batas Apply / Hari</FieldLabel>
                      <input
                        type="number"
                        value={config.max_apply_per_hari}
                        onChange={(e) => setConfig({ ...config, max_apply_per_hari: Number(e.target.value) })}
                        className={inputClass}
                        style={{ borderColor: "var(--border-strong)" }}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Jam Mulai (WIB)</FieldLabel>
                    <input
                      value={config.jam_mulai}
                      onChange={(e) => setConfig({ ...config, jam_mulai: e.target.value })}
                      className={inputClass}
                      style={{ borderColor: "var(--border-strong)" }}
                    />
                  </div>

                  <div>
                    <FieldLabel>Platform Aktif</FieldLabel>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {([
                        ["aktifkan_linkedin", "LinkedIn"],
                        ["aktifkan_jobstreet", "Jobstreet"],
                        ["aktifkan_glints", "Glints"],
                        ["aktifkan_indeed", "Indeed"],
                      ] as const).map(([key, label]) => {
                        const disabled = key === "aktifkan_indeed";
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
                            style={{
                              borderColor: config[key] ? "var(--accent)" : "var(--border-strong)",
                              background: config[key] ? "var(--accent-soft)" : "transparent",
                              opacity: disabled ? 0.5 : 1,
                            }}
                          >
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={config[key]}
                              onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-xs text-[var(--muted-2)]">
                      Indeed nonaktif permanen — akun memakai autentikasi tanpa kata sandi (passkey/OTP).
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={savingConfig}
                      className="rounded px-4 py-2 text-xs font-medium uppercase tracking-wide transition disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                    >
                      {savingConfig ? "Menyimpan…" : "Simpan Kriteria"}
                    </button>
                    {configMsg && <span className="text-xs text-[var(--muted)]">{configMsg}</span>}
                  </div>
                </div>
              </SectionCard>
            </form>
          )}

          {/* Credentials */}
          <form onSubmit={handleSaveCreds}>
            <SectionCard>
              <SectionTitle>Kredensial</SectionTitle>
              <p className="mt-1.5 mb-5 text-xs text-[var(--muted-2)]">
                Kosongkan kolom yang tidak ingin diubah. Tersimpan sebagai GitHub Secret terenkripsi.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {["NAMA", "EMAIL", "PASSWORD", "NO_HP", "LOKASI", "LINKEDIN_EMAIL", "LINKEDIN_PASS", "GLINTS_EMAIL", "GLINTS_PASS"].map(
                  (field) => (
                    <div key={field}>
                      <FieldLabel>{field.replace(/_/g, " ")}</FieldLabel>
                      <input
                        type={field.includes("PASS") ? "password" : "text"}
                        value={creds[field] || ""}
                        onChange={(e) => setCreds((s) => ({ ...s, [field]: e.target.value }))}
                        className={inputClass}
                        style={{ borderColor: "var(--border-strong)" }}
                      />
                    </div>
                  )
                )}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingCreds}
                  className="rounded px-4 py-2 text-xs font-medium uppercase tracking-wide transition disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  {savingCreds ? "Menyimpan…" : "Perbarui Kredensial"}
                </button>
                {credsMsg && <span className="text-xs text-[var(--muted)]">{credsMsg}</span>}
              </div>
            </SectionCard>
          </form>
        </div>

        <p className="mt-10 text-center text-[11px] text-[var(--muted-2)]">
          D:\BOT\AUTO JOB — dijalankan via GitHub Actions, dikendalikan dari sini.
        </p>
      </div>
    </div>
  );
}
