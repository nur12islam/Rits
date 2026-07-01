import { NewMessageEvent } from "telegram/events/index.js";
import fs from "fs";

const NOTES_FILE = "notes.json";
let notesData: Record<string, string> = {};

function loadNotes() {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      notesData = JSON.parse(fs.readFileSync(NOTES_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Failed to load notes.json");
  }
}

function saveNotes() {
  try {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notesData));
  } catch (e) {
    console.error("Failed to save notes.json");
  }
}

loadNotes();

export default [
  {
    name: "Save Note",
    description: "Save a note with a name.",
    command: "save",
    category: "General",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.save\s*/, "") || "";
      const args = text.split(" ");
      const name = args[0]?.toLowerCase();
      
      const replyMsg = await event.message.getReplyMessage();
      let noteContent = "";
      
      if (replyMsg && replyMsg.text) {
          noteContent = replyMsg.text;
      } else {
          noteContent = args.slice(1).join(" ");
      }
      
      if (!name || !noteContent) {
        await event.message.edit({ text: "`Usage: .save <name> <content> OR reply to a message with .save <name>`" });
        return;
      }
      
      notesData[name] = noteContent;
      saveNotes();
      await event.message.edit({ text: `\`Note saved as '${name}'.\`` });
    }
  },
  {
    name: "Get Note",
    description: "Get a saved note.",
    command: "get",
    category: "General",
    handler: async (event: NewMessageEvent) => {
      const name = event.message.text?.replace(/^\.get\s*/, "")?.toLowerCase() || "";
      if (!name) {
        await event.message.edit({ text: "`Usage: .get <name>`" });
        return;
      }
      
      if (notesData[name]) {
        await event.message.edit({ text: notesData[name] });
      } else {
        await event.message.edit({ text: `\`Note '${name}' not found.\`` });
      }
    }
  },
  {
    name: "Delete Note",
    description: "Delete a saved note.",
    command: "clear",
    category: "General",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const name = event.message.text?.replace(/^\.clear\s*/, "")?.toLowerCase() || "";
      if (!name) {
        await event.message.edit({ text: "`Usage: .clear <name>`" });
        return;
      }
      
      if (notesData[name]) {
        delete notesData[name];
        saveNotes();
        await event.message.edit({ text: `\`Note '${name}' deleted.\`` });
      } else {
        await event.message.edit({ text: `\`Note '${name}' not found.\`` });
      }
    }
  },
  {
    name: "List Notes",
    description: "List all saved notes.",
    command: "notes",
    category: "General",
    handler: async (event: NewMessageEvent) => {
      const keys = Object.keys(notesData);
      if (keys.length === 0) {
        await event.message.edit({ text: "`No saved notes found.`" });
        return;
      }
      
      let msg = "**Saved Notes:**\n\n";
      keys.forEach(k => msg += `• \`${k}\`\n`);
      await event.message.edit({ text: msg });
    }
  }
];
