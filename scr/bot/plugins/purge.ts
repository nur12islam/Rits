import { NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram";
import { logToChannel } from "../index.js";

async function extractUserAndText(event: NewMessageEvent, text: string): Promise<[any, string, Record<string, string>]> {
    const parts = text.split(" ").slice(1);
    const flags: Record<string, string> = {};
    let userId: any = null;
    let textParts: string[] = [];
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith("-")) {
            const match = part.match(/^-([a-z]+)(\d*)$/i);
            if (match) {
                const flagName = `-${match[1]}`;
                let flagVal = match[2];
                if (!flagVal && i + 1 < parts.length && /^\d+$/.test(parts[i+1])) {
                    flagVal = parts[i+1];
                    i++;
                } else if (!flagVal) {
                    flagVal = "1";
                }
                flags[flagName] = flagVal;
            } else if (part === "-all") {
                flags["-all"] = "1";
            }
        } else if (!userId && (part.startsWith("@") || /^\d+$/.test(part) || (part && !textParts.length))) {
            userId = part;
        } else {
            textParts.push(part);
        }
    }
    
    if (event.message.replyToMsgId) {
        const replyMsg = await event.message.getReplyMessage();
        if (replyMsg && replyMsg.senderId) {
            userId = replyMsg.senderId.toString();
        }
    }
    
    return [userId, textParts.join(" "), flags];
}

export default {
    name: "Purge",
    description: "Purge messages from user or between messages.",
    command: "purge",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const parts = text.split(" ").slice(1);
        
        let fromUserId: any = null;
        let limit = 10;
        let startMsgId = 0;
        let stopMsgId = event.message.id;
        
        const flags: Record<string, string> = {};
        let inputStr = "";
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith("-")) {
                const match = part.match(/^-([a-z]+)(\d*)$/i);
                if (match) {
                    flags[match[1]] = match[2] || "1";
                }
            } else {
                inputStr = parts.slice(i).join(" ");
                break;
            }
        }
        
        const replyMsg = await event.message.getReplyMessage();
        if (replyMsg) {
            startMsgId = replyMsg.id;
            limit = stopMsgId - startMsgId;
            if (flags["u"]) {
                fromUserId = replyMsg.senderId?.toString();
            }
        } else {
            limit = Math.min(1000, parseInt(flags["l"] || "10", 10));
            startMsgId = stopMsgId - limit;
        }
        
        if (!fromUserId && inputStr) {
            try {
                const user = await event.client?.getEntity(inputStr);
                if (user) {
                    fromUserId = (user as any).id?.toString();
                }
            } catch (e) {
                // ignore
            }
        }
        
        await event.message.edit({ text: "`purging ...`" });
        
        const chatId = event.message.chatId!;
        let purgedCount = 0;
        let listToPurge: number[] = [];
        
        const deleteMsgs = async () => {
            if (listToPurge.length > 0) {
                try {
                    await event.client?.deleteMessages(chatId, listToPurge, {
                        revoke: true
                    });
                    purgedCount += listToPurge.length;
                    listToPurge = [];
                } catch (e) {
                    // ignore
                }
            }
        };
        
        const startTime = Date.now();
        
        try {
            const messages = await event.client?.getMessages(chatId, {
                limit: limit,
                offsetId: stopMsgId + 1, // we want to include stopMsgId? Yes, if it is to be deleted
                minId: startMsgId - 1
            }) || [];
            
            for (const msg of messages) {
                if (msg.id < startMsgId) break; // Should not happen with minId
                if (fromUserId && msg.senderId?.toString() !== fromUserId) {
                    continue;
                }
                listToPurge.push(msg.id);
                if (listToPurge.length >= 100) {
                    await deleteMsgs();
                }
            }
            
            if (listToPurge.length > 0) {
                await deleteMsgs();
            }
            
            // Delete the purge command message itself if not already deleted
            try {
                await event.message.delete();
            } catch (e) {}
            
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
            const out = `<u>purged</u> ${purgedCount} messages in ${timeTaken} seconds.`;
            const sentMsg = await event.client?.sendMessage(chatId, { message: out, parseMode: "html" });
            
            if (sentMsg) {
                setTimeout(() => {
                    sentMsg.delete().catch(() => {});
                }, 3000);
            }
            
        } catch (e: any) {
            await event.client?.sendMessage(chatId, { message: `Error: ${e.message}` });
        }
    }
};
