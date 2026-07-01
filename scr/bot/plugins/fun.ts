import { NewMessageEvent } from "telegram/events/index.js";

export default [
  {
    name: "Mock",
    description: "mOcK yOuR tExT",
    command: "mock",
    category: "Fun",
    handler: async (event: NewMessageEvent) => {
      let text = event.message.text?.replace(/^\.mock\s*/, "") || "";
      if (!text && event.message.replyTo) {
          const reply = await event.message.getReplyMessage();
          text = reply?.text || "";
      }
      if (!text) return;
      const mocked = text.split("").map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join("");
      await event.message.edit({ text: mocked });
    }
  },
  {
    name: "Vaporwave",
    description: "ｖａｐｏｒｗａｖｅ",
    command: "vapor",
    category: "Fun",
    handler: async (event: NewMessageEvent) => {
      let text = event.message.text?.replace(/^\.vapor\s*/, "") || "";
      if (!text) return;
      const vapor = text.split("").map(c => {
          const code = c.charCodeAt(0);
          return code >= 33 && code <= 126 ? String.fromCharCode(code + 65248) : c;
      }).join("").replace(/ /g, "  ");
      await event.message.edit({ text: vapor });
    }
  },
  {
    name: "Clap",
    description: "Clap words",
    command: "clap",
    category: "Fun",
    handler: async (event: NewMessageEvent) => {
        let text = event.message.text?.replace(/^\.clap\s*/, "") || "";
        if (!text) return;
        await event.message.edit({ text: text.split(" ").join(" 👏 ") });
    }
  },
  {
    name: "Shrug",
    description: "¯\\_(ツ)_/¯",
    command: "shrug",
    category: "Fun",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text?.replace(/^\.shrug\s*/, "") || "";
        await event.message.edit({ text: `${text} ¯\\_(ツ)_/¯` });
    }
  },
  {
    name: "Slap",
    description: "Slaps a user",
    command: "slap",
    category: "Fun",
    handler: async (event: NewMessageEvent) => {
        const items = ["a large trout", "a frying pan", "a rubber chicken", "a wet noodle", "an old boot"];
        const item = items[Math.floor(Math.random() * items.length)];
        const reply = await event.message.getReplyMessage();
        let target = "themself";
        if (reply && reply.senderId) {
            target = `[user](tg://user?id=${reply.senderId})`;
        }
        await event.message.edit({ text: `*Slaps ${target} around a bit with ${item}*` });
    }
  },
  {
    name: "Reverse",
    description: "Reverses the text",
    command: "rev",
    category: "Fun",
    handler: async (event: NewMessageEvent) => {
        let text = event.message.text?.replace(/^\.rev\s*/, "") || "";
        if (!text) {
           const reply = await event.message.getReplyMessage();
           text = reply?.text || "";
        }
        if (!text) return;
        await event.message.edit({ text: text.split("").reverse().join("") });
    }
  }
];
