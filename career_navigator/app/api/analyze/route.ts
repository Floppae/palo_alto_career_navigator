import { NextResponse } from "next/server";
import { runAnalysis } from "@/server/analyze";
import { validateInput } from "@/server/validate";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const validation = validateInput(body);
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });
  try {
    const result = await runAnalysis(validation.input);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong." }, { status: 500 });
  }
}
