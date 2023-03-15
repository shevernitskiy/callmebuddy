import { Bot, GrammyError, HttpError } from "../deps.ts";

import { feedback } from "./command/feedback.ts";
import { cams } from "./command/cams.ts";
import { weather } from "./command/weather.ts";

console.log("Start bot...");

export const bot = new Bot(Deno.env.get("TOKEN")!);

bot.use(feedback);
bot.use(cams);
bot.use(weather);

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
