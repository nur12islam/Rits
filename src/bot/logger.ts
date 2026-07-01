import fs from "fs";
import path from "path";

export const MAX_LOGS = 50;
export const appLogs: string[] = [];

const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logFile = path.join(logDir, "rits.log");

const originalLog = console.log;
const originalError = console.error;

function formatMsg(args: any[]) {
  return args.map(a => {
    if (a instanceof Error) return a.stack || a.message;
    try {
        return typeof a === 'object' ? JSON.stringify(a) : String(a);
    } catch (e) {
        return String(a);
    }
  }).join(' ');
}

console.log = function (...args) {
  const msg = formatMsg(args);
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const line = `[INFO] ${timestamp} - ${msg}`;
  
  appLogs.push(line);
  if (appLogs.length > MAX_LOGS) appLogs.shift();
  
  try {
      fs.appendFileSync(logFile, line + "\n");
  } catch (e) {}
  
  originalLog.apply(console, args);
};

console.error = function (...args) {
  const msg = formatMsg(args);
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const line = `[ERROR] ${timestamp} - ${msg}`;
  
  appLogs.push(line);
  if (appLogs.length > MAX_LOGS) appLogs.shift();
  
  try {
      fs.appendFileSync(logFile, line + "\n");
  } catch (e) {}
  
  originalError.apply(console, args);
};
