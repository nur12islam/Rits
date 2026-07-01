import { NewMessageEvent } from "telegram/events/index.js";
import fs from "fs";

const FILTERS_FILE = "filters.json";
// chat_id -> { trigger: reply }
let filtersData: Record<string, Record<string, string>> = {};

function loadFilters() {
  try {
    if (fs.existsSync(FILTERS_FILE)) {
      filtersData = JSON.parse(fs.readFileSync(FILTERS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Failed to load filters.json");
  }
}

function saveFilters() {
  try {
    fs.writeFileSync(FILTERS_FILE, JSON.stringify(filtersData));
  } catch (e) {
    console.error("Failed to save filters.json");
  }
}

loadFilters();

export default [
  {
    name: "Add Filter",
    description: "Add an automated reply filter to the current chat.",
    command: "filter",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const chatId = event.chatId?.toString();
      if (!chatId) return;
      
      const text = event.message.text || "";
      const args = text.split(" ");
      
      if (args.length < 3) {
        await event.message.edit({ text: "`Usage: .filter <trigger> <reply message>`" });
        return;
      }
      
      const trigger = args[1].toLowerCase();
      const reply = args.slice(2).join(" ");
      
      if (!filtersData[chatId]) {
        filtersData[chatId] = {};
      }
      
      filtersData[chatId][trigger] = reply;
      saveFilters();
      
      await event.message.edit({ text: `\`Added filter for '\`${trigger}\`' in this chat.\`` });
    }
  },
  {
    name: "Stop Filter",
    description: "Remove a filter from the current chat.",
    command: "stop",
    category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const chatId = event.chatId?.toString();
      if (!chatId) return;
      
      const text = event.message.text || "";
      const args = text.split(" ");
      
      if (args.length < 2) {
        await event.message.edit({ text: "`Usage: .stop <trigger>`" });
        return;
      }
      
      const trigger = args[1].toLowerCase();
      
      if (filtersData[chatId] && filtersData[chatId][trigger]) {
        delete filtersData[chatId][trigger];
        saveFilters();
        await event.message.edit({ text: `\`Filter for '\`${trigger}\`' removed.\`` });
      } else {
        await event.message.edit({ text: `\`No filter found for '\`${trigger}\`'.\`` });
      }
    }
  },
  {
    name: "List Filters",
    description: "List all active filters in the current chat.",
    command: "filters",
    category: "Admin",
    handler: async (event: NewMessageEvent) => {
      const chatId = event.chatId?.toString();
      if (!chatId || !filtersData[chatId] || Object.keys(filtersData[chatId]).length === 0) {
        await event.message.edit({ text: "`No active filters in this chat.`" });
        return;
      }
      
      let msg = "**Active Filters here:**\n\n";
      for (const trigger in filtersData[chatId]) {
        msg += `• \`${trigger}\`\n`;
      }
      
      await event.message.edit({ text: msg });
    }
  }
];

export const rawListener = async (event: NewMessageEvent) => {
  const chatId = event.chatId?.toString();
  if (!chatId || !filtersData[chatId]) return;
  
  // Ignore our own messages for filters so we don't loop
  if (event.message.out) return;
  
  const text = event.message.text?.toLowerCase() || "";
  
  for (const trigger in filtersData[chatId]) {
    // Exact match or separate word match
    const regex = new RegExp(`(^|\\s)${trigger}(\\s|$)`, "i");
    if (regex.test(text)) {
      await event.message.reply({ message: filtersData[chatId][trigger] });
      break;
    }
  }
};
