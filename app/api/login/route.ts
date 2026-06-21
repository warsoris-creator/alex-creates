import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const ok = await verifyPassword(String(password ?? ""));
    return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
