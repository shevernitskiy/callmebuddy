import { type Mutatable, MUTATED, proxify } from "@shevernitskiy/proxify";

export type LastWeather = {
  key: string;
  name: string;
  alt: number;
};

const default_state = {
  users: {} as Record<string, { last_weather?: LastWeather }>,
  [MUTATED]: true,
};

let db: Deno.Kv | undefined;
let state_promise: Promise<State> | undefined;

export type State = Mutatable<typeof default_state>;

export function getState(): Promise<State> {
  state_promise ??= loadState();
  return state_promise;
}

async function loadState(): Promise<State> {
  db ??= await Deno.openKv(Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined ? undefined : "kv.db");
  const state = (await db.get<typeof default_state>(["callmebuddy_state"])).value ?? default_state;

  return proxify(state, async () => {
    if (state[MUTATED]) {
      console.debug("saving state");
      state[MUTATED] = false;
      await db?.set(["callmebuddy_state"], state);
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
