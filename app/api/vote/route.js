import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { deviceId, name, answer } = await req.json();
    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
    }
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }
    if (![1, 2, 3].includes(answer)) {
      return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
    }

    const state = await getState();
    if (state.phase !== "voting") {
      return NextResponse.json({ ok: false, reason: "not_voting" });
    }
    state.votes[deviceId] = answer;
    state.players[deviceId] = trimmed;
    if (!(deviceId in state.scores)) {
      state.scores[deviceId] = 0;
    }
    await setState(state);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
