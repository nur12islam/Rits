import { NewMessageEvent } from "telegram/events/index.js";

export default {
  name: "ID",
  description: "Get the ID of the current chat, replied user, or yourself.",
  command: "id",
    category: "General",
  handler: async (event: NewMessageEvent) => {
    let text = `**Chat ID:** \`${event.chatId}\``;

    if (event.message.replyToMsgId) {
      const replyMsg = await event.message.getReplyMessage();
      if (replyMsg && replyMsg.senderId) {
        text += `\n**Replied User ID:** \`${replyMsg.senderId}\``;
      }
    }

    await event.message.edit({ text });
  }
};
