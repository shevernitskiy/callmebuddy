import {
  Bot,
  Context,
  DenoKVAdapter,
  GrammyError,
  HttpError,
  hydrate,
  HydrateFlavor,
  session,
  SessionFlavor,
} from "../deps.ts";

import { CommandFeedback } from "./command/feedback.ts";
import { CommandCams } from "./command/cams.ts";
import { CommandWeather } from "./command/weather.ts";

console.log("Start bot...");

type SessionData = {
  last_weather?: {
    key: string;
    name: string;
    alt: number;
  };
};

type SessionContext = Context & SessionFlavor<SessionData>;
export type BotContext = HydrateFlavor<SessionContext>;

export const bot = new Bot<BotContext>(Deno.env.get("TOKEN")!);

const kv = await Deno.openKv();

bot.use(hydrate());
bot.use(session({
  initial: () => ({}),
  storage: new DenoKVAdapter(kv),
}));

bot.use(CommandFeedback);
bot.use(CommandCams);
bot.use(CommandWeather);

bot.catch((err) => {
  console.error(`Error while handling update ${err.ctx.update.update_id}:`);

  if (err.error instanceof GrammyError) {
    console.error("Error in request:", err.error.description);
  } else if (err.error instanceof HttpError) {
    console.error("Could not contact Telegram:", err.error);
  } else {
    console.error("Unknown error:", err.error as Error);
  }
});

// bot.start();
