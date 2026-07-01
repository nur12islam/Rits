import dotenv from "dotenv";

dotenv.config();

export const Config = {
  API_ID: process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID) : 0,
  API_HASH: process.env.TELEGRAM_API_HASH || "",
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  SESSION_STRING: process.env.TELEGRAM_SESSION_STRING || "",
  DB_URI: process.env.DATABASE_URL || "",
  
  OWNER_ID: [...new Set([
    ...(process.env.OWNER_ID || "0").split(" "),
    ...(process.env.BOT_OWNER || "").split(",")
  ].map(x => x.trim()).filter(x => x).map(Number))],
  
  SUDO_USERS: (process.env.SUDO_USERS || "").split(",").map(x => x.trim()).filter(x => x).map(Number),
  LOG_CHANNEL_ID: process.env.TELEGRAM_LOG_CHANNEL ? parseInt(process.env.TELEGRAM_LOG_CHANNEL) : 0,
  
  CMD_TRIGGER: process.env.CMD_TRIGGER || ".",
  SUDO_TRIGGER: process.env.SUDO_TRIGGER || "!",
  PUBLIC_TRIGGER: process.env.PUBLIC_TRIGGER || "/",
  
  WORKERS: parseInt(process.env.WORKERS || "4"),
  MAX_MESSAGE_LENGTH: 4096,
  
  FINISHED_PROGRESS_STR: process.env.FINISHED_PROGRESS_STR || "█",
  UNFINISHED_PROGRESS_STR: process.env.UNFINISHED_PROGRESS_STR || "░",
  
  DOWN_PATH: process.env.DOWN_PATH || "./downloads",
  MSG_DELETE_TIMEOUT: parseInt(process.env.MSG_DELETE_TIMEOUT || "120"),
  EDIT_SLEEP_TIMEOUT: parseInt(process.env.EDIT_SLEEP_TIMEOUT || "10"),
};
