// /app/api/proof/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, language } = await req.json();

    const endpoint =
      process.env.LT_ENDPOINT || "https://api.languagetool.org/v2/check";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        text,
        language: language || "en-GB",
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      return NextResponse.json(
        { error: `LanguageTool error: ${msg}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
