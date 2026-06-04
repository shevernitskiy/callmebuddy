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

export type State = Mutatable<typeof default_state>;

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

export async function getState(): Promise<State> {
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
