import { NewMessageEvent } from "telegram/events/index.js";
import { logToChannel } from "../index.js";
import fs from "fs";
import path from "path";

// Configuration for auto error logging
let autoErrorLoggingEnabled = true;
let isForwarding = false;

// Hook into console.error
const originalConsoleError = console.error;

console.error = function (...args: any[]) {
    // Format the message
    const msg = args.map(a => {
        if (a instanceof Error) return a.stack || a.message;
        try {
            return typeof a === 'object' ? JSON.stringify(a) : String(a);
        } catch (e) {
            return String(a);
        }
    }).join(' ');

    // Call the original (which includes the rits.log appending and console logging)
    originalConsoleError.apply(console, args);

    // Forward to channel if enabled and not already forwarding (to prevent infinite loop)
    if (autoErrorLoggingEnabled && !isForwarding) {
        isForwarding = true;
        
        const cleanMsg = msg.substring(0, 3500); // Telegram limits message size
        
        logToChannel(`🚨 **Automatic Error Alert** 🚨\n\n**Details:**\n\`\`\`\n${cleanMsg}\n\`\`\``)
            .catch(() => {})
            .finally(() => {
                isForwarding = false;
            });
    }
};

// Catch unhandled exceptions & rejections to route them through console.error
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception caught by Error Logger Plugin:", err);
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection caught by Error Logger Plugin:", reason);
});

export default [
    {
        name: "Auto Error Logger Toggle",
        description: "Toggle automatic sending of error logs to the log channel",
        command: "autolog",
        category: "System",
        handler: async (event: NewMessageEvent) => {
            autoErrorLoggingEnabled = !autoErrorLoggingEnabled;
            const status = autoErrorLoggingEnabled ? "ENABLED 🟢" : "DISABLED 🔴";
            await event.message.edit({
                text: `⚙️ **Automatic error reporting is now ${status}.**`
            });
        }
    },
    {
        name: "Test Error Trigger",
        description: "Generate a mock error to test the auto error reporter",
        command: "testerror",
        category: "System",
        handler: async (event: NewMessageEvent) => {
            await event.message.edit({
                text: `🧪 **Triggering a test error to verify logging...**`
            });
            console.error(new Error("This is a manual test error triggered by the testerror command!"));
        }
    },
    {
        name: "View Error Logs",
        description: "Get the latest error logs from the log file",
        command: "errlogs",
        category: "System",
        handler: async (event: NewMessageEvent) => {
            const logPath = path.join(process.cwd(), "logs", "rits.log");
            if (!fs.existsSync(logPath)) {
                await event.message.edit({
                    text: `📭 **No logs file found at \`logs/rits.log\`.**`
                });
                return;
            }
            try {
                const content = fs.readFileSync(logPath, "utf8");
                const lines = content.trim().split("\n");
                // Filter only error logs
                const errorLines = lines.filter(line => line.includes("[ERROR]"));
                if (errorLines.length === 0) {
                    await event.message.edit({
                        text: `🎉 **No error logs found in rits.log!**`
                    });
                    return;
                }
                
                // Get last 10 lines of errors
                const lastErrors = errorLines.slice(-10).join("\n");
                const trimmed = lastErrors.length > 3500 ? lastErrors.substring(lastErrors.length - 3500) : lastErrors;
                
                await event.message.edit({
                    text: `📋 **Last 10 Error Logs:**\n\`\`\`\n${trimmed}\n\`\`\``
                });
            } catch (err: any) {
                await event.message.edit({
                    text: `❌ **Failed to read logs:** \`${err.message}\``
                });
            }
        }
    }
];
