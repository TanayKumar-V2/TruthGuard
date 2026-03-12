import { NextRequest, NextResponse } from "next/server";
import { analyzeSubmission } from "@/lib/analyzer";
import { AnalyzeRequest } from "@/lib/analysis-types";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count += 1;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429 },
      );
    }

    const body = (await request.json()) as AnalyzeRequest;
    const text = (body?.text || "").trim();
    const url = (body?.url || "").trim();

    if (!text && !url) {
      return NextResponse.json(
        { error: "Please provide text or a URL for analysis." },
        { status: 400 },
      );
    }

    const analysis = await analyzeSubmission({ text, url });
    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json(
      { error: "Unable to analyze content right now. Please try again." },
      { status: 500 },
    );
  }
}
