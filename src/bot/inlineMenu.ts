import { TelegramClient, Api } from "telegram";
import { Raw } from "telegram/events/Raw.js";
import { CallbackQuery } from "telegram/events/CallbackQuery.js";
import { getLoadedPlugins } from "./pluginManager.js";
import { COMMAND_PREFIX, botClient, assistantBot } from "./index.js";
import { Button } from "telegram/tl/custom/button.js";
import { COMMAND_MAP } from "./commandMap.js";
import { Config } from "./config.js";

export function registerInlineMenus(client: TelegramClient) {
    if (!client) return;

    // Handle Inline Queries
    client.addEventHandler(async (event: any) => {
        if (event instanceof Api.UpdateBotInlineQuery) {
            const queryId = event.queryId;
            const query = event.query;
            const userId = Number(event.userId);

            if (!Config.OWNER_ID.includes(userId) && !Config.SUDO_USERS.includes(userId)) {
                await client.invoke(new Api.messages.SetInlineBotResults({
                    queryId: queryId,
                    results: [
                        new Api.InputBotInlineResult({
                            id: "not_authorized",
                            type: "article",
                            title: "Access Denied",
                            description: "You are not authorized to use this bot's menu.",
                            sendMessage: new Api.InputBotInlineMessageText({
                                message: "🚫 **Access Denied**\nYou are not authorized to use this bot's menu."
                            })
                        })
                    ],
                    cacheTime: 0
                }));
                return;
            }
            
            if (query === "help" || query === "") {
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
                
                await client.invoke(new Api.messages.SetInlineBotResults({
                    queryId: queryId,
                    results: [
                        new Api.InputBotInlineResult({
                            id: "help_menu",
                            type: "article",
                            title: "Main Menu",
                            description: "RITS Main Menu",
                            sendMessage: new Api.InputBotInlineMessageText({
                                message: "🖥 **RITS Main Menu** 🖥\nSelect a category to view commands.",
                                replyMarkup: client.buildReplyMarkup(buttons)
                            })
                        })
                    ],
                    cacheTime: 0
                }));
            }
        }
    }, new Raw({ types: [Api.UpdateBotInlineQuery] }));

    // Handle Callback Queries
    client.addEventHandler(async (event: any) => {
        const userId = Number(event.query?.userId || event.userId || 0);
        
        if (!Config.OWNER_ID.includes(userId) && !Config.SUDO_USERS.includes(userId)) {
            await event.answer({ message: "You are not authorized to use this menu.", alert: true });
            return;
        }

        const data = event.data?.toString("utf8") || "";
        
        if (data.startsWith("top_")) {
            const topKey = data.replace("top_", "");
            const topItem = COMMAND_MAP[topKey];
            if (!topItem) return;

            const buttons = [];
            let row = [];

            if (topItem.categories) {
                // Show subcategories
                for (const subKey of Object.keys(topItem.categories)) {
                    const subItem = topItem.categories[subKey];
                    row.push(Button.inline(subItem.title, Buffer.from(`sub_${topKey}_${subKey}`)));
                    if (row.length === 2) {
                        buttons.push(row);
                        row = [];
                    }
                }
            } else if (topItem.commands) {
                // Show commands directly
                for (const cmdName of topItem.commands) {
                    row.push(Button.inline(`⚔ ${cmdName}`, Buffer.from(`cmd_${topKey}_${cmdName}`)));
                    if (row.length === 2) {
                        buttons.push(row);
                        row = [];
                    }
                }
            }
            if (row.length > 0) buttons.push(row);
            buttons.push([Button.inline("⬅ Back", Buffer.from("back_mm"))]);
            
            const messageText = topItem.categories ? 
                `📂 Subcategories Under : ${topItem.title}` :
                `(${topItem.commands?.length || 0}) Plugin(s) Under : ${topItem.title}`;

            if (event.viaInline) {
                await client.invoke(new Api.messages.EditInlineBotMessage({
                    id: event.query.msgId,
                    message: messageText,
                    replyMarkup: client.buildReplyMarkup(buttons)
                }));
                await event.answer();
            } else {
                await event.edit({ 
                    message: event.messageId,
                    text: messageText,
                    buttons: buttons
                });
            }
        }
        
        if (data.startsWith("sub_")) {
            const parts = data.replace("sub_", "").split("_");
            const topKey = parts[0];
            const subKey = parts.slice(1).join("_");
            const topItem = COMMAND_MAP[topKey];
            const subItem = topItem?.categories?.[subKey];
            
            if (!subItem) return;

            const buttons = [];
            let row = [];
            for (const cmdName of subItem.commands) {
                row.push(Button.inline(`⚔ ${cmdName}`, Buffer.from(`cmd_${topKey}_${cmdName}`)));
                if (row.length === 2) {
                    buttons.push(row);
                    row = [];
                }
            }
            if (row.length > 0) buttons.push(row);
            buttons.push([Button.inline("⬅ Back", Buffer.from(`top_${topKey}`))]);
            
            const messageText = `(${subItem.commands.length}) Plugin(s) Under : ${subItem.title}`;

            if (event.viaInline) {
                await client.invoke(new Api.messages.EditInlineBotMessage({
                    id: event.query.msgId,
                    message: messageText,
                    replyMarkup: client.buildReplyMarkup(buttons)
                }));
                await event.answer();
            } else {
                await event.edit({ 
                    message: event.messageId,
                    text: messageText,
                    buttons: buttons
                });
            }
        }
        
        if (data.startsWith("cmd_")) {
            const parts = data.replace("cmd_", "").split("_");
            const topKey = parts[0];
            const cmdName = parts.slice(1).join("_"); // Wait, what if cmdName has underscores? It can.
            
            const plugins = getLoadedPlugins();
            const p = plugins.find(x => x.command === cmdName);
            
            // Need to figure out back button. If it's in a subcategory, back goes to sub, else back goes to top.
            let backData = `top_${topKey}`;
            const topItem = COMMAND_MAP[topKey];
            if (topItem && topItem.categories) {
                // Find which subcategory has it
                for (const subKey of Object.keys(topItem.categories)) {
                    if (topItem.categories[subKey].commands.includes(cmdName)) {
                        backData = `sub_${topKey}_${subKey}`;
                        break;
                    }
                }
            }
            
            if (p) {
                const buttons = [[Button.inline("⬅ Back", Buffer.from(backData))]];
                const text = `🗃 Plugin Status 🗃\n\n🔖 Plugin : ${p.name}\n📝 Use : ${p.description}\n⚔ Command: ${COMMAND_PREFIX}${p.command}\n✅ Loaded : True`;
                if (event.viaInline) {
                    await client.invoke(new Api.messages.EditInlineBotMessage({
                        id: event.query.msgId,
                        message: text,
                        replyMarkup: client.buildReplyMarkup(buttons)
                    }));
                    await event.answer();
                } else {
                    await event.edit({
                        message: event.messageId,
                        text: text,
                        buttons: buttons
                    });
                }
            } else {
                 const buttons = [[Button.inline("⬅ Back", Buffer.from(backData))]];
                 const text = `🗃 Plugin Status 🗃\n\nCommand ${cmdName} is not yet implemented or loaded.`;
                 if (event.viaInline) {
                    await client.invoke(new Api.messages.EditInlineBotMessage({
                        id: event.query.msgId,
                        message: text,
                        replyMarkup: client.buildReplyMarkup(buttons)
                    }));
                    await event.answer();
                } else {
                    await event.edit({
                        message: event.messageId,
                        text: text,
                        buttons: buttons
                    });
                }
            }
        }
        
        if (data === "back_mm") {
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
            
            const text = "🖥 **RITS Main Menu** 🖥\nSelect a category to view commands.";
            if (event.viaInline) {
                await client.invoke(new Api.messages.EditInlineBotMessage({
                    id: event.query.msgId,
                    message: text,
                    replyMarkup: client.buildReplyMarkup(buttons)
                }));
                await event.answer();
            } else {
                await event.edit({
                    message: event.messageId,
                    text: text,
                    buttons: buttons
                });
            }
        }
    }, new CallbackQuery({}));
}
