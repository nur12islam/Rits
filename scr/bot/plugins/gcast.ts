import { NewMessageEvent } from "telegram/events/index.js";

export default {
  name: "Global Cast",
  description: "Broadcast a message to all groups and channels you are in.",
  command: "gcast",
    category: "Admin",
  ownerOnly: true,
  handler: async (event: NewMessageEvent) => {
    const text = event.message.text?.replace(/^\.gcast\s*/, "") || "";
    
    if (!text) {
      await event.message.edit({ text: "`Provide a message to broadcast. Usage: .gcast <message>`" });
      return;
    }
    
    await event.message.edit({ text: "`Broadcasting message... Please wait.`" });
    
    let success = 0;
    let fail = 0;
    
    try {
      const dialogs = await event.client?.getDialogs({});
      
      if (dialogs) {
        for (const dialog of dialogs) {
          if (dialog.isGroup || dialog.isChannel) {
            try {
              await event.client?.sendMessage(dialog.id, { message: text });
              success++;
              // Sleep to avoid flood waits
              await new Promise(r => setTimeout(r, 500));
            } catch (e) {
              fail++;
            }
          }
        }
      }
      
      await event.message.edit({ text: `**Broadcast Complete!**\n\n✅ **Success:** \`${success}\`\n❌ **Failed:** \`${fail}\`` });
    } catch (e: any) {
      await event.message.edit({ text: `\`Broadcast failed: ${e.message}\`` });
    }
  }
};
