import { exec } from "child_process";
import util from "util";
import { NewMessageEvent } from "telegram/events/index.js";
import { Config } from "./config.js";

const execAsync = util.promisify(exec);

export class StopConversation extends Error {}
export class ProcessCanceled extends Error {}
export class RITSBotNotFound extends Error {}

export function isUrl(url: string): boolean {
    return /^(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(url);
}

export function humanbytes(size: number): string {
    if (!size) return "0 B";
    const power = 1024;
    let t_n = 0;
    const power_dict: Record<number, string> = {
        0: '', 1: 'Ki', 2: 'Mi', 3: 'Gi', 4: 'Ti', 5: 'Pi', 6: 'Ei', 7: 'Zi', 8: 'Yi'
    };
    while (size > power) {
        size /= power;
        t_n += 1;
    }
    return `${size.toFixed(2)} ${power_dict[t_n]}B`;
}

export function timeFormatter(seconds: number): string {
    let minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    let hours = Math.floor(minutes / 60);
    minutes = Math.floor(minutes % 60);
    const days = Math.floor(hours / 24);
    hours = Math.floor(hours % 24);
    
    let tmp = (days ? `${days}d, ` : "") +
              (hours ? `${hours}h, ` : "") +
              (minutes ? `${minutes}m, ` : "") +
              (seconds ? `${seconds}s, ` : "");
              
    return tmp.slice(0, -2) || "0s";
}

export async function runcmd(cmd: string): Promise<[string, string, number, number]> {
    try {
        const { stdout, stderr } = await execAsync(cmd);
        return [stdout.trim(), stderr.trim(), 0, 0];
    } catch (e: any) {
        return [e.stdout?.trim() || "", e.stderr?.trim() || "", e.code || 1, 0];
    }
}

export async function takeScreenShot(videoFile: string, duration: number, pathStr: string = ""): Promise<string | null> {
    return null; // Stubbed for now as it requires ffmpeg
}

export function parseButtons(markdownNote: string): string {
    const BTN_URL_REGEX = /(\[([^\[]+?)\]\[buttonurl:\/{0,2}(.+?)(:same)?\])/g;
    let noteData = markdownNote.replace(BTN_URL_REGEX, "").trim();
    return noteData;
}

const _TASKS: Record<string, [number, number]> = {};

export async function progress(
    current: number,
    total: number,
    event: NewMessageEvent,
    udType: string,
    fileName: string = '',
    delay: number = Config.EDIT_SLEEP_TIMEOUT
) {
    const taskId = `${event.chatId}.${event.message.id}`;
    if (current === total) {
        if (!_TASKS[taskId]) return;
        delete _TASKS[taskId];
        try {
            await event.message.edit({ text: "`finalizing process ...`" });
        } catch (e) { }
        return;
    }
    
    const now = Date.now() / 1000;
    if (!_TASKS[taskId]) {
        _TASKS[taskId] = [now, now];
    }
    
    const [start, last] = _TASKS[taskId];
    const elapsedTime = now - start;
    
    if ((now - last) >= delay) {
        _TASKS[taskId] = [start, now];
        const percentage = (current * 100) / total;
        const speed = current / elapsedTime;
        const timeToCompletion = timeFormatter(Math.floor((total - current) / speed));
        
        const finishedCount = Math.min(20, Math.max(0, Math.floor(percentage / 5)));
        const unfinishedCount = 20 - finishedCount;
        const progressStr = `__${udType}__ : \`${fileName}\`\n` +
            `\`\`\`\n[${Config.FINISHED_PROGRESS_STR.repeat(finishedCount)}${Config.UNFINISHED_PROGRESS_STR.repeat(unfinishedCount)}]\`\`\`\n` +
            `**Progress** : \`${percentage.toFixed(2)}%\`\n` +
            `**Completed** : \`${humanbytes(current)}\`\n` +
            `**Total** : \`${humanbytes(total)}\`\n` +
            `**Speed** : \`${humanbytes(speed)}/s\`\n` +
            `**ETA** : \`${timeToCompletion || "0 s"}\``;
            
        try {
            await event.message.edit({ text: progressStr });
        } catch (e) { }
    }
}
