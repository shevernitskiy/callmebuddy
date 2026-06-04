import { type Mutatable, MUTATED } from "@shevernitskiy/proxify";

import { buildUpstash } from "@shevernitskiy/proxify/platform/upstash";

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

export const getState = buildUpstash(
  Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
  default_state,
  UNIQUE_KEY,
);

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
