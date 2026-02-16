import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = parseInt(process.env.PORT || "3000", 10);
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const APP_URL = process.env.APP_URL || "";
const WEBHOOK_PATH = `/webhook-${BOT_TOKEN.split(":")[0]}`;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".mp3": "audio/mpeg",
};

// Telegram bot handler
async function handleWebhook(body) {
  const msg = body.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const name = msg.from?.first_name || "друг";

  let reply = "";
  let replyMarkup = null;

  if (text === "/start") {
    reply =
      `Ас-саляму алейкум, ${name}! \u2728\n\n` +
      `Добро пожаловать в **IMAN** — ваш помощник в духовном развитии.\n\n` +
      `\u{1F54C} Намазы с точным временем\n` +
      `\u{1F4D6} Коран с тафсиром и переводом\n` +
      `\u{1F64F} Дуа и зикр на каждый день\n` +
      `\u{1F9E0} Квиз для проверки знаний\n` +
      `\u{1F4CA} Статистика вашего прогресса\n\n` +
      `Нажмите кнопку ниже, чтобы открыть приложение:`;
    replyMarkup = {
      inline_keyboard: [
        [{ text: "\u{1F55C} Открыть IMAN", web_app: { url: APP_URL } }],
      ],
    };
  } else if (text === "/app") {
    reply = "Нажмите кнопку, чтобы открыть приложение:";
    replyMarkup = {
      inline_keyboard: [
        [{ text: "\u{1F55C} Открыть IMAN", web_app: { url: APP_URL } }],
      ],
    };
  } else if (text === "/help") {
    reply =
      `**IMAN — Помощь**\n\n` +
      `Команды:\n` +
      `/start — Приветствие\n` +
      `/app — Открыть приложение\n` +
      `/help — Эта справка\n\n` +
      `Или нажмите кнопку **«Открыть IMAN»** внизу чата.`;
  } else {
    reply =
      `Ас-саляму алейкум! \u2728\n\nОткройте приложение IMAN кнопкой ниже:`;
    replyMarkup = {
      inline_keyboard: [
        [{ text: "\u{1F55C} Открыть IMAN", web_app: { url: APP_URL } }],
      ],
    };
  }

  const payload = {
    chat_id: chatId,
    text: reply,
    parse_mode: "Markdown",
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// Static file server + webhook
const server = createServer(async (req, res) => {
  // Webhook endpoint
  if (req.method === "POST" && req.url === WEBHOOK_PATH) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        await handleWebhook(JSON.parse(body));
      } catch (e) {
        console.error("Webhook error:", e);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
    });
    return;
  }

  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"status":"ok"}');
    return;
  }

  // Static files
  let filePath = join(DIST, req.url === "/" ? "index.html" : req.url);

  // Remove query string
  filePath = filePath.split("?")[0];

  if (!existsSync(filePath)) {
    // SPA fallback
    filePath = join(DIST, "index.html");
  }

  const ext = extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  try {
    const data = readFileSync(filePath);
    const headers = { "Content-Type": contentType };

    // Cache static assets
    if (filePath.includes("/assets/")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }

    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`IMAN server running on port ${PORT}`);

  // Register webhook on startup
  if (BOT_TOKEN && APP_URL) {
    const webhookUrl = `${APP_URL}${WEBHOOK_PATH}`;
    const r = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      },
    );
    const data = await r.json();
    console.log("Webhook set:", data.ok ? webhookUrl : data.description);
  }
});
