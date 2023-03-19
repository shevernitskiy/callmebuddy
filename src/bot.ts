import { Bot, Context, freeStorage, GrammyError, HttpError, session, SessionFlavor } from "../deps.ts";

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

export type SessionContext = Context & SessionFlavor<SessionData>;

export const bot = new Bot<SessionContext>(Deno.env.get("TOKEN")!);

bot.use(session({
  initial: () => ({}),
  storage: freeStorage<SessionData>(bot.token),
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
