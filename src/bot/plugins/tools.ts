import { NewMessageEvent } from "telegram/events/index.js";

export default [
  {
    name: "Base64 Encode",
    description: "Encode text to Base64.",
    command: "b64en",
    category: "Misc",
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.b64en\s*/, "") || "";
      if (!text) {
        await event.message.edit({ text: "`Provide text to encode.`" });
        return;
      }
      const encoded = Buffer.from(text).toString("base64");
      await event.message.edit({ text: `**Base64 Encoded:**\n\`${encoded}\`` });
    }
  },
  {
    name: "Base64 Decode",
    description: "Decode Base64 to text.",
    command: "b64de",
    category: "Misc",
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.b64de\s*/, "") || "";
      if (!text) {
        await event.message.edit({ text: "`Provide base64 to decode.`" });
        return;
      }
      const decoded = Buffer.from(text, "base64").toString("utf-8");
      await event.message.edit({ text: `**Base64 Decoded:**\n\`${decoded}\`` });
    }
  },
  {
    name: "Spam",
    description: "Spam a message multiple times.",
    command: "spam",
    category: "Misc",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.spam\s*/, "") || "";
      const args = text.split(" ");
      const count = parseInt(args[0], 10);
      const spamText = args.slice(1).join(" ");
      
      if (isNaN(count) || count <= 0 || !spamText) {
        await event.message.edit({ text: "`Usage: .spam <count> <text>`" });
        return;
      }
      if (count > 50) {
        await event.message.edit({ text: "`Spam count cannot exceed 50 to avoid flood waits.`" });
        return;
      }
      
      await event.message.delete({ revoke: true }).catch(() => {});
      
      for (let i = 0; i < count; i++) {
        await event.client?.sendMessage(event.chatId!, { message: spamText });
        await new Promise(r => setTimeout(r, 500)); // Sleep to prevent flood wait
      }
    }
  },
  {
    name: "Echo",
    description: "Echo the provided text.",
    command: "echo",
    category: "Misc",
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.echo\s*/, "") || "";
      if (!text) {
         await event.message.edit({ text: "`Provide text to echo.`" });
         return;
      }
      await event.message.edit({ text });
    }
  }
];
