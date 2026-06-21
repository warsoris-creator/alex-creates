import { promises as fs } from "fs";
import path from "path";

// The admin password lives in data/admin.json on the server ONLY. It is never
// shipped to the client, so it cannot be extracted from the site without direct
// server access. Change it by editing that file:  { "password": "your-pass" }.
const dataDir = path.join(process.cwd(), "data");
const file = path.join(dataDir, "admin.json");
const DEFAULT_PASSWORD = "alex-creates-2026";

async function getPassword(): Promise<string> {
  try {
    const j = JSON.parse(await fs.readFile(file, "utf8"));
    if (typeof j.password === "string" && j.password) return j.password;
  } catch {
    // Not created yet — seed with the default.
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(file, JSON.stringify({ password: DEFAULT_PASSWORD }, null, 2), "utf8").catch(() => {});
  }
  return DEFAULT_PASSWORD;
}

export async function verifyPassword(input: string): Promise<boolean> {
  const pass = await getPassword();
  // constant-time-ish compare
  if (input.length !== pass.length) return false;
  let diff = 0;
  for (let i = 0; i < pass.length; i++) diff |= input.charCodeAt(i) ^ pass.charCodeAt(i);
  return diff === 0;
}
