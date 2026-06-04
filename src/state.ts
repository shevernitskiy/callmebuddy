import { type Mutatable, MUTATED } from "@shevernitskiy/proxify";

import { buildCloudflareKV } from "@shevernitskiy/proxify/platform/cloudflare";

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

export const getState = buildCloudflareKV(
  {
    accountId: Deno.env.get("CLOUDFLARE_ACCOUNT_ID")!,
    namespaceId: Deno.env.get("CLOUDFLARE_NAMESPACE_ID")!,
    apiToken: Deno.env.get("CLOUDFLARE_APITOKEN")!,
  },
  default_state,
  "callmebuddy",
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
