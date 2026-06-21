import { NextRequest, NextResponse } from "next/server";
import { readContent, writeContent } from "@/lib/store";
import { SiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await readContent();
  return NextResponse.json(content);
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as SiteContent;
    if (!body || typeof body !== "object" || !Array.isArray(body.works) || !Array.isArray(body.collaborators)) {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    await writeContent(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
