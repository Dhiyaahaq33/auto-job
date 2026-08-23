import { NextRequest, NextResponse } from "next/server";
import { getRepoPublicKey, putSecret } from "@/lib/github";
import { encryptForGitHubSecret } from "@/lib/crypto";

// Whitelist ketat - dashboard cuma boleh nulis secret ini, bukan sembarang nama.
const ALLOWED_SECRETS = new Set([
  "NAMA",
  "EMAIL",
  "PASSWORD",
  "NO_HP",
  "LOKASI",
  "LINKEDIN_EMAIL",
  "LINKEDIN_PASS",
  "GLINTS_EMAIL",
  "GLINTS_PASS",
]);

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "body harus object" }, { status: 400 });
    }

    const entries = Object.entries(body as Record<string, unknown>);
    if (entries.length === 0) {
      return NextResponse.json({ error: "gak ada field yang dikirim" }, { status: 400 });
    }
    for (const [key, value] of entries) {
      if (!ALLOWED_SECRETS.has(key)) {
        return NextResponse.json({ error: `secret '${key}' tidak diizinkan diubah dari sini` }, { status: 400 });
      }
      if (typeof value !== "string" || value.length === 0) {
        return NextResponse.json({ error: `nilai untuk '${key}' harus string non-kosong` }, { status: 400 });
      }
    }

    const { key_id, key } = await getRepoPublicKey();

    for (const [name, value] of entries as [string, string][]) {
      const encrypted = await encryptForGitHubSecret(key, value);
      await putSecret(name, encrypted, key_id);
    }

    return NextResponse.json({ ok: true, updated: entries.map(([k]) => k) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
