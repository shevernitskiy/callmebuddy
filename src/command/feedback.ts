import { Composer } from "../../deps.ts";

const bot = new Composer();

bot.command("feedback", (ctx) => {
  ctx.reply("если хотите добавить гору, напишите - @shevernitskiy");
});

export { bot as CommandFeedback };
