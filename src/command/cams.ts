import { CommandContext, Composer, Context, DOMParser, InputFile, InputMediaPhoto } from "../../deps.ts";
import { BotContext } from "../bot.ts";

import sources from "../data/cams.json" assert { type: "json" };

const bot = new Composer<BotContext>();

bot.command("cam", async (ctx) => {
  try {
    const tmp = await ctx.reply("фотографигуем...");
    const media = await getInputMedias(sources);

    if (media.length > 0) {
      await replyWithPost(ctx, media);
    } else {
      await ctx.reply("камеры оффлайн...");
    }
    await tmp.delete();
  } catch (err) {
    ctx.reply("попробуйте позже");
    console.log(err);
  }
});

async function getInputMedias(sources: { code: string; name: string }[]): Promise<InputMediaPhoto<InputFile>[]> {
  const responses = await Promise.all(sources.map((item) => fetch(`https://rtsp.me/embed/${item.code}/`)));
  const htmls = await Promise.all(responses.map((item) => item.text()));
  const out: InputMediaPhoto<InputFile>[] = [];

  for (const [index, html] of htmls.entries()) {
    const blob = await fetchToBlob(html);

    if (blob === undefined) continue;

    out.push({
      media: new InputFile(blob),
      caption: sources[index].name,
      type: "photo",
    });
  }

  return out;
}

async function fetchToBlob(html: string): Promise<Blob | undefined> {
  try {
    const dom = new DOMParser().parseFromString(html, "text/html");
    const source = dom?.querySelector("#video")?.getAttribute("poster");
    if (source === undefined) return;
    const res = await fetch(dom?.querySelector("#video")?.getAttribute("poster")!);
    if (!res.ok) return undefined;
    return await res.blob();
  } catch (err) {
    throw (err);
  }
}

async function replyWithPost(ctx: CommandContext<Context>, out: InputMediaPhoto<InputFile>[]): Promise<void> {
  try {
    if (out.length > 0) {
      console.log(`Cams, id: ${ctx.msg!.from?.id}`);
      await ctx.replyWithMediaGroup(out);
    } else {
      await ctx.reply("камеры оффлайн...");
    }
  } catch (err) {
    throw (err);
  }
}

export { bot as CommandCams };
