import { NewMessageEvent } from "telegram/events/index.js";
import { exec, spawn } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import { humanbytes } from "./speedtest.js";

const execPromise = util.promisify(exec);

async function ensureYtDlp(): Promise<string> {
    const binDir = path.join(process.cwd(), "bin");
    const ytdlpPath = path.join(binDir, "yt-dlp");
    if (!fs.existsSync(ytdlpPath)) {
        fs.mkdirSync(binDir, { recursive: true });
        await execPromise(`curl -sLo ${ytdlpPath} https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && chmod +x ${ytdlpPath}`);
    }
    return ytdlpPath;
}

export const ytinfoPlugin = {
    name: "YT Info",
    description: "Get information of the link without downloading",
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
            await event.message.edit({ text: "`No link provided.`" });
            return;
        }

        await event.message.edit({ text: "Hold on ⏳ .." });
        
        try {
            const ytDlp = await ensureYtDlp();
            const { stdout } = await execPromise(`${ytDlp} -j --no-playlist "${link}"`);
            const info = JSON.parse(stdout);
            
            function escapeHtml(text: any) {
                if (!text) return text;
                return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
            
            let out = `<b>Title</b> >>\n<i>${escapeHtml(info.title)}</i>\n\n`;
            out += `<b>Uploader</b> >>\n<i>${escapeHtml(info.uploader)}</i>\n\n`;
            
            const formats = info.formats || [info];
            if (formats.length > 0) {
                out += `--U-ID   |   Reso.  |   Extension--\n`;
                for (let i = 0; i < Math.min(formats.length, 20); i++) {
                    const f = formats[i];
                    out += `<code>${escapeHtml(f.format_id)} | ${escapeHtml(f.format_note || 'N/A')} | ${escapeHtml(f.ext)}</code>\n`;
                }
            } else {
                out += "No formats found :(";
            }
            
            if (info.thumbnail) {
                await event.client?.sendMessage(event.message.chatId!, {
                    file: info.thumbnail,
                    message: out,
                    parseMode: "html"
                });
                await event.message.delete();
            } else {
                await event.message.edit({ text: out, parseMode: "html" });
            }
        } catch (e: any) {
            await event.message.edit({ text: `\`Error: ${e.message.slice(0, 100)}\`` });
        }
    }
};

export const ytdesPlugin = {
    name: "YT Description",
    description: "Get description of the link without downloading",
    command: "ytdes",
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
            await event.message.edit({ text: "`No link provided.`" });
            return;
        }

        await event.message.edit({ text: "Hold on ⏳ .." });
        
        try {
            const ytDlp = await ensureYtDlp();
            const { stdout } = await execPromise(`${ytDlp} -j --no-playlist "${link}"`);
            const info = JSON.parse(stdout);
            
            function escapeHtml(text: any) {
                if (!text) return text;
                return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
            let out = info.description ? `--Description--\n\n\t${escapeHtml(info.description)}` : "No descriptions found :(";
            
            if (out.length > 4096) {
                out = out.substring(0, 4090) + "...";
            }
            await event.message.edit({ text: out });
        } catch (e: any) {
            await event.message.edit({ text: `\`Error: ${e.message.slice(0, 100)}\`` });
        }
    }
};

export const ytdlPlugin = {
    name: "YT Download",
    description: "Download from youtube",
    command: "ytdl",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const parts = text.split(" ").slice(1);
        
        const flags: Record<string, string> = {};
        let linkParts = [];
        
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            if (p.startsWith("-")) {
                const match = p.match(/^-([a-z]+)(\d*)$/i);
                if (match) {
                    flags[match[1]] = match[2] || "1";
                } else if (p.startsWith("-output=")) {
                    flags["output"] = p.split("=")[1];
                }
            } else {
                linkParts.push(p);
            }
        }
        
        let link = linkParts.join(" ").trim();
        if (!link && event.message.replyToMsgId) {
            const reply = await event.message.getReplyMessage();
            link = reply?.text || "";
        }
        
        if (!link) {
            await event.message.edit({ text: "`No link provided.`" });
            return;
        }

        await event.message.edit({ text: "Hold on ⏳ .." });
        const startTime = Date.now();
        const downDir = path.join(process.cwd(), "downloads", startTime.toString());
        fs.mkdirSync(downDir, { recursive: true });
        
        let formatOpt = "bestvideo+bestaudio/best";
        if (flags["a"] && flags["v"]) {
            formatOpt = `${flags["v"]}+${flags["a"]}`;
        } else if (flags["a"] && flags["a"] !== "1") {
            formatOpt = flags["a"];
        } else if (flags["v"] && flags["v"] !== "1") {
            formatOpt = `${flags["v"]}+bestaudio`;
        } else if (flags["m"]) {
            formatOpt = "bestaudio/best";
        }
        
        const args = [
            "--no-playlist",
            "-f", formatOpt,
            "-o", path.join(downDir, "%(title)s-%(format)s.%(ext)s")
        ];
        
        if (flags["m"]) {
            args.push("-x", "--audio-format", "mp3", "--audio-quality", "320K");
        }
        if (flags["output"]) {
            args.push("--merge-output-format", flags["output"]);
        }
        args.push(link);
        
        let lastEdit = 0;
        
        const ytDlp = await ensureYtDlp();
        const ytProcess = spawn(ytDlp, args);
        
        let lastTextOut = "";
        ytProcess.stdout.on("data", (data) => {
            const out = data.toString();
            const match = out.match(/\[download\]\s+([\d\.]+)%\s+of\s+[~]?([\d\.\w]+)\s+at\s+([\d\.\w]+\/s)\s+ETA\s+([\d:]+)/);
            if (match) {
                const now = Date.now();
                if (now - lastEdit > 3000) {
                    lastEdit = now;
                    const percent = match[1];
                    const speed = match[3];
                    const eta = match[4];
                    const textOut = `<b>Speed</b> >> ${speed}\n<b>ETA</b> >> ${eta}\n<b>Progress</b> >> ${percent}%\n`;
                    if (textOut !== lastTextOut) {
                        lastTextOut = textOut;
                        event.message.edit({ text: textOut, parseMode: "html" }).catch((e: any) => {
                            if (e.message && e.message.includes("MESSAGE_NOT_MODIFIED")) {
                                // ignore
                            }
                        });
                    }
                }
            }
        });
        
        let stderrData = "";
        ytProcess.stderr.on("data", (data) => {
            stderrData += data.toString();
        });
        
        ytProcess.on("close", async (code) => {
            if (code === 0) {
                try {
                    const files = fs.readdirSync(downDir);
                    const mediaFiles = files.filter(f => !f.toLowerCase().endsWith(".jpg") && !f.toLowerCase().endsWith(".png") && !f.toLowerCase().endsWith(".webp"));
                    
                    if (mediaFiles.length > 0) {
                        const file = path.join(downDir, mediaFiles[0]);
                        await event.message.edit({ text: `<b>YTDL completed in ${Math.round((Date.now() - startTime) / 1000)} seconds</b>\n<code>${file}</code>`, parseMode: "html" });
                        
                        if (flags["t"] || true) {
                            await event.message.edit({ text: `Uploading...` });
                            await event.client?.sendMessage(event.message.chatId!, {
                                file: file,
                                message: `Downloaded in ${Math.round((Date.now() - startTime) / 1000)}s`
                            });
                            await event.message.delete();
                            fs.rmSync(downDir, { recursive: true, force: true });
                        }
                    } else {
                        await event.message.edit({ text: "`Nothing found!`" });
                    }
                } catch (e: any) {
                    await event.message.edit({ text: `\`Upload failed: ${e.message}\`` });
                }
            } else {
                await event.message.edit({ text: `\`Download failed with code ${code}. Error: ${stderrData.slice(0, 500)}\`` });
            }
        });
        
        ytProcess.on("error", async (err) => {
            await event.message.edit({ text: `\`Process error: ${err.message}\`` });
        });
    }
};

export default [ytinfoPlugin, ytdesPlugin, ytdlPlugin];

