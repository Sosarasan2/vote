"use client";

import { useEffect, useState } from "react";

export default function HostPage() {
  const [state, setState] = useState(null);
  const [selectedCorrect, setSelectedCorrect] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        setState(data);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (state?.phase !== "voting") setSelectedCorrect(null);
  }, [state?.phase, state?.round]);

  const call = async (path, body) => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const onNext = () => call("/api/next");
  const onReveal = () => {
    if (!selectedCorrect) return;
    call("/api/reveal", { correct: selectedCorrect });
  };
  const onReset = () => {
    if (confirm("Reset toàn bộ game về Round 1? Sẽ xóa tất cả điểm và vote.")) {
      call("/api/reset");
    }
  };

  if (!state) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-400">
        Đang tải...
      </main>
    );
  }

  const { round, phase, correct, votes = {}, scores = {} } = state;

  const tally = { 1: [], 2: [], 3: [] };
  for (const [player, vote] of Object.entries(votes)) {
    if (tally[vote]) tally[vote].push(player);
  }

  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const medals = ["🥇", "🥈", "🥉"];
  const participantCount = leaderboard.length;
  const votedCount = Object.keys(votes).length;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-primary">2 Sự thật 1 Lời nói dối</h1>
            <p className="text-sm text-slate-500">Host control panel</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-slate-400">Người chơi</div>
              <div className="text-3xl font-bold text-primary">👥 {participantCount}</div>
              {phase === "voting" && (
                <div className="text-xs text-slate-400 mt-1">
                  {votedCount} đã vote
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-slate-400">Round</div>
              <div className="text-3xl font-bold text-primary">
                {phase === "finished" ? "10" : round} / 10
              </div>
              <div className="text-xs text-slate-400 mt-1">phase: {phase}</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="space-y-6">
            <section className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-primary mb-4">Game controls</h2>
              {phase === "waiting" && (
                <button
                  onClick={onNext}
                  disabled={busy}
                  className="w-full py-4 rounded-xl bg-primary text-white text-lg font-medium disabled:opacity-40"
                >
                  Bắt đầu Round {round}
                </button>
              )}

              {phase === "voting" && (
                <div>
                  <p className="text-sm text-slate-500 mb-3">Chọn đáp án đúng:</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => setSelectedCorrect(n)}
                        className={`py-4 rounded-xl text-lg font-semibold border-2 transition ${
                          selectedCorrect === n
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-primary border-slate-200 hover:border-primary"
                        }`}
                      >
                        Box {n}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={onReveal}
                    disabled={!selectedCorrect || busy}
                    className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-40"
                  >
                    Reveal đáp án
                  </button>
                </div>
              )}

              {phase === "revealed" && (
                <div>
                  <div className="mb-4 text-center bg-emerald-50 text-emerald-700 rounded-xl py-3">
                    Đáp án đúng: <span className="font-semibold">Box {correct}</span>
                  </div>
                  <button
                    onClick={onNext}
                    disabled={busy}
                    className="w-full py-4 rounded-xl bg-primary text-white text-lg font-medium disabled:opacity-40"
                  >
                    {round >= 10 ? "Kết thúc game" : "Round tiếp theo"}
                  </button>
                </div>
              )}

              {phase === "finished" && (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">🏁</div>
                  <div className="text-lg font-semibold text-primary">Game đã kết thúc</div>
                </div>
              )}

              <button
                onClick={onReset}
                className="mt-6 w-full py-2 rounded-xl border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50"
              >
                Reset game
              </button>
            </section>

            <section className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-primary mb-4">
                Vote tally · {Object.keys(votes).length} người vote
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`rounded-xl p-4 text-center ${
                      phase === "revealed" && correct === n
                        ? "bg-emerald-100"
                        : "bg-slate-50"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wider text-slate-400">
                      Box {n}
                    </div>
                    <div className="text-3xl font-bold text-primary mt-1">
                      {tally[n].length}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {Object.keys(votes).length === 0 && (
                  <div className="text-sm text-slate-400 text-center py-4">
                    Chưa có ai vote
                  </div>
                )}
                {[1, 2, 3].map((n) =>
                  tally[n].length > 0 ? (
                    <div key={n}>
                      <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                        Box {n}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tally[n].map((p) => (
                          <span
                            key={p}
                            className={`text-sm px-2.5 py-1 rounded-full ${
                              phase === "revealed" && correct === n
                                ? "bg-emerald-100 text-emerald-700"
                                : phase === "revealed"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            </section>
          </div>

          <aside className="bg-white rounded-2xl shadow-sm p-6 h-fit">
            <h2 className="font-semibold text-primary mb-4">Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-6">
                Chưa có người chơi
              </div>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map(([player, score], idx) => (
                  <li
                    key={player}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                      idx < 3 ? "bg-slate-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center text-sm">
                        {idx < 3 ? medals[idx] : <span className="text-slate-400">{idx + 1}</span>}
                      </span>
                      <span className="font-medium text-slate-700 truncate">{player}</span>
                    </div>
                    <span className="font-bold text-primary">{score}</span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
