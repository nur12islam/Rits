import { NewMessageEvent } from "telegram/events/index.js";
export default [{
    name: "Alive",
    description: "Check if bot is alive (Rewritten)",
    command: "alive",
    category: "General",
    handler: async (event: NewMessageEvent) => {
        const uptime = process.uptime();
        const hrs = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const secs = Math.floor(uptime % 60);
        const uptimeStr = `${hrs}h ${mins}m ${secs}s`;
        
        await event.message.edit({ text: `🌟 **RITS is Alive!**\n\n⚡ **Uptime:** ${uptimeStr}\n🚀 **Version:** 2.0 (Rewritten)\n💻 **System:** Custom TS Engine` });
    }
}];
