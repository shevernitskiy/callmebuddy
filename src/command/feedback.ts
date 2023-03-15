import { Composer } from "../../deps.ts";

export const feedback = new Composer();

feedback.command("feedback", async (ctx) => {
  await ctx.reply("если хотите добавить гору, напишите - @shevernitskiy");
});
