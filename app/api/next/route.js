import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const state = await getState();

    if (state.phase === "waiting") {
      state.phase = "voting";
      state.correct = null;
      state.votes = {};
      await setState(state);
      return NextResponse.json({ ok: true });
    }

    if (state.phase === "revealed") {
      if (state.round >= 10) {
        state.phase = "finished";
        await setState(state);
        return NextResponse.json({ ok: true, finished: true });
      }
      state.round += 1;
      state.phase = "voting";
      state.correct = null;
      state.votes = {};
      await setState(state);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, reason: `phase_${state.phase}` });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
