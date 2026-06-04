import { bot } from "./src/bot.ts";

await bot.init();

Deno.serve(async (req) => {
  const path = new URL(req.url).pathname;
  if (req.method === "POST" && path === "/bot") {
    await bot.handleUpdate(await req.json());
    return new Response("OK");
  }
  return new Response("Hello, world");
});
