import { NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram";

export default [
  {
    name: "Set Name",
    description: "Change your profile name.",
    command: "setname",
    category: "General",
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.setname\s*/, "") || "";
      if (!text) return;
      const parts = text.split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ");
      
      try {
          await event.client?.invoke(new Api.account.UpdateProfile({
              firstName,
              lastName
          }));
          await event.message.edit({ text: `\`Name changed to: ${firstName} ${lastName}\`` });
      } catch (e) {
          await event.message.edit({ text: "`Failed to change name.`" });
      }
    }
  },
  {
    name: "Set Bio",
    description: "Change your profile bio.",
    command: "setbio",
    category: "General",
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.setbio\s*/, "") || "";
      if (!text) return;
      
      try {
          await event.client?.invoke(new Api.account.UpdateProfile({
              about: text
          }));
          await event.message.edit({ text: `\`Bio changed to: ${text}\`` });
      } catch (e) {
          await event.message.edit({ text: "`Failed to change bio.`" });
      }
    }
  },
  {
    name: "Block User",
    description: "Blocks the replied user.",
    command: "block",
    category: "General",
    handler: async (event: NewMessageEvent) => {
      const reply = await event.message.getReplyMessage();
      if (!reply || !reply.senderId) {
          await event.message.edit({ text: "`Reply to a user to block.`" });
          return;
      }
      try {
          await event.client?.invoke(new Api.contacts.Block({
              id: reply.senderId
          }));
          await event.message.edit({ text: `\`Successfully blocked user.\`` });
      } catch (e) {
          await event.message.edit({ text: "`Failed to block user.`" });
      }
    }
  }
];
