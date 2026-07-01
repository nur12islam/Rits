import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { computeCheck } from "telegram/Password.js";
import { appLogs } from "./src/bot/logger.js";
import { Config } from "./src/bot/config.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

import { loadDynamicPlugin } from "./src/bot/pluginManager.js";
import { botClient } from "./src/bot/index.js";

// In-memory store for authentication flows
const authFlows = new Map<
  string,
  {
    client: TelegramClient;
    phoneCodeHash?: string;
  }
>();

// API Routes for String Session Generation
app.post("/api/auth/send-code", async (req, res) => {
  const { apiId, apiHash, phoneNumber } = req.body;

  if (!apiId || !apiHash || !phoneNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const numApiId = Number(apiId);
  if (isNaN(numApiId) || numApiId > 2147483647 || numApiId < -2147483648) {
    return res.status(400).json({ 
      error: "Invalid API ID. It must be a valid 32-bit integer. Please ensure you copied the correct API ID (a short number) from my.telegram.org, not your phone number or hash." 
    });
  }

  try {
    const stringSession = new StringSession("");
    const client = new TelegramClient(stringSession, numApiId, apiHash, {
      connectionRetries: 5,
    });
    await client.connect();

    const result = await client.sendCode(
      {
        apiId: numApiId,
        apiHash: apiHash,
      },
      phoneNumber
    );

    authFlows.set(phoneNumber, {
      client,
      phoneCodeHash: result.phoneCodeHash,
    });

    res.json({ success: true, phoneCodeHash: result.phoneCodeHash });
  } catch (error: any) {
    console.error("Send Code Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/sign-in", async (req, res) => {
  const { apiId, apiHash, phoneNumber, phoneCode, password } = req.body;

  const flow = authFlows.get(phoneNumber);
  if (!flow) {
    return res.status(400).json({ error: "Flow not found. Request code first." });
  }

  try {
    const { client, phoneCodeHash } = flow;

    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash: phoneCodeHash!,
        phoneCode,
      })
    );

    const sessionString = client.session.save() as unknown as string;
    
    try {
        await client.sendMessage("me", {
            message: `**RITS Session String**\n\n\`${sessionString}\`\n\n⚠️ **WARNING**: Keep this secret! Do not share it with anyone, as it gives full access to your account.`,
        });
    } catch (e) {
        console.error("Failed to send session to saved messages:", e);
    }

    authFlows.delete(phoneNumber);
    
    try { 
        await client.disconnect(); 
        await client.destroy(); 
    } catch (e) {}

    res.json({ success: true, sessionString });
  } catch (error: any) {
    if (error.errorMessage === "SESSION_PASSWORD_NEEDED") {
      if (!password) {
        return res.status(401).json({
          error: "Two-step verification enabled. Please provide your password.",
          needsPassword: true,
        });
      }

      try {
        const { client } = flow;
        // Import Password module dynamically to keep it clean if not needed
        const passwordData = await client.invoke(new Api.account.GetPassword());
        
        const checkPassword = await computeCheck(
          passwordData,
          password
        );

        await client.invoke(
          new Api.auth.CheckPassword({
            password: checkPassword,
          })
        );

        const sessionString = client.session.save() as unknown as string;
        
        try {
            await client.sendMessage("me", {
                message: `**RITS Session String**\n\n\`${sessionString}\`\n\n⚠️ **WARNING**: Keep this secret! Do not share it with anyone, as it gives full access to your account.`,
            });
        } catch (e) {
            console.error("Failed to send session to saved messages:", e);
        }

        authFlows.delete(phoneNumber);
        try { 
            await client.disconnect(); 
            await client.destroy();
        } catch (e) {}

        return res.json({ success: true, sessionString });
      } catch (pwError: any) {
        return res.status(400).json({ error: pwError.message || "Invalid password." });
      }
    }

    console.error("Sign In Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the actual RITS if env vars are present
import { startBot, getBotStatus } from "./src/bot/index.js";

app.get("/api/bot/status", (req, res) => {
  res.json({ status: getBotStatus() });
});

app.get("/api/logs", (req, res) => {
  res.json({ logs: appLogs });
});

app.post("/api/bot/start", async (req, res) => {
  const { sessionString, apiId, apiHash, botToken, logChannel } = req.body;
  
  const numApiId = Number(apiId);
  if (isNaN(numApiId) || numApiId > 2147483647 || numApiId < -2147483648) {
    return res.status(400).json({ error: "Invalid API ID." });
  }

  try {
    await startBot(sessionString, numApiId, apiHash, botToken, logChannel);
    res.json({ success: true, status: getBotStatus() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/bot/plugin", async (req, res) => {
  const { name, code, url } = req.body;

  if (!botClient) {
    return res.status(400).json({ error: "Bot is not running. Please start RITS first." });
  }

  try {
    let pluginCode = code;
    if (url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch code from URL");
      pluginCode = await response.text();
    }

    if (!pluginCode) {
      return res.status(400).json({ error: "Provide code or URL" });
    }

    const pluginsDir = path.join(process.cwd(), "dynamic_plugins");
    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir);
    }

    const safeName = name ? name.replace(/[^a-zA-Z0-9]/g, "") : `plugin_${Date.now()}`;
    const filePath = path.join(pluginsDir, `${safeName}.mjs`);
    
    fs.writeFileSync(filePath, pluginCode);

    await loadDynamicPlugin(filePath);
    
    res.json({ success: true, message: `Plugin '${safeName}' loaded successfully!` });
  } catch (error: any) {
    console.error("Plugin Load Error:", error);
    res.status(500).json({ error: error.message || "Failed to load plugin" });
  }
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Attempt to start bot automatically if env vars exist
  if (
    process.env.TELEGRAM_SESSION_STRING &&
    process.env.TELEGRAM_API_ID &&
    process.env.TELEGRAM_API_HASH
  ) {
    console.log("Found Telegram credentials in env. Starting RITS...");
    startBot(
      process.env.TELEGRAM_SESSION_STRING,
      Number(process.env.TELEGRAM_API_ID),
      process.env.TELEGRAM_API_HASH,
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_LOG_CHANNEL
    ).catch((err) => console.error("Failed to auto-start bot:", err));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Graceful shutdown handling
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  if (botClient) try { await botClient.disconnect(); await botClient.destroy(); } catch (e) {}
  const { assistantBot } = await import("./src/bot/index.js");
  if (assistantBot) try { await assistantBot.disconnect(); await assistantBot.destroy(); } catch (e) {}
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  if (botClient) try { await botClient.disconnect(); await botClient.destroy(); } catch (e) {}
  const { assistantBot } = await import("./src/bot/index.js");
  if (assistantBot) try { await assistantBot.disconnect(); await assistantBot.destroy(); } catch (e) {}
  process.exit(0);
});

startServer();
