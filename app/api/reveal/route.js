import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { correct } = await req.json();
    if (![1, 2, 3].includes(correct)) {
      return NextResponse.json({ error: "Invalid correct" }, { status: 400 });
    }
    const state = await getState();
    if (state.phase !== "voting") {
      return NextResponse.json({ ok: false, reason: "not_voting" });
    }
    state.correct = correct;
    state.phase = "revealed";

    for (const [player, vote] of Object.entries(state.votes)) {
      if (!(player in state.scores)) state.scores[player] = 0;
      if (vote === correct) state.scores[player] += 1;
    }

    state.roundHistory.push({
      round: state.round,
      correct,
      votes: { ...state.votes },
    });

    await setState(state);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
