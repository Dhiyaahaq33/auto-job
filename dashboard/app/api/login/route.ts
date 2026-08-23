import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_TTL_SECONDS, createSessionToken, timingSafeEqual } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }

  if (typeof password !== "string" || !timingSafeEqual(password, expected)) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
