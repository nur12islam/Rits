import { NewMessageEvent } from "telegram/events/index.js";
import { getLoadedPlugins } from "../pluginManager.js";
import { COMMAND_PREFIX, assistantBot, botClient } from "../index.js";
import { COMMAND_MAP } from "../commandMap.js";

export default {
  name: "Help",
  description: "List all available RITS commands.",
  command: "help",
  category: "General",
  handler: async (event: NewMessageEvent) => {
    // If assistantBot is available, use inline query results to show buttons
    if (assistantBot) {
        if ((event as any).isAssistantBot) {
            try {
                const { Button } = await import("telegram/tl/custom/button.js");
                const { COMMAND_MAP } = await import("../commandMap.js");
                const buttons = [];
                let row = [];
                for (const topKey of Object.keys(COMMAND_MAP)) {
                    const topItem = COMMAND_MAP[topKey];
                    row.push(Button.inline(topItem.title, Buffer.from(`top_${topKey}`)));
                    if (row.length === 2) {
                        buttons.push(row);
                        row = [];
                    }
                }
                if (row.length > 0) buttons.push(row);
                
                await event.message.reply({ 
                    message: "🖥 **RITS Main Menu** 🖥\nSelect a category to view commands.", 
                    buttons: buttons 
                });
                return;
            } catch (e: any) {
                console.error("Failed to send assistant bot help menu directly:", e);
            }
        } else {
            try {
                const me = await assistantBot.getMe() as any;
                const results = await botClient!.inlineQuery(me.username, "help");
                if (results && results.length > 0) {
                     await results[0].click(event.chatId);
                     await event.message.delete({ revoke: true }).catch(() => {});
                     return;
                }
            } catch (e: any) {
                console.error("Inline query for help failed:", e);
            }
        }
    }

    const text = event.message.text || "";
    const args = text.split(" ").slice(1);
    
    if (args.length === 0) {
        let helpText = "🤖 Personal RITS Modules 🤖\n\n";
        helpText += "Categories:\n";
        for (const topKey of Object.keys(COMMAND_MAP)) {
            const topItem = COMMAND_MAP[topKey];
            helpText += `➤ ${COMMAND_PREFIX}help ${topKey} - ${topItem.title}\n`;
        }
        await event.message.edit({ text: helpText });
    } else {
        const query = args.join(" ").toLowerCase();
        
        // 1. Is it a top category?
        if (COMMAND_MAP[query]) {
            const topItem = COMMAND_MAP[query];
            let helpText = `🤖 ${topItem.title} 🤖\n\n`;
            
            if (topItem.categories) {
                for (const subKey of Object.keys(topItem.categories)) {
                    const subItem = topItem.categories[subKey];
                    helpText += `➤ ${COMMAND_PREFIX}help ${subKey} - ${subItem.title}\n`;
                }
            } else if (topItem.commands) {
                for (const cmdName of topItem.commands) {
                    const plugins = getLoadedPlugins();
                    const p = plugins.find(x => x.command === cmdName);
                    if (p) {
                        helpText += `${COMMAND_PREFIX}${p.command} - ${p.description}\n`;
                    } else {
                        helpText += `${COMMAND_PREFIX}${cmdName} - (Not implemented)\n`;
                    }
                }
            }
            helpText += `\n➤ ${COMMAND_PREFIX}help to go back`;
            await event.message.edit({ text: helpText });
            return;
        }
        
        // 2. Is it a subcategory?
        let foundSubItem = null;
        for (const topKey of Object.keys(COMMAND_MAP)) {
            const topItem = COMMAND_MAP[topKey];
            if (topItem.categories && topItem.categories[query]) {
                foundSubItem = topItem.categories[query];
                break;
            }
        }
        
        if (foundSubItem) {
            let helpText = `🤖 ${foundSubItem.title} 🤖\n\n`;
            for (const cmdName of foundSubItem.commands) {
                const plugins = getLoadedPlugins();
                const p = plugins.find(x => x.command === cmdName);
                if (p) {
                    helpText += `${COMMAND_PREFIX}${p.command} - ${p.description}\n`;
                } else {
                    helpText += `${COMMAND_PREFIX}${cmdName} - (Not implemented)\n`;
                }
            }
            helpText += `\n➤ ${COMMAND_PREFIX}help to go back`;
            await event.message.edit({ text: helpText });
            return;
        }

        // 3. Is it a command?
        const plugins = getLoadedPlugins();
        const cmd = plugins.find(p => p.command === query);
        if (cmd) {
           const helpText = `🗃 Plugin Status 🗃\n\n🔖 Plugin : ${cmd.name}\n📝 Use : ${cmd.description}\n⚔ Command: ${COMMAND_PREFIX}${cmd.command}\n✅ Loaded : True`;
           await event.message.edit({ text: helpText });
        } else {
           await event.message.edit({ text: `\`Category or command '${query}' not found.\`` });
        }
    }
  }
};
