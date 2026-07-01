import os from "os";
import { NewMessageEvent } from "telegram/events/index.js";

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
  name: "System Info",
  description: "Display host server information.",
  command: "sysinfo",
    category: "General",
  handler: async (event: NewMessageEvent) => {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const memoryTotal = os.totalmem();
    const memoryFree = os.freemem();
    const memoryUsed = memoryTotal - memoryFree;

    const info = `
**⚙️ System Information**
• **OS**: ${os.type()} ${os.release()}
• **Architecture**: ${os.arch()}
• **Uptime**: ${days}d ${hours}h ${minutes}m
• **RAM**: ${formatBytes(memoryUsed)} / ${formatBytes(memoryTotal)}
• **CPU Cores**: ${os.cpus()?.length || "Unknown"}
• **Node Version**: ${process.version}
    `.trim();

    await event.message.edit({ text: info });
  }
};
