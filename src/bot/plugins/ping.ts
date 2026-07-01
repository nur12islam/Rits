import { NewMessageEvent } from "telegram/events/index.js";
export default [{
    name: "Ping",
    description: "Check bot latency (Rewritten)",
    command: "ping",
    category: "General",
    handler: async (event: NewMessageEvent) => {
        const start = Date.now();
        await event.message.edit({ text: "`Pinging...`" });
        const latency = Date.now() - start;
        await event.message.edit({ text: `🏓 **Pong!**\n📡 **Latency:** ${latency}ms` });
    }
}];
