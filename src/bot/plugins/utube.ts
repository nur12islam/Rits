import { NewMessageEvent } from "telegram/events/index.js";
import ytdl from "@distube/ytdl-core";
import fs from "fs";
import path from "path";

export const ytDownloadPlugin = {
    name: "YouTube Downloader",
    description: "Download videos from YouTube",
    command: "ytdl",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const parts = text.split(" ").slice(1);
        let link = parts.join(" ").trim();
        
        if (!link && event.message.replyToMsgId) {
            const reply = await event.message.getReplyMessage();
            link = reply?.text || "";
        }
        
        if (!link) {
            await event.message.edit({ text: "`Please provide a valid YouTube link.`" });
            return;
        }

        if (!ytdl.validateURL(link)) {
            await event.message.edit({ text: "`Invalid YouTube URL.`" });
            return;
        }

        await event.message.edit({ text: "⏳ **Fetching video info...**" });
        
        try {
            const info = await ytdl.getInfo(link);
            const title = info.videoDetails.title.replace(/[\\/:*?"<>|]/g, "");
            
            const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });
            if (!format) {
                await event.message.edit({ text: "❌ **Could not find a suitable format with both video and audio.**" });
                return;
            }

            const downDir = path.join(process.cwd(), "downloads");
            if (!fs.existsSync(downDir)) {
                fs.mkdirSync(downDir, { recursive: true });
            }
            
            const filePath = path.join(downDir, `${title}.mp4`);
            
            await event.message.edit({ text: "📥 **Downloading video...**" });
            
            const videoStream = ytdl(link, { format });
            const fileStream = fs.createWriteStream(filePath);
            
            let lastUpdate = Date.now();
            let downloadedBytes = 0;
            const totalBytes = Number(format.contentLength);

            videoStream.on('progress', (chunkLength, downloaded, total) => {
                const now = Date.now();
                if (now - lastUpdate > 3000 && total > 0) {
                    lastUpdate = now;
                    const percent = ((downloaded / total) * 100).toFixed(2);
                    const speed = (downloaded / ((now - lastUpdate) / 1000) / 1024 / 1024).toFixed(2); // Simple speed approx
                    event.message.edit({ text: `📥 **Downloading...**\n**Progress:** ${percent}%\n**Size:** ${(total / 1024 / 1024).toFixed(2)} MB` }).catch(() => {});
                }
            });

            videoStream.pipe(fileStream);
            
            videoStream.on('end', async () => {
                await event.message.edit({ text: "📤 **Uploading video to Telegram...**" });
                try {
                    await event.client?.sendMessage(event.message.chatId!, {
                        file: filePath,
                        message: `**${title}**\nDownloaded via Rits Bot`
                    });
                    await event.message.delete();
                } catch (uploadError: any) {
                    await event.message.edit({ text: `❌ **Upload failed:** \`${uploadError.message}\`` });
                } finally {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            });

            videoStream.on('error', async (error) => {
                await event.message.edit({ text: `❌ **Download error:** \`${error.message}\`` });
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });

        } catch (e: any) {
            await event.message.edit({ text: `❌ **Error:** \`${e.message}\`` });
        }
    }
};

export const ytInfoPlugin = {
    name: "YouTube Info",
    description: "Get information about a YouTube video",
    command: "ytinfo",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const parts = text.split(" ").slice(1);
        let link = parts.join(" ").trim();
        
        if (!link && event.message.replyToMsgId) {
            const reply = await event.message.getReplyMessage();
            link = reply?.text || "";
        }
        
        if (!link) {
            await event.message.edit({ text: "`Please provide a valid YouTube link.`" });
            return;
        }

        if (!ytdl.validateURL(link)) {
            await event.message.edit({ text: "`Invalid YouTube URL.`" });
            return;
        }

        await event.message.edit({ text: "⏳ **Fetching video info...**" });
        
        try {
            const info = await ytdl.getInfo(link);
            const details = info.videoDetails;
            
            const out = `**Title:** ${details.title}\n**Channel:** ${details.author.name}\n**Views:** ${details.viewCount}\n**Duration:** ${details.lengthSeconds} seconds`;
            
            if (details.thumbnails && details.thumbnails.length > 0) {
                const thumbnailUrl = details.thumbnails[details.thumbnails.length - 1].url;
                await event.client?.sendMessage(event.message.chatId!, {
                    file: thumbnailUrl,
                    message: out
                });
                await event.message.delete();
            } else {
                await event.message.edit({ text: out });
            }
        } catch (e: any) {
            await event.message.edit({ text: `❌ **Error:** \`${e.message}\`` });
        }
    }
};

export default [ytDownloadPlugin, ytInfoPlugin];
