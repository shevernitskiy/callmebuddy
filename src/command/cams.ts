// deno-lint-ignore-file no-explicit-any
import { CommandContext, Composer, Context, DOMParser, InputFile } from "../../deps.ts";

export const cams = new Composer();

const sources = [
  ["8krA7Nsa", "Гарабаши на трассу"],
  ["4GKhyfDN", "Гарабаши на Эльбрус"],
  ["zFSFdEQS", "Гарабаши на ГКХ"],
  ["588Kn9e7", "Мир на Эльбрус"],
  ["8fiQkZde", "Ледник Азау"],
  ["brBD8e2R", "Мир поляна"],
  ["iBTnfkh8", "Мир-Кругозор"],
  ["r9iGt7h6", "Кругозор-Азау 1"],
  ["r8KnDd7G", "Кругозор-Азау 2"],
  ["HhQEs4k3", "Азау выкат"],
];

cams.command("cams", async (ctx) => {
  try {
    const tmp = await ctx.reply("фотографигуем...");
    const responses = await Promise.all(sources.map((item) => fetch(`https://rtsp.me/embed/${item[0]}/`)));
    const htmls = await Promise.all(responses.map((item) => item.text()));

    const out: any[] = [];

    for (const [index, html] of htmls.entries()) {
      const blob = await fetchToBlob(html);

      if (blob === undefined) return;

      out.push({
        media: new InputFile(blob),
        caption: sources[index][1],
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

async function replyWithPost(ctx: CommandContext<Context>, out: any[]): Promise<void> {
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
