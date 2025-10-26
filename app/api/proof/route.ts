// /app/api/proof/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // na Vercelu běží v Node runtime
export const dynamic = "force-dynamic";

type ReqBody = {
  text: string;
  language?: "en-GB" | "en-US";
};

// Volitelně můžeš nastavit vlastní LT endpoint (např. self-hosted) v .env:
// LT_ENDPOINT=https://api.languagetool.org/v2/check
const LT_ENDPOINT =
  process.env.LT_ENDPOINT?.trim() || "https://api.languagetool.org/v2/check";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    const text = (body.text || "").toString();
    const language = (body.language || "en-GB") as "en-GB" | "en-US";

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ matches: [] }, { status: 200 });
    }

    const form = new URLSearchParams();
    form.set("language", language);
    form.set("text", text);
    form.set("enabledOnly", "false");
    // Přísnější režim lze zapnout:
    // form.set("level", "picky");

    const resp = await fetch(LT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      // LT může být pomalejší, dejme delší timeout:
      // @ts-ignore
      next: { revalidate: 0 },
    });

    if (!resp.ok) {
      const msg = await resp.text();
      return NextResponse.json(
        { error: `LanguageTool error ${resp.status}: ${msg}` },
        { status: 502 }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
