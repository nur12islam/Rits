import { NewMessageEvent } from "telegram/events/index.js";
import { appLogs } from "../logger.js";
import fs from "fs";
import path from "path";

export default [
  {
    name: "Logs",
    description: "Check RITS logs.",
    command: "logs",
    category: "Developer",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      await event.message.edit({ text: "`checking logs ...`" });
      if (appLogs.length === 0) {
        await event.message.edit({ text: "`no logs found`" });
        return;
      }
      
      const logsTxt = appLogs.slice(-40).join("\n");
      const logFile = path.join(process.cwd(), "logs", "rits.log");
      
      if (fs.existsSync(logFile)) {
        await event.message.delete({ revoke: true }).catch(() => {});
        await event.client?.sendMessage(event.chatId!, {
            file: logFile,
            message: `**RITS Logs** (Last ${appLogs.length} lines)`
        });
      } else {
        await event.message.edit({ text: `**Logs:**\n\`\`\`\n${logsTxt}\n\`\`\`` });
      }
    }
  },
  {
    name: "JSON",
    description: "Message object to JSON.",
    command: "json",
    category: "Developer",
    handler: async (event: NewMessageEvent) => {
      const reply = await event.message.getReplyMessage();
      const targetMsg = reply || event.message;
      const jsonStr = JSON.stringify(targetMsg, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      , 2);
      
      if (jsonStr.length > 4000) {
        const filePath = path.join(process.cwd(), "json.txt");
        fs.writeFileSync(filePath, jsonStr);
        await event.message.delete({ revoke: true }).catch(() => {});
        await event.client?.sendMessage(event.chatId!, {
            file: filePath,
            message: "Too Large"
        });
        fs.unlinkSync(filePath);
      } else {
        await event.message.edit({ text: `\`\`\`json\n${jsonStr}\n\`\`\`` });
      }
    }
  },
  {
    name: "Status",
    description: "List plugins, commands, filters status.",
    command: "status",
    category: "Developer",
    handler: async (event: NewMessageEvent) => {
        // We'll dynamically read from pluginManager
        const { getLoadedPlugins } = await import("../pluginManager.js");
        const plugins = getLoadedPlugins();
        
        let out = `📊 **--RITS Status--** 📊\n\n`;
        out += `🗃 **Plugins** : \`${plugins.length}\`\n`;
        out += `        ✅ **Loaded** : \`${plugins.length}\`\n`;
        out += `        ❎ **Unloaded** : \`0\`\n\n`;
        
        out += `⚔ **Commands** : \`${plugins.length}\`\n`;
        
        await event.message.edit({ text: out });
    }
  }
];
