import { NewMessageEvent } from "telegram/events/index.js";
import { isOutgoing, logToChannel } from "../index.js";
import fs from "fs";
import { Button } from "telegram/tl/custom/button.js";

const AFK_FILE = "afk.json";

const AFK_REASONS = [
    "I'm busy right now. Please talk in a bag and when I come back you can just give me the bag!",
    "I'm away right now. If you need anything, leave a message after the beep: \`beeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeep!\`",
    "You missed me, next time aim better.",
    "I'll be back in a few minutes and if I'm not...,\nwait longer.",
    "I'm not here right now, so I'm probably somewhere else.",
    "Roses are red,\nViolets are blue,\nLeave me a message,\nAnd I'll get back to you.",
    "Sometimes the best things in life are worth waiting for…\nI'll be right back.",
    "I'll be right back,\nbut if I'm not right back,\nI'll be back later.",
    "If you haven't figured it out already,\nI'm not here.",
    "I'm away over 7 seas and 7 countries,\n7 waters and 7 continents,\n7 mountains and 7 hills,\n7 plains and 7 mounds,\n7 pools and 7 lakes,\n7 springs and 7 meadows,\n7 cities and 7 neighborhoods,\n7 blocks and 7 houses...\nWhere not even your messages can reach me!",
    "I'm away from the keyboard at the moment, but if you'll scream loud enough at your screen,\n    I might just hear you.",
    "I went that way\n>>>>>",
    "I went this way\n<<<<<",
    "Please leave a message and make me feel even more important than I already am.",
    "If I were here,\nI'd tell you where I am.\n\nBut I'm not,\nso ask me when I return...",
    "I am away!\nI don't know when I'll be back!\nHopefully a few minutes from now!",
    "I'm not available right now so please leave your name, number, \n    and address and I will stalk you later. :P",
    "Sorry, I'm not here right now.\nFeel free to talk to my userbot as long as you like.\nI'll get back to you later.",
    "I bet you were expecting an away message!",
    "Life is so short, there are so many things to do...\nI'm away doing one of them..",
    "I am not here right now...\nbut if I was...\n\nwouldn't that be awesome?"
];

let afkData: {
  isAfk: boolean;
  reason: string;
  time: number;
  users: Record<string, { pcount: number; gcount: number; mention: string }>;
} = {
  isAfk: false,
  reason: "",
  time: 0,
  users: {}
};

function loadAfk() {
  try {
    if (fs.existsSync(AFK_FILE)) {
      const data = JSON.parse(fs.readFileSync(AFK_FILE, "utf8"));
      afkData = { ...afkData, ...data };
    }
  } catch (e) {}
}

function saveAfk() {
  try {
    fs.writeFileSync(AFK_FILE, JSON.stringify(afkData, null, 2));
  } catch (e) {}
}

loadAfk();

function formatAfkTime(ms: number) {
    let secs = Math.floor(ms / 1000);
    if (secs < 60) return "just now";
    const m = Math.floor(secs / 60) % 60;
    const h = Math.floor(secs / 3600) % 24;
    const d = Math.floor(secs / 86400);
    
    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    
    return parts.join(" ") || "just now";
}

export default [
  {
    name: "AFK",
    description: "Set your status to Away From Keyboard.",
    command: "afk",
    category: "General",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const reason = text.split(" ").slice(1).join(" ") || "";
        
        afkData.isAfk = true;
        afkData.reason = reason;
        afkData.time = Date.now();
        afkData.users = {};
        saveAfk();
        
        const logReason = reason || "No reason provided";
        await logToChannel(`You went AFK! : \`${logReason}\``);
        await event.message.edit({ text: "`You went AFK!`" });
    }
  }
];

export const rawListener = async (event: NewMessageEvent) => {
    if (isOutgoing(event) && afkData.isAfk) {
        if (event.message.text && event.message.text.startsWith(".afk")) return;
        
        afkData.isAfk = false;
        
        const afkTimeMs = Date.now() - afkData.time;
        const afkTimeStr = formatAfkTime(afkTimeMs);
        
        const msg = await event.message.reply({ message: "`I'm no longer AFK!`" });
        
        const usersEntries = Object.entries(afkData.users);
        if (usersEntries.length > 0) {
            let p_msg = '';
            let g_msg = '';
            let p_count = 0;
            let g_count = 0;
            
            const buttons = [];
            let currentRow = [];
            
            for (const [userId, u] of usersEntries) {
                if (u.pcount > 0) {
                    p_msg += `👤 ${u.mention} ✉️ **${u.pcount}**\n`;
                    p_count += u.pcount;
                }
                if (u.gcount > 0) {
                    g_msg += `👥 ${u.mention} ✉️ **${u.gcount}**\n`;
                    g_count += u.gcount;
                }
                
                currentRow.push(Button.url(u.mention, `tg://openmessage?user_id=${userId}`));
                if (currentRow.length === 2) {
                    buttons.push(currentRow);
                    currentRow = [];
                }
            }
            if (currentRow.length > 0) buttons.push(currentRow);
            
            const totalMsg = p_count + g_count;
            await msg.edit({
                text: `\`You recieved ${totalMsg} messages while you were away. Check log for more details.\`\n\n**AFK time** : __${afkTimeStr}__`
            });
            
            let logOut = `You've recieved **${totalMsg}** messages from **${usersEntries.length}** users while you were away!\n\n**AFK time** : __${afkTimeStr}__\n`;
            if (p_count > 0) logOut += `\n**${p_count} Private Messages:**\n\n${p_msg}`;
            if (g_count > 0) logOut += `\n**${g_count} Group Messages:**\n\n${g_msg}`;
            
            await logToChannel(logOut, buttons);
            
            afkData.users = {};
            saveAfk();
        } else {
            setTimeout(() => {
                msg.delete().catch(() => {});
            }, 3000);
            saveAfk();
        }
        return;
    }

    if (!isOutgoing(event) && afkData.isAfk) {
        const message = event.message;
        const sender = await message.getSender() as any;
        if (!sender || sender.bot || sender.verified || sender.isSupport || sender.id.toString() === "777000") return;

        const isPrivate = message.isPrivate;
        const chatId = event.chatId?.toString();
        const userId = sender.id.toString();
        
        let mentioned = false;
        if (message.mentioned) {
            mentioned = true;
        }
        
        if (message.replyToMsgId) {
            const replyTo = await message.getReplyMessage();
            if (replyTo && replyTo.out) {
                mentioned = true;
            }
        }

        if (isPrivate || mentioned) {
            const afkTimeStr = formatAfkTime(Date.now() - afkData.time);
            
            const nameText = sender.firstName || sender.username || "User";
            const buttons = [[Button.url(nameText, `tg://openmessage?user_id=${sender.id}`)]];
            
            if (!afkData.users[userId]) {
                afkData.users[userId] = { pcount: 0, gcount: 0, mention: nameText };
            }

            // To avoid spamming back on every message, Userge uses random(2, 4) probability
            // Let's reply every 3 messages for simplicity, or on the first message
            const totalUserMsgs = afkData.users[userId].pcount + afkData.users[userId].gcount;
            
            if (totalUserMsgs % 3 === 0) {
                let outStr = "";
                if (afkData.reason) {
                    outStr = `I'm **AFK** right now.\nReason: \`${afkData.reason}\`\nLast Seen: \`${afkTimeStr} ago\``;
                } else {
                    outStr = AFK_REASONS[Math.floor(Math.random() * AFK_REASONS.length)];
                }
                await message.reply({ message: outStr });
            }

            if (isPrivate) {
                afkData.users[userId].pcount += 1;
                await logToChannel(`#PRIVATE\n${nameText} send you\n\n${message.text || "Media"}`, buttons);
            } else {
                afkData.users[userId].gcount += 1;
                let chatTitle = "Group";
                const chat = await message.getChat() as any;
                if (chat) chatTitle = chat.title || chatTitle;
                
                // Constructing link dynamically
                let msgLink = "";
                if (chat && chat.username) {
                     msgLink = `https://t.me/${chat.username}/${message.id}`;
                } else if (chat) {
                     msgLink = `https://t.me/c/${chat.id.toString().replace("-100", "")}/${message.id}`;
                }
                if (msgLink) {
                    buttons[0].push(Button.url("Go to msg", msgLink));
                }
                
                await logToChannel(`#GROUP\n${nameText} tagged you in **${chatTitle}**\n\n${message.text || "Media"}`, buttons);
            }
            
            saveAfk();
        }
    }
};
