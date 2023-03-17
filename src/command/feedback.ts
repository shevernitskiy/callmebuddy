import { Composer } from "../../deps.ts";

const bot = new Composer();
export { bot as CommandFeedback };

bot.command("feedback", async (ctx) => {
  await ctx.reply("если хотите добавить гору, напишите - @shevernitskiy");
});
