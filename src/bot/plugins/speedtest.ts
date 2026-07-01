import { NewMessageEvent } from "telegram/events/index.js";
import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs";

const execPromise = util.promisify(exec);

export function humanbytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
    name: "Speedtest",
    description: "Test your server speed.",
    command: "speedtest",
    category: "System",
    handler: async (event: NewMessageEvent) => {
        const msg = await event.message.edit({ text: "`Running speed test . . .`" });
        
        try {
            const scriptPath = path.join(process.cwd(), "src/bot/speedtest.py");
            
            // Check if script exists, if not download it
            if (!fs.existsSync(scriptPath)) {
                await event.message.edit({ text: "`Downloading speedtest script...`" });
                await execPromise(`curl -sLo ${scriptPath} https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py && chmod +x ${scriptPath}`);
                await event.message.edit({ text: "`Running speed test . . .`" });
            }

            const { stdout, stderr } = await execPromise(`python3 ${scriptPath} --server 59016 --json`);
            
            if (stderr && !stdout) {
                throw new Error(stderr);
            }
            
            const result = JSON.parse(stdout);
            
            function escapeHtml(text: any) {
                if (!text) return text;
                return String(text)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }
            
            let output = `<b>--Started at ${escapeHtml(result.timestamp)}--</b>\n\n`;
            output += `<b>Client:</b>\n\n`;
            output += `ISP: <code>${escapeHtml(result.client.isp)}</code>\n`;
            output += `Country: <code>${escapeHtml(result.client.country)}</code>\n\n`;
            
            output += `<b>Server:</b>\n\n`;
            output += `Name: <code>${escapeHtml(result.server.name)}</code>\n`;
            output += `Country: <code>${escapeHtml(result.server.country)}, ${escapeHtml(result.server.cc)}</code>\n`;
            output += `Sponsor: <code>${escapeHtml(result.server.sponsor)}</code>\n`;
            output += `Latency: <code>${escapeHtml(result.server.latency)}</code>\n\n`;
            
            output += `Ping: <code>${escapeHtml(result.ping)}</code>\n`;
            output += `Sent: <code>${escapeHtml(humanbytes(result.bytes_sent))}</code>\n`;
            output += `Received: <code>${escapeHtml(humanbytes(result.bytes_received))}</code>\n`;
            output += `Download: <code>${escapeHtml(humanbytes(result.download / 8))}/s</code>\n`;
            output += `Upload: <code>${escapeHtml(humanbytes(result.upload / 8))}/s</code>\n`;

            if (result.share) {
                // GramJS doesn't support easy sending from url using message.edit with media
                // We'll delete and send a new message with photo
                await event.client?.sendMessage(event.message.chatId!, {
                    file: result.share,
                    message: output,
                    parseMode: "html"
                });
                await event.message.delete();
            } else {
                await event.message.edit({ text: output, parseMode: "html" });
            }
            
        } catch (e: any) {
            await event.message.edit({ text: `\`Speedtest failed: ${e.message}\`` });
        }
    }
};
