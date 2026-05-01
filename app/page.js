"use client";

import { useEffect, useRef, useState } from "react";

export default function PlayerPage() {
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [state, setState] = useState(null);
  const [voted, setVoted] = useState(false);
  const [pendingVote, setPendingVote] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const lastRoundRef = useRef(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("voti_name") : null;
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    if (!name) return undefined;
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
  }, [name]);

  useEffect(() => {
    if (!state) return;
    if (lastRoundRef.current !== state.round || state.phase === "voting") {
      if (lastRoundRef.current !== state.round) {
        setVoted(false);
        setPendingVote(null);
      }
      lastRoundRef.current = state.round;
    }
    if (state.phase === "voting" && state.votes && state.votes[name] != null) {
      setVoted(true);
      setPendingVote(state.votes[name]);
    }
  }, [state, name]);

  const saveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    localStorage.setItem("voti_name", trimmed);
    setName(trimmed);
  };

  const changeName = () => {
    if (!confirm("Đổi tên? Điểm hiện tại sẽ giữ nguyên dưới tên cũ.")) return;
    localStorage.removeItem("voti_name");
    setName("");
    setNameInput("");
    setVoted(false);
    setPendingVote(null);
  };

  const submitVote = async (answer) => {
    if (voted || submitting) return;
    if (!state || state.phase !== "voting") return;
    setSubmitting(true);
    setPendingVote(answer);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, answer }),
      });
      const data = await res.json();
      if (data.ok) {
        setVoted(true);
      } else {
        setPendingVote(null);
      }
    } catch {
      setPendingVote(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (!name) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-primary mb-1">2 Sự thật 1 Lời nói dối</h1>
          <p className="text-sm text-slate-500 mb-6">Nhập tên của bạn để bắt đầu</p>
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

  const { round, phase, correct, scores } = state;
  const myScore = scores?.[name] ?? 0;

  let content = null;

  if (phase === "waiting") {
    content = (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⏳</div>
        <div className="text-lg text-slate-600">Chờ game bắt đầu...</div>
      </div>
    );
  } else if (phase === "voting") {
    content = (
      <div>
        <p className="text-center text-slate-500 mb-6">
          {voted ? "Đã vote!" : "Chọn đáp án của bạn"}
        </p>
        <div className="grid gap-3">
          {[1, 2, 3].map((n) => {
            const isPicked = pendingVote === n;
            return (
              <button
                key={n}
                onClick={() => submitVote(n)}
                disabled={voted || submitting}
                className={`py-6 rounded-2xl text-2xl font-semibold transition active:scale-[0.98] ${
                  isPicked
                    ? "bg-primary text-white"
                    : voted
                    ? "bg-slate-100 text-slate-300"
                    : "bg-white text-primary border-2 border-slate-200 hover:border-primary"
                }`}
              >
                Box {n}
              </button>
            );
          })}
        </div>
        {voted && (
          <div className="mt-6 text-center text-emerald-600 font-medium">
            ✓ Đã ghi nhận
          </div>
        )}
      </div>
    );
  } else if (phase === "revealed") {
    const myVote = pendingVote;
    const isCorrect = myVote === correct;
    content = (
      <div className="text-center py-4">
        {myVote == null ? (
          <div className="text-slate-500 mb-6">Bạn không vote round này</div>
        ) : (
          <div
            className={`text-5xl mb-3 ${
              isCorrect ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {isCorrect ? "✓" : "✗"}
          </div>
        )}
        {myVote != null && (
          <div className="text-lg font-medium mb-1">
            {isCorrect ? "Đúng rồi!" : "Sai mất rồi"}
          </div>
        )}
        <div className="text-sm text-slate-500 mb-6">
          Đáp án đúng: <span className="font-semibold text-primary">Box {correct}</span>
        </div>
        <div className="bg-slate-50 rounded-xl py-4">
          <div className="text-xs uppercase tracking-wider text-slate-400">Điểm của bạn</div>
          <div className="text-3xl font-bold text-primary mt-1">{myScore}</div>
        </div>
      </div>
    );
  } else if (phase === "finished") {
    const sorted = Object.entries(scores || {}).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(([n]) => n === name) + 1;
    content = (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">🏁</div>
        <div className="text-xl font-semibold mb-6">Game kết thúc!</div>
        <div className="bg-slate-50 rounded-xl py-5 mb-3">
          <div className="text-xs uppercase tracking-wider text-slate-400">Điểm cuối</div>
          <div className="text-4xl font-bold text-primary mt-1">{myScore}</div>
        </div>
        {rank > 0 && (
          <div className="text-slate-600">
            Hạng <span className="font-semibold text-primary">{rank}</span> / {sorted.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-start justify-center p-4">
      <div className="w-full max-w-[420px]">
        <header className="flex items-center justify-between mb-4 px-1">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-slate-400">Player</div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary truncate max-w-[140px]">{name}</span>
              <button
                onClick={changeName}
                className="text-xs text-slate-400 underline underline-offset-2 hover:text-primary"
              >
                đổi tên
              </button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-slate-400">Round</div>
            <div className="font-semibold text-primary">
              {phase === "finished" ? "10" : round} / 10
            </div>
          </div>
        </header>
        <div className="bg-white rounded-2xl shadow-sm p-6">{content}</div>
        <div className="mt-3 text-center text-xs text-slate-400">
          Điểm hiện tại: {myScore}
        </div>
      </div>
    </main>
  );
}
