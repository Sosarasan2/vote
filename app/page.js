"use client";

import { useEffect, useRef, useState } from "react";

function generateDeviceId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateDeviceId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem("voti_device_id");
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem("voti_device_id", id);
  }
  return id;
}

export default function PlayerPage() {
  const [deviceId, setDeviceId] = useState(null);
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [state, setState] = useState(null);
  const [pendingVote, setPendingVote] = useState(null);
  const [lockedVote, setLockedVote] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const lastRoundRef = useRef(null);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    const saved = localStorage.getItem("voti_name");
    if (saved && id) {
      setName(saved);
      fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: id, name: saved }),
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!name || !deviceId) return undefined;
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
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [name, deviceId]);

  useEffect(() => {
    if (!state || !deviceId) return;

    if (lastRoundRef.current !== state.round) {
      setPendingVote(null);
      setLockedVote(null);
      lastRoundRef.current = state.round;
    }

    if (state.phase === "voting") {
      setLockedVote(null);
      if (!submittingRef.current) {
        setPendingVote(state.votes?.[deviceId] ?? null);
      }
    } else if (state.phase === "revealed") {
      setLockedVote(state.votes?.[deviceId] ?? null);
    } else {
      setPendingVote(null);
      setLockedVote(null);
    }
  }, [state, deviceId]);

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    localStorage.setItem("voti_name", trimmed);
    setName(trimmed);
    try {
      await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, name: trimmed }),
      });
    } catch {}
  };

  const changeName = () => {
    if (!confirm("Đổi tên? Điểm hiện tại của bạn sẽ giữ nguyên (đổi nhãn thôi).")) return;
    localStorage.removeItem("voti_name");
    setName("");
    setNameInput("");
  };

  const submitVote = async (answer) => {
    if (submitting) return;
    if (!state || state.phase !== "voting") return;
    if (pendingVote === answer) return;
    const previous = pendingVote;
    setPendingVote(answer);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, name, answer }),
      });
      const data = await res.json();
      if (!data.ok) {
        setPendingVote(previous);
      }
    } catch {
      setPendingVote(previous);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!name) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-primary mb-1">2 Sự thật 1 Lời nói dối</h1>
          <p className="text-sm text-slate-500 mb-5">Nhập tên của bạn để bắt đầu</p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
            }}
            placeholder="Tên của bạn"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-base"
            autoFocus
            maxLength={30}
          />
          <button
            onClick={saveName}
            disabled={!nameInput.trim()}
            className="mt-4 w-full py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-40"
          >
            Vào game
          </button>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-slate-400">Đang tải...</div>
      </main>
    );
  }

  const { round, phase, correct, scores, players = {} } = state;
  const myScore = scores?.[deviceId] ?? 0;
  const participantCount = Object.keys(scores || {}).length;

  let content = null;

  if (phase === "waiting") {
    content = (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⏳</div>
        <div className="text-lg text-slate-600">Chờ game bắt đầu...</div>
      </div>
    );
  } else if (phase === "voting") {
    const hasPick = pendingVote != null;
    content = (
      <div>
        <p className="text-center text-slate-500 mb-5 sm:mb-6 text-sm sm:text-base">
          {hasPick ? "Bạn có thể đổi cho đến khi host khóa" : "Chọn đáp án của bạn"}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3].map((n) => {
            const isPicked = pendingVote === n;
            return (
              <button
                key={n}
                onClick={() => submitVote(n)}
                disabled={submitting && pendingVote !== n}
                className={`relative aspect-[3/4] rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-between transition active:scale-[0.97] ${
                  isPicked
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "bg-white text-primary border-2 border-slate-200 hover:border-primary"
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-base sm:text-lg self-start ${
                    isPicked
                      ? "bg-white/20 text-white"
                      : "bg-primary text-white"
                  }`}
                >
                  {n}
                </div>
                <div className="text-sm sm:text-base font-semibold w-full text-center pb-1">
                  Card {n}
                </div>
                {isPicked && (
                  <span className="absolute top-2 right-2 text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>
        {hasPick && (
          <div className="mt-5 sm:mt-6 text-center text-emerald-600 font-medium text-sm sm:text-base">
            ✓ Đã chọn Card {pendingVote}
          </div>
        )}
      </div>
    );
  } else if (phase === "revealed") {
    const myVote = lockedVote ?? state.votes?.[deviceId] ?? null;
    const didVote = myVote != null;
    const isCorrect = myVote === correct;

    let banner;
    if (!didVote) {
      banner = (
        <div className="text-center py-3 px-4 rounded-2xl bg-slate-100 text-slate-600 mb-5">
          <div className="text-2xl mb-1">—</div>
          <div className="text-sm font-medium">Bạn không vote round này</div>
        </div>
      );
    } else if (isCorrect) {
      banner = (
        <div className="text-center py-4 px-4 rounded-2xl bg-emerald-50 text-emerald-700 mb-5">
          <div className="text-4xl sm:text-5xl mb-1">✓</div>
          <div className="text-lg sm:text-xl font-semibold">Đúng rồi!</div>
        </div>
      );
    } else {
      banner = (
        <div className="text-center py-4 px-4 rounded-2xl bg-rose-50 text-rose-700 mb-5">
          <div className="text-4xl sm:text-5xl mb-1">✗</div>
          <div className="text-lg sm:text-xl font-semibold">Sai mất rồi</div>
        </div>
      );
    }

    content = (
      <div>
        {banner}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          {[1, 2, 3].map((n) => {
            const isCorrectCard = n === correct;
            const isMyWrong = n === myVote && n !== correct;
            let cardCls;
            let badgeCls;
            let label = null;
            if (isCorrectCard) {
              cardCls = "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30";
              badgeCls = "bg-white/20 text-white";
              label = "Đáp án đúng";
            } else if (isMyWrong) {
              cardCls = "bg-rose-500 text-white border-rose-500";
              badgeCls = "bg-white/20 text-white";
              label = "Bạn chọn";
            } else {
              cardCls = "bg-slate-50 text-slate-400 border-slate-200";
              badgeCls = "bg-slate-300 text-white";
            }
            return (
              <div
                key={n}
                className={`relative aspect-[3/4] rounded-2xl p-2.5 sm:p-3 border-2 flex flex-col items-center justify-between ${cardCls}`}
              >
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-base sm:text-lg self-start ${badgeCls}`}
                >
                  {n}
                </div>
                <div className="w-full text-center pb-1">
                  <div className="text-sm sm:text-base font-semibold">
                    Card {n}
                  </div>
                  {label && (
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium opacity-90 mt-0.5">
                      {label}
                    </div>
                  )}
                </div>
                {isCorrectCard && (
                  <span className="absolute top-2 right-2 text-xs">✓</span>
                )}
                {isMyWrong && (
                  <span className="absolute top-2 right-2 text-xs">✗</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="bg-slate-50 rounded-2xl py-4 text-center">
          <div className="text-xs uppercase tracking-wider text-slate-400">Điểm của bạn</div>
          <div className="text-3xl sm:text-4xl font-bold text-primary mt-1">{myScore}</div>
        </div>
      </div>
    );
  } else if (phase === "finished") {
    const sorted = Object.entries(scores || {}).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(([id]) => id === deviceId) + 1;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏁";
    content = (
      <div className="text-center py-4 sm:py-6">
        <div className="text-5xl sm:text-6xl mb-3">{medal}</div>
        <div className="text-xl sm:text-2xl font-semibold mb-6">Game kết thúc!</div>
        <div className="bg-slate-50 rounded-2xl py-5 mb-3">
          <div className="text-xs uppercase tracking-wider text-slate-400">Điểm cuối</div>
          <div className="text-4xl sm:text-5xl font-bold text-primary mt-1">{myScore}</div>
        </div>
        {rank > 0 && (
          <div className="text-slate-600 text-sm sm:text-base">
            Hạng <span className="font-semibold text-primary">{rank}</span> / {sorted.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-start justify-center p-3 sm:p-4 pt-4 sm:pt-6">
      <div className="w-full max-w-[440px]">
        <header className="flex items-center justify-between mb-4 px-1 gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400">
              Player
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary truncate max-w-[140px] sm:max-w-[180px]">
                {name}
              </span>
              <button
                onClick={changeName}
                className="text-[11px] sm:text-xs text-slate-400 underline underline-offset-2 hover:text-primary shrink-0"
              >
                đổi tên
              </button>
            </div>
          </div>
          <div className="text-center shrink-0">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400">
              Người chơi
            </div>
            <div className="font-semibold text-primary">👥 {participantCount}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400">
              Round
            </div>
            <div className="font-semibold text-primary">
              {phase === "finished" ? "10" : round} / 10
            </div>
          </div>
        </header>
        <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">{content}</div>

        <Leaderboard
          scores={scores}
          players={players}
          currentDeviceId={deviceId}
        />


        <div className="mt-3 text-center text-xs text-slate-400">
          Điểm hiện tại: {myScore}
        </div>
      </div>
    </main>
  );
}

function Leaderboard({ scores, players = {}, currentDeviceId }) {
  const sorted = Object.entries(scores || {}).sort((a, b) => b[1] - a[1]);
  const medals = ["🥇", "🥈", "🥉"];
  const top = sorted.slice(0, 10);
  const myRank = sorted.findIndex(([id]) => id === currentDeviceId);
  const inTop = myRank > -1 && myRank < 10;
  const myEntry = myRank > -1 ? sorted[myRank] : null;
  const nameOf = (id) => players[id] || "(không tên)";

  return (
    <div className="mt-4 bg-white rounded-2xl shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-primary">Bảng xếp hạng</h2>
        {sorted.length > 0 && (
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">
            {sorted.length} người
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-4">
          Chưa có ai có điểm
        </div>
      ) : (
        <ol className="space-y-1.5">
          {top.map(([id, score], idx) => {
            const isMe = id === currentDeviceId;
            return (
              <li
                key={id}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                  isMe
                    ? "bg-primary/10 ring-1 ring-primary/20"
                    : idx < 3
                    ? "bg-slate-50"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 text-center text-sm shrink-0">
                    {idx < 3 ? (
                      medals[idx]
                    ) : (
                      <span className="text-slate-400">{idx + 1}</span>
                    )}
                  </span>
                  <span
                    className={`truncate text-sm sm:text-base ${
                      isMe ? "font-semibold text-primary" : "text-slate-700"
                    }`}
                  >
                    {nameOf(id)}
                    {isMe && (
                      <span className="ml-1.5 text-[10px] uppercase tracking-wider text-primary/70">
                        bạn
                      </span>
                    )}
                  </span>
                </div>
                <span className="font-bold text-primary tabular-nums">
                  {score}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {!inTop && myEntry && (
        <>
          <div className="my-2 text-center text-xs text-slate-300">···</div>
          <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-primary/10 ring-1 ring-primary/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-6 text-center text-sm text-primary shrink-0">
                {myRank + 1}
              </span>
              <span className="truncate text-sm sm:text-base font-semibold text-primary">
                {nameOf(myEntry[0])}
                <span className="ml-1.5 text-[10px] uppercase tracking-wider text-primary/70">
                  bạn
                </span>
              </span>
            </div>
            <span className="font-bold text-primary tabular-nums">
              {myEntry[1]}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
