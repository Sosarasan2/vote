const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const KEY = "game_state";

const DEFAULT_STATE = {
  round: 1,
  phase: "waiting",
  correct: null,
  votes: {},
  scores: {},
  roundHistory: [],
};

function authHeaders() {
  return { Authorization: `Bearer ${TOKEN}` };
}

export async function getState() {
  if (!URL || !TOKEN) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  }
  const res = await fetch(`${URL}/GET/${KEY}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Redis GET failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.result) {
    return { ...DEFAULT_STATE };
  }
  try {
    return JSON.parse(data.result);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function setState(state) {
  if (!URL || !TOKEN) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  }
  const encoded = encodeURIComponent(JSON.stringify(state));
  const res = await fetch(`${URL}/SET/${KEY}/${encoded}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Redis SET failed: ${res.status}`);
  }
  return state;
}

export function defaultState() {
  return { ...DEFAULT_STATE, votes: {}, scores: {}, roundHistory: [] };
}
