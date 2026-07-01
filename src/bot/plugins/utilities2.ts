import { NewMessageEvent } from "telegram/events/index.js";
import axios from "axios";

export default [
  {
    name: "Calculate",
    description: "Evaluate a math expression",
    command: "calc",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
      const expr = event.message.text?.replace(/^\.calc\s*/, "");
      if (!expr) return;
      try {
        if (/[^0-9\+\-\*\/\(\)\.\s]/.test(expr)) {
            await event.message.edit({ text: "`Invalid characters in math expression.`" });
            return;
        }
        const result = new Function(`return ${expr}`)();
        await event.message.edit({ text: `**Expression:** \`${expr}\`\n**Result:** \`${result}\`` });
      } catch (e) {
        await event.message.edit({ text: "`Failed to evaluate.`" });
      }
    }
  },
  {
    name: "Crypto Price",
    description: "Get crypto price",
    command: "crypto",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
      const coin = event.message.text?.replace(/^\.crypto\s*/, "").toUpperCase() || "BTC";
      try {
        const res = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${coin}&tsyms=USD`);
        if (res.data.Response === "Error") {
            await event.message.edit({ text: `\`${res.data.Message}\`` });
        } else {
            await event.message.edit({ text: `**${coin} Price:** \`$${res.data.USD}\`` });
        }
      } catch (e) {
        await event.message.edit({ text: "`Failed to fetch crypto price.`" });
      }
    }
  },
  {
    name: "URL Shortener",
    description: "Shorten a URL using TinyURL",
    command: "short",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
        let url = event.message.text?.replace(/^\.short\s*/, "");
        if (!url) {
           const reply = await event.message.getReplyMessage();
           url = reply?.text || "";
        }
        if (!url) return;
        try {
            const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
            await event.message.edit({ text: `**Original URL:** \`${url}\`\n**Shortened:** ${res.data}` });
        } catch (e) {
            await event.message.edit({ text: "`Failed to shorten URL.`" });
        }
    }
  }
];
