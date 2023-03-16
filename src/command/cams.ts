import { CommandContext, Composer, Context, DOMParser, InputFile, InputMediaPhoto } from "../../deps.ts";

import sources from "../data/cams.json" assert { type: "json" };

export const cams = new Composer();

cams.command("cam", async (ctx) => {
  try {
    const tmp = await ctx.reply("фотографигуем...");
    const responses = await Promise.all(sources.map((item) => fetch(`https://rtsp.me/embed/${item.code}/`)));
    const htmls = await Promise.all(responses.map((item) => item.text()));

    const out: InputMediaPhoto<InputFile>[] = [];

    for (const [index, html] of htmls.entries()) {
      const blob = await fetchToBlob(html);

      if (blob === undefined) return;

      out.push({
        media: new InputFile(blob),
        caption: sources[index].name,
        type: "photo",
      });
    }

    if (out.length > 0) {
      await replyWithPost(ctx, out);
    } else {
      await ctx.reply("камеры оффлайн...");
    }
    await ctx.api.deleteMessage(ctx.from?.id!, tmp.message_id);
  } catch (err) {
    ctx.reply("попробуйте позже");
    console.log(err);
  }
});

async function fetchToBlob(html: string): Promise<Blob | undefined> {
  try {
    const dom = new DOMParser().parseFromString(html, "text/html");
    const source = dom?.querySelector("#video")?.getAttribute("poster");
    if (source === undefined) return;
    const res = await fetch(dom?.querySelector("#video")?.getAttribute("poster")!);
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
