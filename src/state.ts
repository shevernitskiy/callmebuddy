import { type Mutatable, MUTATED, proxify } from "@shevernitskiy/proxify";
import { Redis } from "@upstash/redis";

const UNIQUE_KEY = "callmebuddy:state";

export type LastWeather = {
  key: string;
  name: string;
  alt: number;
};

const default_state = {
  users: {} as Record<string, { last_weather?: LastWeather }>,
  [MUTATED]: true,
};

let state_promise: Promise<State> | undefined;

export type State = Mutatable<typeof default_state>;

export function getState(): Promise<State> {
  state_promise ??= loadState();
  return state_promise;
}

async function loadState(): Promise<State> {
  const redis = new Redis({
    url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
    token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
  });

  const fetchedState = await redis.get<typeof default_state>(UNIQUE_KEY);
  const state = fetchedState ?? default_state;

  return proxify(state, async () => {
    if (state[MUTATED]) {
      console.debug("saving state");
      state[MUTATED] = false;
      await redis.set(UNIQUE_KEY, state);
    }
  });
}

export async function flushState(state: State): Promise<void> {
  await state[Symbol.asyncDispose]?.();
}

export function findUserState(state: State, user_id: number | undefined) {
  if (user_id === undefined) return undefined;
  return state.users[String(user_id)];
}

export function getUserState(state: State, user_id: number | undefined) {
  if (user_id === undefined) return undefined;

  const key = String(user_id);
  state.users[key] ??= {};
  return state.users[key];
}
