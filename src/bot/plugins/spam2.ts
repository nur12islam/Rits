import { NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram";

export default [
  {
    name: "Spam",
    description: "Spam a message X times. Re-written with new logic.",
    command: "spam",
    category: "Fun",
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.spam\s*/, "") || "";
      const args = text.split(" ");
      const count = parseInt(args[0]);
      
      if (!count || isNaN(count) || count < 1) {
        await event.message.edit({ text: "`Usage: .spam <count> <message>`" });
        return;
      }
      
      const msg = args.slice(1).join(" ");
      if (!msg) {
        await event.message.edit({ text: "`What should I spam?`" });
        return;
      }
      
      await event.message.delete({ revoke: true }).catch(() => {});
      
      for (let i = 0; i < Math.min(count, 100); i++) {
        await event.client?.sendMessage(event.chatId!, { message: msg });
        await new Promise(r => setTimeout(r, 200));
      }
    }
  },
  {
    name: "Delay Spam",
    description: "Spam with a delay.",
    command: "dspam",
    category: "Fun",
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.dspam\s*/, "") || "";
      const args = text.split(" ");
      const delay = parseFloat(args[0]);
      const count = parseInt(args[1]);
      
      if (!delay || !count || isNaN(delay) || isNaN(count) || count < 1) {
        await event.message.edit({ text: "`Usage: .dspam <delay_seconds> <count> <message>`" });
        return;
      }
      
      const msg = args.slice(2).join(" ");
      await event.message.delete({ revoke: true }).catch(() => {});
      
      for (let i = 0; i < Math.min(count, 50); i++) {
        await event.client?.sendMessage(event.chatId!, { message: msg });
        await new Promise(r => setTimeout(r, delay * 1000));
      }
    }
  },
  {
    name: "Tag All",
    description: "Tags all members in a group.",
    command: "tagall",
    category: "Fun",
    handler: async (event: NewMessageEvent) => {
      const customMsg = event.message.text?.replace(/^\.tagall\s*/, "") || "Wake up!";
      await event.message.edit({ text: "`Fetching members...`" });
      
      try {
        const participants = await event.client?.invoke(new Api.channels.GetParticipants({
          channel: event.chatId!,
          filter: new Api.ChannelParticipantsRecent(),
          offset: 0,
          limit: 100,
          hash: 0 as any
        })) as any;

        if (participants && participants.users) {
           let mentions = "";
           for (const u of participants.users) {
               if (u.bot || u.deleted) continue;
               mentions += `[${u.firstName || 'User'}](tg://user?id=${u.id}) `;
           }
           if (mentions.length > 0) {
              await event.client?.sendMessage(event.chatId!, { message: `${customMsg}\n\n${mentions}` });
              await event.message.delete({ revoke: true }).catch(() => {});
           } else {
              await event.message.edit({ text: "`No members to tag.`" });
           }
        }
      } catch (e: any) {
        await event.message.edit({ text: `\`Failed to tag all: ${e.message}\`` });
      }
    }
  }
];
