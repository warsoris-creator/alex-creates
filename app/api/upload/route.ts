import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Real file upload to disk. Saves into public/uploads/ (served statically) and
// returns the public URL. Used for both videos and images.
const uploadDir = path.join(process.cwd(), "public", "uploads");
const allowed = /^(video|image)\//;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (!allowed.test(file.type)) {
      return NextResponse.json({ error: "Only image or video files" }, { status: 415 });
    }
    const extFromName = path.extname(file.name).toLowerCase();
    const ext = extFromName || "." + (file.type.split("/")[1] || "bin");
    const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    await fs.mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, name), buffer);
    return NextResponse.json({ url: `/uploads/${name}` });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
