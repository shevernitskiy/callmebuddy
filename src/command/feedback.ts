import { Composer } from "../../deps.ts";

const bot = new Composer();

bot.command("feedback", async (ctx) => {
  await ctx.reply("если хотите добавить гору, напишите - @shevernitskiy");
});

export { bot as CommandFeedback };
