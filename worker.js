import { Router } from "./src/router.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Webhook endpoint — Telegram posts updates here
    if (
      request.method === "POST" &&
      url.pathname === `/webhook/${env.BOT_TOKEN}`
    ) {
      try {
        const update = await request.json();
        ctx.waitUntil(new Router(env).handle(update));
      } catch (_) {}
      return new Response("OK", { status: 200 });
    }

    // Setup endpoint — visit once to register your webhook
    if (request.method === "GET" && url.pathname === "/setup") {
      const webhookUrl = `${url.origin}/webhook/${env.BOT_TOKEN}`;
      const tgResp = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
        }
      );
      const data = await tgResp.json();
      return new Response(JSON.stringify(data, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Health check
    return new Response("GTC Telegram Bot is running! Visit /setup to register your webhook.", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  },
};
