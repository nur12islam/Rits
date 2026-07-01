import { NewMessageEvent } from "telegram/events/index.js";
import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);

export default [
  {
    name: "Exec",
    description: "Run shell commands.",
    command: "exec",
    category: "Developer",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.exec\s*/, "") || "";
      if (!text) {
         await event.message.edit({ text: "`Provide a command to execute.`" });
         return;
      }
      await event.message.edit({ text: "`Executing exec ...`" });
      try {
        const { stdout, stderr } = await execAsync(text);
        let out = `**EXEC:**\n__Command:__\n\`${text}\`\n\n`;
        if (stdout) out += `**stdout:**\n\`\`\`\n${stdout.substring(0, 3000)}\n\`\`\`\n`;
        if (stderr) out += `**stderr:**\n\`\`\`\n${stderr.substring(0, 1000)}\n\`\`\``;
        if (!stdout && !stderr) out += "**stdout:**\n`no output`";
        await event.message.edit({ text: out });
      } catch (e: any) {
        let out = `**EXEC:**\n__Command:__\n\`${text}\`\n\n`;
        if (e.stdout) out += `**stdout:**\n\`\`\`\n${e.stdout.substring(0, 3000)}\n\`\`\`\n`;
        if (e.stderr) out += `**stderr:**\n\`\`\`\n${e.stderr.substring(0, 1000)}\n\`\`\`\n`;
        out += `**Error:**\n\`\`\`\n${e.message}\n\`\`\``;
        await event.message.edit({ text: out });
      }
    }
  },
  {
    name: "Term",
    description: "Run commands in shell (terminal).",
    command: "term",
    category: "Developer",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.term\s*/, "") || "";
      if (!text) {
         await event.message.edit({ text: "`Provide a command to execute.`" });
         return;
      }
      await event.message.edit({ text: "`Executing terminal ...`" });
      try {
        const { stdout, stderr } = await execAsync(text);
        let out = `**root:~#** \`${text}\`\n\n`;
        if (stdout) out += `\`\`\`\n${stdout.substring(0, 3000)}\n\`\`\`\n`;
        if (stderr) out += `\`\`\`\n${stderr.substring(0, 1000)}\n\`\`\``;
        if (!stdout && !stderr) out += "`no output`";
        await event.message.edit({ text: out });
      } catch (e: any) {
        await event.message.edit({ text: `**Terminal Error:**\n\`\`\`\n${e.message}\n\`\`\`` });
      }
    }
  }
];
