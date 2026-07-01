import { NewMessageEvent } from "telegram/events/index.js";
import { Config } from "../config.js";
import fs from "fs";
import path from "path";

export default [
  {
    name: "Restart",
    description: "Restarts the RITS.",
    command: "restart",
    category: "Developer",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      await event.message.edit({ text: "`Restarting RITS Services...`" });
      process.exit(0); // Assumes a process manager like PM2, nodemon, or Docker handles restart
    }
  },
  {
    name: "Shutdown",
    description: "Shuts down the RITS.",
    command: "shutdown",
    category: "Developer",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      await event.message.edit({ text: "`shutting down ...`" });
      process.exit(0);
    }
  },
  {
    name: "Sleep",
    description: "Sleeps the RITS for N seconds.",
    command: "sleep",
    category: "Developer",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.sleep\s*/, "") || "";
      const seconds = parseInt(text) || 5;
      await event.message.edit({ text: `\`sleeping ${seconds} seconds...\`` });
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      await event.message.edit({ text: "`woke up!`" });
    }
  },
  {
    name: "Set Var",
    description: "Set an environment variable.",
    command: "setvar",
    category: "Developer",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.setvar\s*/, "") || "";
      const args = text.split(" ");
      if (args.length < 2) {
        await event.message.edit({ text: "`Usage: .setvar [KEY] [VALUE]`" });
        return;
      }
      const key = args[0];
      const value = args.slice(1).join(" ");
      
      const envPath = path.join(process.cwd(), ".env");
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
      fs.writeFileSync(envPath, envContent.trim() + "\n");
      await event.message.edit({ text: `\`var ${key} added!\`` });
    }
  },
  {
    name: "Get Var",
    description: "Get an environment variable.",
    command: "getvar",
    category: "Developer",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const key = event.message.text?.replace(/^\.getvar\s*/, "")?.trim();
      if (!key) {
        await event.message.edit({ text: "`Usage: .getvar [KEY]`" });
        return;
      }
      const val = process.env[key];
      if (val) {
        await event.message.edit({ text: `**Env Var [${key}]**:\n\`${val}\`` });
      } else {
        await event.message.edit({ text: `\`var ${key} not found!\`` });
      }
    }
  },
  {
    name: "Delete Var",
    description: "Delete an environment variable.",
    command: "delvar",
    category: "Developer",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const key = event.message.text?.replace(/^\.delvar\s*/, "")?.trim();
      if (!key) {
        await event.message.edit({ text: "`Usage: .delvar [KEY]`" });
        return;
      }
      const envPath = path.join(process.cwd(), ".env");
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, "").replace(/\n\n+/g, '\n');
        fs.writeFileSync(envPath, envContent.trim() + "\n");
        await event.message.edit({ text: `\`var ${key} deleted!\`` });
      } else {
        await event.message.edit({ text: `\`var ${key} not found!\`` });
      }
    }
  }
];
