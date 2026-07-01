import { NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram";
import { logToChannel } from "../index.js";
import { Button } from "telegram/tl/custom/button.js";
import fs from "fs";

import { CustomFile } from "telegram/client/uploads.js";

async function extractUserAndText(event: NewMessageEvent, text: string): Promise<[any, string, Record<string, string>]> {
    const parts = text.split(" ").slice(1);
    const flags: Record<string, string> = {};
    let userId: any = null;
    let textParts = [];
    
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

function getPeriodAndTime(flags: Record<string, string>): [number, string] {
    const minutes = parseInt(flags["-m"] || "0", 10);
    const hours = parseInt(flags["-h"] || "0", 10);
    const days = parseInt(flags["-d"] || "0", 10);
    const seconds = parseInt(flags["-s"] || "0", 10); 

    let period = 0;
    let timeStr = "forever";

    if (seconds) {
        period = seconds;
        timeStr = `${seconds}s`;
    } else if (minutes) {
        period = minutes * 60;
        timeStr = `${minutes}m`;
    } else if (hours) {
        period = hours * 3600;
        timeStr = `${hours}h`;
    } else if (days) {
        period = days * 86400;
        timeStr = `${days}d`;
    }

    let untilDate = 0;
    if (period > 0) {
        untilDate = Math.floor(Date.now() / 1000) + period;
    }
    return [untilDate, timeStr];
}

export const promotePlugin = {
    name: "Promote",
    description: "Promotes a user in the group.",
    command: "promote",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [userId, customRank] = await extractUserAndText(event, text);
        
        if (!userId) {
            await event.message.edit({ text: "`no valid user_id or message specified`" });
            return;
        }

        await event.message.edit({ text: "`Trying to Promote User.. Hang on!! ⏳`" });
        const chatId = event.message.chatId!;
        
        try {
            await event.client?.invoke(
                new Api.channels.EditAdmin({
                    channel: chatId,
                    userId: userId,
                    adminRights: new Api.ChatAdminRights({
                        changeInfo: false,
                        postMessages: true,
                        editMessages: true,
                        deleteMessages: true,
                        banUsers: true,
                        inviteUsers: true,
                        pinMessages: true,
                        addAdmins: false,
                        anonymous: false,
                        manageCall: true,
                        manageTopics: true
                    }),
                    rank: customRank.substring(0, 15)
                })
            );
            await event.message.edit({ text: "`👑 Promoted Successfully..`" });
            
            let userEntity: any;
            try { userEntity = await event.client?.getEntity(userId); } catch (e) {}
            
            const nameText = userEntity ? (userEntity.firstName || userEntity.username || "User") : userId;
            const uid = userEntity ? userEntity.id : userId;
            const buttons = [[Button.url(nameText, `tg://openmessage?user_id=${uid}`)]];
            
            let logMsg = `#PROMOTE\n\nUSER: ${nameText} (\`${uid}\`)\nCUSTOM TITLE: \`${customRank || "None"}\`\nCHAT: \`${chatId}\``;
            await logToChannel(logMsg, buttons);
            
        } catch (e: any) {
            await event.message.edit({ text: `\`something went wrong! 🤔\n\n${e.message}\`` });
        }
    }
};

export const demotePlugin = {
    name: "Demote",
    description: "Demotes a user in the group.",
    command: "demote",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [userId] = await extractUserAndText(event, text);
        
        if (!userId) {
            await event.message.edit({ text: "`no valid user_id or message specified`" });
            return;
        }

        await event.message.edit({ text: "`Trying to Demote User.. Hang on!! ⏳`" });
        const chatId = event.message.chatId!;
        
        try {
            await event.client?.invoke(
                new Api.channels.EditAdmin({
                    channel: chatId,
                    userId: userId,
                    adminRights: new Api.ChatAdminRights({
                        changeInfo: false,
                        postMessages: false,
                        editMessages: false,
                        deleteMessages: false,
                        banUsers: false,
                        inviteUsers: false,
                        pinMessages: false,
                        addAdmins: false,
                        anonymous: false,
                        manageCall: false,
                        manageTopics: false
                    }),
                    rank: ""
                })
            );
            await event.message.edit({ text: "`🛡 Demoted Successfully..`" });
            
            let userEntity: any;
            try { userEntity = await event.client?.getEntity(userId); } catch (e) {}
            
            const nameText = userEntity ? (userEntity.firstName || userEntity.username || "User") : userId;
            const uid = userEntity ? userEntity.id : userId;
            const buttons = [[Button.url(nameText, `tg://openmessage?user_id=${uid}`)]];
            
            let logMsg = `#DEMOTE\n\nUSER: ${nameText} (\`${uid}\`)\nCHAT: \`${chatId}\``;
            await logToChannel(logMsg, buttons);
            
        } catch (e: any) {
            await event.message.edit({ text: `\`something went wrong! 🤔\n\n${e.message}\`` });
        }
    }
};

export const banPlugin = {
    name: "Ban",
    description: "Bans a user in the group.",
    command: "ban",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [userId, reason, flags] = await extractUserAndText(event, text);
        
        if (!userId) {
            await event.message.edit({ text: "`no valid user_id or message specified`" });
            return;
        }

        await event.message.edit({ text: "`Trying to Ban User.. Hang on!! ⏳`" });
        const chatId = event.message.chatId!;
        const [untilDate, timeStr] = getPeriodAndTime(flags);
        
        try {
            await event.client?.invoke(
                new Api.channels.EditBanned({
                    channel: chatId,
                    participant: userId,
                    bannedRights: new Api.ChatBannedRights({
                        untilDate: untilDate,
                        viewMessages: true,
                        sendMessages: true,
                        sendMedia: true,
                        sendStickers: true,
                        sendGifs: true,
                        sendGames: true,
                        sendInline: true,
                        embedLinks: true
                    })
                })
            );
            
            let userEntity: any;
            try { userEntity = await event.client?.getEntity(userId); } catch (e) {}
            
            const nameText = userEntity ? (userEntity.firstName || userEntity.username || "User") : userId;
            const uid = userEntity ? userEntity.id : userId;
            const buttons = [[Button.url(nameText, `tg://openmessage?user_id=${uid}`)]];
            
            let logMsg = `#BAN\n\nUSER: ${nameText} (\`${uid}\`)\nCHAT: \`${chatId}\`\nTIME: \`${timeStr}\`\nREASON: \`${reason || "None"}\``;
            await logToChannel(logMsg, buttons);
            await event.message.edit({ text: logMsg });
            
        } catch (e: any) {
            await event.message.edit({ text: `\`something went wrong! 🤔\n\n${e.message}\`` });
        }
    }
};

export const unbanPlugin = {
    name: "Unban",
    description: "Unbans a user in the group.",
    command: "unban",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [userId] = await extractUserAndText(event, text);
        
        if (!userId) {
            await event.message.edit({ text: "`no valid user_id or message specified`" });
            return;
        }

        await event.message.edit({ text: "`Trying to Unban User.. Hang on!! ⏳`" });
        const chatId = event.message.chatId!;
        
        try {
            await event.client?.invoke(
                new Api.channels.EditBanned({
                    channel: chatId,
                    participant: userId,
                    bannedRights: new Api.ChatBannedRights({
                        untilDate: 0,
                        viewMessages: false,
                        sendMessages: false,
                        sendMedia: false,
                        sendStickers: false,
                        sendGifs: false,
                        sendGames: false,
                        sendInline: false,
                        embedLinks: false
                    })
                })
            );
            
            await event.message.edit({ text: "`🛡 Successfully Unbanned..`" });
            
            let userEntity: any;
            try { userEntity = await event.client?.getEntity(userId); } catch (e) {}
            
            const nameText = userEntity ? (userEntity.firstName || userEntity.username || "User") : userId;
            const uid = userEntity ? userEntity.id : userId;
            const buttons = [[Button.url(nameText, `tg://openmessage?user_id=${uid}`)]];
            
            let logMsg = `#UNBAN\n\nUSER: ${nameText} (\`${uid}\`)\nCHAT: \`${chatId}\``;
            await logToChannel(logMsg, buttons);
            
        } catch (e: any) {
            await event.message.edit({ text: `\`something went wrong! 🤔\n\n${e.message}\`` });
        }
    }
};

export const kickPlugin = {
    name: "Kick",
    description: "Kicks a user in the group.",
    command: "kick",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [userId] = await extractUserAndText(event, text);
        
        if (!userId) {
            await event.message.edit({ text: "`no valid user_id or message specified`" });
            return;
        }

        await event.message.edit({ text: "`Trying to Kick User.. Hang on!! ⏳`" });
        const chatId = event.message.chatId!;
        const untilDate = Math.floor(Date.now() / 1000) + 60; // 60s
        
        try {
            await event.client?.invoke(
                new Api.channels.EditBanned({
                    channel: chatId,
                    participant: userId,
                    bannedRights: new Api.ChatBannedRights({
                        untilDate: untilDate,
                        viewMessages: true,
                        sendMessages: true,
                        sendMedia: true,
                        sendStickers: true,
                        sendGifs: true,
                        sendGames: true,
                        sendInline: true,
                        embedLinks: true
                    })
                })
            );
            
            let userEntity: any;
            try { userEntity = await event.client?.getEntity(userId); } catch (e) {}
            
            const nameText = userEntity ? (userEntity.firstName || userEntity.username || "User") : userId;
            const uid = userEntity ? userEntity.id : userId;
            const buttons = [[Button.url(nameText, `tg://openmessage?user_id=${uid}`)]];
            
            let logMsg = `#KICK\n\nUSER: ${nameText} (\`${uid}\`)\nCHAT: \`${chatId}\``;
            await logToChannel(logMsg, buttons);
            await event.message.edit({ text: logMsg });
            
        } catch (e: any) {
            await event.message.edit({ text: `\`something went wrong! 🤔\n\n${e.message}\`` });
        }
    }
};

export const mutePlugin = {
    name: "Mute",
    description: "Mutes a user in the group.",
    command: "mute",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [userId, reason, flags] = await extractUserAndText(event, text);
        
        if (!userId) {
            await event.message.edit({ text: "`no valid user_id or message specified`" });
            return;
        }

        await event.message.edit({ text: "`Trying to Mute User.. Hang on!! ⏳`" });
        const chatId = event.message.chatId!;
        const [untilDate, timeStr] = getPeriodAndTime(flags);
        
        try {
            await event.client?.invoke(
                new Api.channels.EditBanned({
                    channel: chatId,
                    participant: userId,
                    bannedRights: new Api.ChatBannedRights({
                        untilDate: untilDate,
                        viewMessages: false,
                        sendMessages: true,
                        sendMedia: true,
                        sendStickers: true,
                        sendGifs: true,
                        sendGames: true,
                        sendInline: true,
                        embedLinks: true
                    })
                })
            );
            
            let userEntity: any;
            try { userEntity = await event.client?.getEntity(userId); } catch (e) {}
            
            const nameText = userEntity ? (userEntity.firstName || userEntity.username || "User") : userId;
            const uid = userEntity ? userEntity.id : userId;
            const buttons = [[Button.url(nameText, `tg://openmessage?user_id=${uid}`)]];
            
            let logMsg = `#MUTE\n\nUSER: ${nameText} (\`${uid}\`)\nCHAT: \`${chatId}\`\nMUTE UNTIL: \`${timeStr}\`\nREASON: \`${reason || "None"}\``;
            await logToChannel(logMsg, buttons);
            await event.message.edit({ text: logMsg });
            
        } catch (e: any) {
            await event.message.edit({ text: `\`something went wrong! 🤔\n\n${e.message}\`` });
        }
    }
};

export const unmutePlugin = {
    name: "Unmute",
    description: "Unmutes a user in the group.",
    command: "unmute",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [userId] = await extractUserAndText(event, text);
        
        if (!userId) {
            await event.message.edit({ text: "`no valid user_id or message specified`" });
            return;
        }

        await event.message.edit({ text: "`Trying to Unmute User.. Hang on!! ⏳`" });
        const chatId = event.message.chatId!;
        
        try {
            await event.client?.invoke(
                new Api.channels.EditBanned({
                    channel: chatId,
                    participant: userId,
                    bannedRights: new Api.ChatBannedRights({
                        untilDate: 0,
                        viewMessages: false,
                        sendMessages: false,
                        sendMedia: false,
                        sendStickers: false,
                        sendGifs: false,
                        sendGames: false,
                        sendInline: false,
                        embedLinks: false
                    })
                })
            );
            
            await event.message.edit({ text: "`🛡 Successfully Unmuted..`" });
            
            let userEntity: any;
            try { userEntity = await event.client?.getEntity(userId); } catch (e) {}
            
            const nameText = userEntity ? (userEntity.firstName || userEntity.username || "User") : userId;
            const uid = userEntity ? userEntity.id : userId;
            const buttons = [[Button.url(nameText, `tg://openmessage?user_id=${uid}`)]];
            
            let logMsg = `#UNMUTE\n\nUSER: ${nameText} (\`${uid}\`)\nCHAT: \`${chatId}\``;
            await logToChannel(logMsg, buttons);
            
        } catch (e: any) {
            await event.message.edit({ text: `\`something went wrong! 🤔\n\n${e.message}\`` });
        }
    }
};

export const pinPlugin = {
    name: "Pin",
    description: "Pins or unpins a message.",
    command: "pin",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [_, __, flags] = await extractUserAndText(event, text);
        const chatId = event.message.chatId!;
        const unpin = flags["-u"];
        const unpinAll = flags["-all"];
        const silent = flags["-s"];

        try {
            if (unpinAll) {
                await event.client?.invoke(new Api.messages.UnpinAllMessages({
                    peer: chatId
                }));
                await event.message.delete();
                await logToChannel(`#UNPIN_ALL\n\nCHAT: \`${chatId}\``);
            } else if (unpin) {
                if (event.message.replyToMsgId) {
                    await event.client?.invoke(new Api.messages.UpdatePinnedMessage({
                        peer: chatId,
                        id: event.message.replyToMsgId,
                        unpin: true
                    }));
                    await event.message.delete();
                    await logToChannel(`#UNPIN\n\nCHAT: \`${chatId}\``);
                } else {
                    await event.message.edit({ text: "`Reply to a message to unpin it.`" });
                }
            } else {
                if (event.message.replyToMsgId) {
                    await event.client?.invoke(new Api.messages.UpdatePinnedMessage({
                        peer: chatId,
                        id: event.message.replyToMsgId,
                        silent: silent ? true : false,
                        unpin: false
                    }));
                    await event.message.delete();
                    await logToChannel(`#PIN\n\nCHAT: \`${chatId}\``);
                } else {
                    await event.message.edit({ text: "`Reply to a message to pin it.`" });
                }
            }
        } catch (e: any) {
            await event.message.edit({ text: `\`${e.message}\`` });
        }
    }
};

export const gpicPlugin = {
    name: "Gpic",
    description: "Set or delete chat photo.",
    command: "gpic",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [_, __, flags] = await extractUserAndText(event, text);
        const chatId = event.message.chatId!;
        const setPhoto = flags["-s"];
        const deletePhoto = flags["-d"];

        try {
            if (deletePhoto) {
                await event.client?.invoke(new Api.channels.EditPhoto({
                    channel: chatId,
                    photo: new Api.InputChatPhotoEmpty()
                }));
                await event.message.delete();
                await logToChannel(`#GPIC-DELETE\n\nCHAT: \`${chatId}\``);
            } else if (setPhoto) {
                const replyMsg = await event.message.getReplyMessage();
                if (replyMsg && (replyMsg.media || replyMsg.photo || replyMsg.document)) {
                    // Gramjs approach to upload photo and set it
                    const buffer = await event.client?.downloadMedia(replyMsg);
                    if (buffer) {
                        const file = await event.client?.uploadFile({
                            file: new CustomFile(
                                "photo.jpg",
                                buffer.length,
                                "",
                                buffer as Buffer
                            ),
                            workers: 1,
                        });
                        if (file) {
                            await event.client?.invoke(new Api.channels.EditPhoto({
                                channel: chatId,
                                photo: new Api.InputChatUploadedPhoto({
                                    file: file
                                })
                            }));
                            await event.message.delete();
                            await logToChannel(`#GPIC-SET\n\nCHAT: \`${chatId}\``);
                        }
                    }
                } else {
                    await event.message.edit({ text: "`no valid message/picture reply specified`" });
                }
            } else {
                await event.message.edit({ text: "`invalid flag type`" });
            }
        } catch (e: any) {
            await event.message.edit({ text: `\`${e.message}\`` });
        }
    }
};

export const smodePlugin = {
    name: "Smode",
    description: "Turn on/off chat slow mode.",
    command: "smode",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [_, __, flags] = await extractUserAndText(event, text);
        const chatId = event.message.chatId!;
        const off = flags["-o"];
        const [untilDate, timeStr] = getPeriodAndTime(flags);
        const seconds = untilDate > 0 ? (untilDate - Math.floor(Date.now() / 1000)) : 0;

        try {
            if (off) {
                await event.client?.invoke(new Api.channels.ToggleSlowMode({
                    channel: chatId,
                    seconds: 0
                }));
                await event.message.edit({ text: "`⏳ turned off slow mode for chat!`" });
                await logToChannel(`#SLOW_MODE\n\nCHAT: \`${chatId}\`\nSLOW MODE: \`Off\``);
            } else if (seconds > 0) {
                await event.client?.invoke(new Api.channels.ToggleSlowMode({
                    channel: chatId,
                    seconds: seconds
                }));
                await event.message.edit({ text: `\`⏳ turned on ${timeStr} slow mode for chat!\`` });
                await logToChannel(`#SLOW_MODE\n\nCHAT: \`${chatId}\`\nSLOW MODE TIME: \`${timeStr}\``);
            } else {
                await event.message.edit({ text: "`invalid flag type/mode..`" });
            }
        } catch (e: any) {
            await event.message.edit({ text: `\`${e.message}\`` });
        }
    }
};

export const zombiesPlugin = {
    name: "Zombies",
    description: "Clean zombie accounts.",
    command: "zombies",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const [_, __, flags] = await extractUserAndText(event, text);
        const chatId = event.message.chatId!;
        const clean = flags["-c"];

        try {
            if (clean) {
                await event.message.edit({ text: "`Hang on!! cleaning zombie accounts from this chat..`" });
                let delUsers = 0;
                let delAdmins = 0;
                let delTotal = 0;

                const participants = await event.client?.getParticipants(chatId) || [];
                for (const member of participants) {
                    if (member.deleted) {
                        delTotal++;
                        try {
                            await event.client?.invoke(new Api.channels.EditBanned({
                                channel: chatId,
                                participant: member.id,
                                bannedRights: new Api.ChatBannedRights({
                                    untilDate: Math.floor(Date.now() / 1000) + 60,
                                    viewMessages: true,
                                    sendMessages: true,
                                    sendMedia: true,
                                    sendStickers: true,
                                    sendGifs: true,
                                    sendGames: true,
                                    sendInline: true,
                                    embedLinks: true
                                })
                            }));
                            delUsers++;
                        } catch (e) {
                            delAdmins++;
                        }
                    }
                }

                let delStats = `\`👻 Found\` **${delTotal}** \`total zombies..\`\n\`🗑 Cleaned\` **${delUsers}** \`zombie (deleted) accounts from this chat..\``;
                if (delAdmins > 0) {
                    delStats += `\n🛡 **${delAdmins}** \`deleted admin accounts are skipped!!\``;
                }

                await event.message.edit({ text: delStats });
                await logToChannel(`#ZOMBIE_CLEAN\n\nCHAT: \`${chatId}\`\nTOTAL ZOMBIE COUNT: \`${delTotal}\`\nCLEANED ZOMBIE COUNT: \`${delUsers}\`\nZOMBIE ADMIN COUNT: \`${delAdmins}\``);

            } else {
                await event.message.edit({ text: "`🔎 Searching for zombie accounts in this chat..`" });
                let delUsers = 0;
                const participants = await event.client?.getParticipants(chatId) || [];
                for (const member of participants) {
                    if (member.deleted) {
                        delUsers++;
                    }
                }

                if (delUsers > 0) {
                    const delStats = `\`Found\` **${delUsers}** \`zombie accounts in this chat.\``;
                    await event.message.edit({ text: `🕵️‍♂️ ${delStats} \`you can clean them using .zombies -c\`` });
                    await logToChannel(`#ZOMBIE_CHECK\n\nCHAT: \`${chatId}\`\nZOMBIE COUNT: \`${delUsers}\``);
                } else {
                    const delStats = String.raw`\`Zero zombie accounts found in this chat... WOOHOO group is clean.. \^o^/\``;
                    await event.message.edit({ text: delStats });
                    await logToChannel(String.raw`#ZOMBIE_CHECK\n\nCHAT: \`${chatId}\`\nZOMBIE COUNT: \`WOOHOO group is clean.. \^o^/\``);
                }
            }
        } catch (e: any) {
            await event.message.edit({ text: `\`${e.message}\`` });
        }
    }
};

export default [
    promotePlugin,
    demotePlugin,
    banPlugin,
    unbanPlugin,
    kickPlugin,
    mutePlugin,
    unmutePlugin,
    pinPlugin,
    gpicPlugin,
    smodePlugin,
    zombiesPlugin
];
