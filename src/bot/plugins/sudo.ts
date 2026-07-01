import { NewMessageEvent } from "telegram/events/index.js";
import { sudoUsers, saveSudo } from "../index.js";

export default [
  {
    name: "Add Sudo",
    description: "Add a user to sudo so they can execute commands.",
    command: "addsudo",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const reply = await event.message.getReplyMessage();
      if (reply && reply.senderId) {
        sudoUsers.add(reply.senderId.toString());
        saveSudo();
        await event.message.edit({ text: `\`Successfully added ${reply.senderId} to sudo.\`` });
      } else {
        await event.message.edit({ text: "`Reply to a user to add them to sudo.`" });
      }
    }
  },
  {
    name: "Remove Sudo",
    description: "Remove a user from sudo.",
    command: "rmsudo",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const reply = await event.message.getReplyMessage();
      if (reply && reply.senderId) {
        sudoUsers.delete(reply.senderId.toString());
        saveSudo();
        await event.message.edit({ text: `\`Removed ${reply.senderId} from sudo.\`` });
      } else {
        await event.message.edit({ text: "`Reply to a user to remove them from sudo.`" });
      }
    }
  },
  {
    name: "Sudo List",
    description: "List all sudo users.",
    command: "sudolist",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      if (sudoUsers.size === 0) {
        await event.message.edit({ text: "`No sudo users found.`" });
        return;
      }
      let text = "**🛡 Sudo Users:**\n\n";
      sudoUsers.forEach(id => text += `• \`${id}\`\n`);
      await event.message.edit({ text });
    }
  }
];
