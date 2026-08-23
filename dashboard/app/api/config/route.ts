import { NextRequest, NextResponse } from "next/server";
import { getFileContent, updateFileContent } from "@/lib/github";

const CONFIG_PATH = "config.json";

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

function validate(body: unknown): { ok: true; value: BotConfig } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "body harus object" };
  const b = body as Record<string, unknown>;

  const strArr = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");
  if (!strArr(b.kata_kunci)) return { ok: false, error: "kata_kunci harus array of string" };
  if (!strArr(b.tipe_kerja)) return { ok: false, error: "tipe_kerja harus array of string" };
  if (!strArr(b.lokasi_kerja)) return { ok: false, error: "lokasi_kerja harus array of string" };
  if (typeof b.gaji_min !== "number" || b.gaji_min < 0) return { ok: false, error: "gaji_min harus angka >= 0" };
  if (typeof b.max_apply_per_hari !== "number" || b.max_apply_per_hari < 1 || b.max_apply_per_hari > 200)
    return { ok: false, error: "max_apply_per_hari harus 1-200" };
  if (typeof b.jam_mulai !== "string" || !/^\d{2}:\d{2}$/.test(b.jam_mulai))
    return { ok: false, error: "jam_mulai harus format HH:MM" };
  for (const key of ["aktifkan_linkedin", "aktifkan_indeed", "aktifkan_jobstreet", "aktifkan_glints", "aktifkan_kalibrr"]) {
    if (typeof b[key] !== "boolean") return { ok: false, error: `${key} harus boolean` };
  }

  return {
    ok: true,
    value: {
      kata_kunci: b.kata_kunci as string[],
      tipe_kerja: b.tipe_kerja as string[],
      gaji_min: b.gaji_min as number,
      lokasi_kerja: b.lokasi_kerja as string[],
      max_apply_per_hari: b.max_apply_per_hari as number,
      jam_mulai: b.jam_mulai as string,
      aktifkan_linkedin: b.aktifkan_linkedin as boolean,
      aktifkan_indeed: b.aktifkan_indeed as boolean,
      aktifkan_jobstreet: b.aktifkan_jobstreet as boolean,
      aktifkan_glints: b.aktifkan_glints as boolean,
      aktifkan_kalibrr: b.aktifkan_kalibrr as boolean,
    },
  };
}

export async function GET() {
  try {
    const { content } = await getFileContent(CONFIG_PATH);
    return NextResponse.json(JSON.parse(content));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const result = validate(body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    const { sha } = await getFileContent(CONFIG_PATH);
    const newContent = JSON.stringify(result.value, null, 2) + "\n";
    await updateFileContent(CONFIG_PATH, newContent, "chore: update bot config via dashboard", sha);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
