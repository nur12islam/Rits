import { NewMessageEvent } from "telegram/events/index.js";
import axios from "axios";
import fs from "fs";
import path from "path";

async function pasteSpaceBin(content: string, ext = "txt") {
    try {
        const res = await axios.post("https://spaceb.in/api/v1/documents/", {
            content,
            extension: ext
        });
        if (res.data && res.data.payload && res.data.payload.id) {
            return `https://spaceb.in/${res.data.payload.id}`;
        }
    } catch (e) {
        console.error("Spacebin error:", e);
    }
    return null;
}

async function pasteNekoBin(content: string) {
    try {
        const res = await axios.post("https://nekobin.com/api/documents", { content });
        if (res.data && res.data.result && res.data.result.key) {
            return `https://nekobin.com/${res.data.result.key}`;
        }
    } catch (e) {
        console.error("Nekobin error:", e);
    }
    return null;
}

async function getSpaceBin(id: string) {
    try {
        const res = await axios.get(`https://spaceb.in/api/v1/documents/${id}/raw`);
        return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    } catch (e) {
        console.error("Spacebin get error:", e);
    }
    return null;
}

async function getNekoBin(id: string) {
    try {
        const res = await axios.get(`https://nekobin.com/api/documents/${id}`);
        if (res.data && res.data.result && res.data.result.content) {
            return res.data.result.content;
        }
    } catch (e) {
        console.error("Nekobin get error:", e);
    }
    return null;
}

export const pastePlugin = {
    name: "Paste",
    description: "Pastes text or text_file to a bin service",
    command: "paste",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
        await event.message.edit({ text: "`Processing...`" });
        
        let text = event.message.text?.split(" ").slice(1).join(" ") || "";
        let fileType = "txt";

        if (!text && event.message.replyToMsgId) {
            const reply = await event.message.getReplyMessage();
            if (reply?.media && reply.file) {
                if (Number(reply.file.size) > 2 * 1024 * 1024) { // 2MB limit
                    await event.message.edit({ text: "`File is too large! Maximum 2MB allowed.`" });
                    return;
                }
                const buffer = await event.client?.downloadMedia(reply.media);
                if (buffer) {
                    text = buffer.toString("utf8");
                    fileType = reply.file.name ? reply.file.name.split('.').pop() || "txt" : "txt";
                }
            } else if (reply?.text) {
                text = reply.text;
            }
        }

        if (!text) {
            await event.message.edit({ text: "`Input not found! Provide text or reply to a text message/file.`" });
            return;
        }

        await event.message.edit({ text: "`Pasting text to [SpaceBin] ...`" });
        
        let url = await pasteSpaceBin(text, fileType);
        let service = "SpaceBin";
        
        if (!url) {
            await event.message.edit({ text: "`SpaceBin failed, trying [NekoBin] ...`" });
            url = await pasteNekoBin(text);
            service = "NekoBin";
        }
        
        if (!url) {
            await event.message.edit({ text: "`Failed to reach bin services.`" });
            return;
        }

        await event.message.edit({ 
            text: `**${service}** [URL](${url})`, 
            linkPreview: false 
        });
    }
};

export const getPastePlugin = {
    name: "Get Paste",
    description: "Gets the content of a paste url",
    command: "getpaste",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
        const link = event.message.text?.split(" ")[1];
        
        if (!link) {
            await event.message.edit({ text: "`Input not found! Provide a paste URL.`" });
            return;
        }

        await event.message.edit({ text: "`Finding Service...`" });

        let content = null;
        let service = "";

        if (link.includes("spaceb.in")) {
            const match = link.match(/spaceb\.in\/([a-zA-Z0-9]+)/);
            if (match) {
                service = "SpaceBin";
                await event.message.edit({ text: `\`Getting paste content [SpaceBin] ...\`` });
                content = await getSpaceBin(match[1]);
            }
        } else if (link.includes("nekobin.com")) {
            const match = link.match(/nekobin\.com\/([a-zA-Z0-9]+)/);
            if (match) {
                service = "NekoBin";
                await event.message.edit({ text: `\`Getting paste content [NekoBin] ...\`` });
                content = await getNekoBin(match[1]);
            }
        }

        if (content === null && service !== "") {
            await event.message.edit({ text: `\`Failed to fetch content from ${service}.\`` });
            return;
        } else if (content === null) {
            await event.message.edit({ text: "`Is that even a paste url? Supported: SpaceBin, NekoBin`" });
            return;
        }

        if (content.length > 4000) {
            // Need to send as file
            const tempFile = path.join(process.cwd(), "downloads", `paste_${Date.now()}.txt`);
            if (!fs.existsSync(path.dirname(tempFile))) {
                fs.mkdirSync(path.dirname(tempFile), { recursive: true });
            }
            fs.writeFileSync(tempFile, content);
            
            await event.client?.sendMessage(event.message.chatId!, {
                file: tempFile,
                message: `**Content from ${service}**`
            });
            await event.message.delete();
            fs.unlinkSync(tempFile);
        } else {
            await event.message.edit({ text: `**Content** :\n\`\`\`\n${content}\n\`\`\`` });
        }
    }
};

export default [pastePlugin, getPastePlugin];
