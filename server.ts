import { serve, webhookCallback } from "./deps.ts";

import { bot } from "./src/bot.ts";

const handleUpdate = webhookCallback(bot, "std/http");

serve(async (req) => {
  const path = req.url.split(req.headers.get("host")!)[1];
  if (req.method === "POST" && path === "/bot") {
    return await handleUpdate(req);
  }
  return new Response("Hello, world");
});
