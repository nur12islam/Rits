import { NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram";

export default [
  {
    name: "Join Chat",
    description: "Join a channel or group via link.",
    command: "join",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text || "";
      const link = text.split(" ")[1];
      if (!link) {
        await event.message.edit({ text: "`Provide a valid invite link or username.`" });
        return;
      }

      try {
        if (link.includes("joinchat") || link.includes("+")) {
          const hash = link.split("/").pop()?.replace("+", "") || "";
          await event.client?.invoke(new Api.messages.ImportChatInvite({ hash }));
        } else {
          await event.client?.invoke(new Api.channels.JoinChannel({ channel: link }));
        }
        await event.message.edit({ text: `\`Successfully joined ${link}\`` });
      } catch (e: any) {
        await event.message.edit({ text: `\`Failed to join: ${e.message}\`` });
      }
    }
  },
  {
    name: "Leave Chat",
    description: "Leave the current channel or group.",
    command: "leave",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      try {
        await event.client?.invoke(new Api.channels.LeaveChannel({ channel: event.chatId! }));
      } catch (e: any) {
        await event.message.edit({ text: `\`Failed to leave: ${e.message}\`` });
      }
    }
  },
  {
    name: "Add Bot / User",
    description: "Add a bot or user to the current group/channel.",
    command: "addbot",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text || "";
      const user = text.split(" ")[1];
      if (!user) {
        await event.message.edit({ text: "`Provide a username to add.`" });
        return;
      }

      try {
         // InviteToChannel works for megagroups and channels
         await event.client?.invoke(new Api.channels.InviteToChannel({
             channel: event.chatId!,
             users: [user]
         }));
         await event.message.edit({ text: `\`Added ${user} to the chat.\`` });
      } catch (e: any) {
         // fallback to AddChatUser if it's a basic group
         try {
            await event.client?.invoke(new Api.messages.AddChatUser({
                chatId: event.chatId as any,
                userId: user,
                fwdLimit: 0
            }));
            await event.message.edit({ text: `\`Added ${user} to the group.\`` });
         } catch (fallbackErr: any) {
            await event.message.edit({ text: `\`Failed to add user: ${e.message}\`` });
         }
      }
    }
  }
];
