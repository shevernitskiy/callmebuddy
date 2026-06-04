import { Composer } from "@grammyjs/grammy";

import { BotContext } from "../bot.ts";

const bot = new Composer<BotContext>();

bot.command("feedback", (ctx) => {
  ctx.sendMessage("если хотите добавить гору, напишите - @shevernitskiy");
});

export { bot as CommandFeedback };
