import { NextResponse } from "next/server";
import { triggerWorkflow } from "@/lib/github";

export async function POST() {
  try {
    await triggerWorkflow();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
