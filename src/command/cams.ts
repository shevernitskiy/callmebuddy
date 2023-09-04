import { CommandContext, Composer, Context, format, InputFile, InputMediaPhoto } from "../../deps.ts";
import { BotContext } from "../bot.ts";

import sources from "../data/cams.json" assert { type: "json" };

const bot = new Composer<BotContext>();

bot.command("cam", async (ctx) => {
  try {
    console.log(`Cams, id: ${ctx.msg!.from?.id}`);
    const tmp = await ctx.reply("фотографигуем...");
    const media = await getInputMedia(sources);

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

async function getInputMedia(sources: { code: string; name: string }[]): Promise<InputMediaPhoto<InputFile>[]> {
  try {
    const responses = await Promise.all(
      sources.map((item) =>
        fetch(
          `https://api.codetabs.com/v1/proxy/?quest=https://e30.ru.cloud.trassir.com/thumbnail_get_tv?link=${item.code}`,
        )
      ),
    );
    const text = await Promise.all(responses.map((item) => item.text()));
    const json = text.map((item) => JSON.parse(item));
    const out: InputMediaPhoto<InputFile>[] = [];

    for (const [index, item] of json.entries()) {
      if (!item.thumbnails?.at(0)?.content) continue;
      const blob = b64toBlob(item.thumbnails[0].content);
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

function b64toBlob(data: string, content_type = "image/png", slice_size = 512): Blob {
  const byte_characters = atob(data);
  const byte_arrays = [];

  for (let offset = 0; offset < byte_characters.length; offset += slice_size) {
    const slice = byte_characters.slice(offset, offset + slice_size);

    const byte_numbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byte_numbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byte_numbers);
    byte_arrays.push(byteArray);
  }

  const blob = new Blob(byte_arrays, { type: content_type });
  return blob;
}

async function replyWithPost(ctx: CommandContext<Context>, out: InputMediaPhoto<InputFile>[]): Promise<void> {
  try {
    if (out.length > 0) {
      await ctx.replyWithMediaGroup(out);
    } else {
      await ctx.reply("камеры оффлайн...");
    }
  } catch (err) {
    throw err;
  }
}

export { bot as CommandCams };
