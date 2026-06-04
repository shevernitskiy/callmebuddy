import { Bot, Context, GrammyError, HttpError } from "@grammyjs/grammy";

import { CommandFeedback } from "./command/feedback.ts";
import { CommandCams } from "./command/cams.ts";
import { CommandWeather } from "./command/weather.ts";

console.log("Start bot...");

export type BotContext = Context;

function getToken(): string {
  const token = Deno.env.get("TOKEN");
  if (!token) throw new Error("TOKEN is required");
  return token;
}

export const bot = new Bot<BotContext>(getToken());

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

if (import.meta.main) {
  await bot.start();
}
