import { CommandContext, Composer, Context, DOMParser, format, InputFile, InputMediaPhoto } from "../../deps.ts";
import { BotContext } from "../bot.ts";

import sources from "../data/cams.json" assert { type: "json" };

const bot = new Composer<BotContext>();

bot.command("cam", async (ctx) => {
  try {
    console.log(`Cams, id: ${ctx.msg!.from?.id}`);
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

bot.command("everest", async (ctx) => {
  try {
    console.log(`Everest, id: ${ctx.msg!.from?.id}`);
    const tmp = await ctx.reply("фотографигуем...");
    const media = await getInputMediasEverest();

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
  try {
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
  } catch (err) {
    throw err;
  }
}

async function getInputMediasEverest(): Promise<InputMediaPhoto<InputFile>[]> {
  try {
    const res = await fetch(
      "https://node.windy.com/webcams/v1.0/list?nearby=27.709,86.661&radius=250&order=popularity&category=&limit=10&offset=0&lang=ru",
    );
    const data = await res.json();
    const out: InputMediaPhoto<InputFile>[] = [];

    for (const item of data.cams) {
      const date = new Date(item.lastUpdate);

      out.push({
        media: new InputFile(new URL(item.images?.current?.full)),
        caption: `${item.title} | ${format(date, "dd.MM.yyyy HH:mm") ?? "unknown date"}`,
        type: "photo",
      });
    }

    return out;
  } catch (err) {
    throw err;
  }
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
      await ctx.replyWithMediaGroup(out);
    } else {
      await ctx.reply("камеры оффлайн...");
    }
  } catch (err) {
    throw (err);
  }
}

export { bot as CommandCams };
