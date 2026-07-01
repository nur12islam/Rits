import { NewMessageEvent } from "telegram/events/index.js";
import { COMMAND_PREFIX } from "../index.js";

export default {
  name: "Eval",
  description: "Evaluate arbitrary JavaScript code.",
  command: "eval",
    category: "Developer",
  ownerOnly: true,
  handler: async (event: NewMessageEvent) => {
    const message = event.message.text || "";
    // Remove the command and prefix
    const code = message.replace(`${COMMAND_PREFIX}eval`, "").trim();
    
    if (!code) {
       await event.message.edit({ text: "Please provide code to evaluate." });
       return;
    }
    
    await event.message.edit({ text: "`Evaluating...`" });
    
    try {
        // Warning: This is dangerous in a normal bot, but fine for a *personal* userbot
        // where only the owner can execute it on their own outgoing messages.
        const result = eval(code);
        const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        
        await event.message.edit({ text: `**Code:**\n\`${code}\`\n\n**Output:**\n\`${output}\`` });
    } catch (err: any) {
        await event.message.edit({ text: `**Code:**\n\`${code}\`\n\n**Error:**\n\`${err.message}\`` });
    }
  }
};
