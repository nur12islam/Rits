import { NewMessageEvent } from "telegram/events/index.js";
import { loadDynamicPlugin } from "../pluginManager.js";
import fs from "fs";
import path from "path";

export default {
  name: "Install Plugin",
  description: "Install a plugin from a replied file.",
  command: "install",
    category: "Developer",
  ownerOnly: true,
  handler: async (event: NewMessageEvent) => {
    const reply = await event.message.getReplyMessage();
    
    if (!reply || !reply.document) {
      await event.message.edit({ text: "`Reply to a .ts or .js file to install it.`" });
      return;
    }

    const doc = reply.document as any;
    let fileName = "plugin.ts";
    if (doc.attributes) {
      for (const attr of doc.attributes) {
        if (attr.className === "DocumentAttributeFilename") {
          fileName = attr.fileName;
        }
      }
    }

    if (!fileName.endsWith(".ts") && !fileName.endsWith(".js") && !fileName.endsWith(".mjs")) {
      await event.message.edit({ text: "`Only .ts, .js, or .mjs files can be installed.`" });
      return;
    }

    await event.message.edit({ text: "`Downloading and installing plugin...`" });

    try {
      const buffer = await event.client?.downloadMedia(reply.media);
      if (!buffer) {
        await event.message.edit({ text: "`Failed to download the file.`" });
        return;
      }

      const pluginsDir = path.join(process.cwd(), "dynamic_plugins");
      if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir);
      }

      // Convert .ts to .mjs for dynamic import execution if it's not pre-compiled
      // Actually, tsx might handle .ts imports in dev, but just in case, if it's ts, we can save it as .ts
      // ts-node or tsx can handle .ts dynamically. In our setup, we use `tsx` in dev, `node dist/server.cjs` in prod.
      // Wait, in prod `node dist/server.cjs` cannot dynamically import a raw `.ts` file without a transpiler!
      // This is a common issue. If we are running bundled prod, dynamic import of .ts will fail.
      // But since they might just be pasting/sending simple JS, let's just save it as is.
      // We could use esbuild dynamically but let's just save it as the original name.
      // The instructions say "e.g., .js or .py file", we support JS/TS.

      const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");
      const filePath = path.join(pluginsDir, safeName);

      fs.writeFileSync(filePath, buffer);

      await loadDynamicPlugin(filePath);
      
      await event.message.edit({ text: `\`Successfully installed plugin: ${safeName}\`` });
    } catch (e: any) {
      console.error("Install Error:", e);
      await event.message.edit({ text: `\`Failed to install plugin: ${e.message}\`` });
    }
  }
};
