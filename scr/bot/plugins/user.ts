import { NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram";

export default [
  {
    name: "Set Name",
    description: "Change your account's first and last name.",
    command: "setname",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.setname\s*/, "") || "";
      if (!text) {
        await event.message.edit({ text: "`Provide a name. Usage: .setname First [Last]`" });
        return;
      }
      const parts = text.split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || "";
      
      try {
        await event.client?.invoke(new Api.account.UpdateProfile({
            firstName,
            lastName
        }));
        await event.message.edit({ text: `\`Name successfully updated to ${firstName} ${lastName}\`` });
      } catch (e: any) {
        await event.message.edit({ text: `\`Failed to update name: ${e.message}\`` });
      }
    }
  },
  {
    name: "Set Bio",
    description: "Change your account's bio.",
    command: "setbio",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.setbio\s*/, "") || "";
      if (!text) {
        await event.message.edit({ text: "`Provide a bio.`" });
        return;
      }
      
      try {
        await event.client?.invoke(new Api.account.UpdateProfile({
            about: text
        }));
        await event.message.edit({ text: `\`Bio successfully updated to:\`\n${text}` });
      } catch (e: any) {
        await event.message.edit({ text: `\`Failed to update bio: ${e.message}\`` });
      }
    }
  },
  {
    name: "Block",
    description: "Block a user.",
    command: "block",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const reply = await event.message.getReplyMessage();
      let userId: any = null;
      if (reply && reply.senderId) {
          userId = reply.senderId;
      } else if (event.message.isPrivate) {
          userId = event.chatId;
      }
      
      if (!userId) {
          await event.message.edit({ text: "`Reply to a user or use in private chat to block.`" });
          return;
      }
      
      try {
        await event.client?.invoke(new Api.contacts.Block({ id: userId }));
        await event.message.edit({ text: `\`Blocked user ${userId}.\`` });
      } catch (e: any) {
        await event.message.edit({ text: `\`Failed to block: ${e.message}\`` });
      }
    }
  },
  {
    name: "Unblock",
    description: "Unblock a user.",
    command: "unblock",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const reply = await event.message.getReplyMessage();
      let userId: any = null;
      if (reply && reply.senderId) {
          userId = reply.senderId;
      } else if (event.message.isPrivate) {
          userId = event.chatId;
      }
      
      if (!userId) {
          await event.message.edit({ text: "`Reply to a user or use in private chat to unblock.`" });
          return;
      }
      
      try {
        await event.client?.invoke(new Api.contacts.Unblock({ id: userId }));
        await event.message.edit({ text: `\`Unblocked user ${userId}.\`` });
      } catch (e: any) {
        await event.message.edit({ text: `\`Failed to unblock: ${e.message}\`` });
      }
    }
  }
];
