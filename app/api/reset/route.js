import { NextResponse } from "next/server";
import { setState, defaultState } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const fresh = defaultState();
    await setState(fresh);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
