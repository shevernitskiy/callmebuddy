import { Bot, Context, GrammyError, HttpError } from "@grammyjs/grammy";

import { CommandFeedback } from "./command/feedback.ts";
import { CommandCams } from "./command/cams.ts";
import { CommandWeather } from "./command/weather.ts";
// import { getState, type State } from "./state.ts";

console.log("Start bot...");

// type StateFlavor = {
//   state: () => Promise<State>;
// };

export type BotContext = Context;

function getToken(): string {
  const token = Deno.env.get("TOKEN") ?? readTokenFromDotEnv();
  if (!token) throw new Error("TOKEN is required");
  return token;
}

function readTokenFromDotEnv(): string | undefined {
  try {
    const env = Deno.readTextFileSync(".env");
    const line = env.split(/\r?\n/).find((item) => item.trim().startsWith("TOKEN="));
    return line
      ?.split("=")
      .slice(1)
      .join("=")
      .trim()
      .replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

export const bot = new Bot<BotContext>(getToken());

// bot.use(async (ctx, next) => {
//   ctx.state = getState;
//   await next();
// });

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
