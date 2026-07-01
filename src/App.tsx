/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Terminal, Shield, LogIn, CheckCircle, Smartphone, Key, Settings, PlayCircle, Copy } from "lucide-react";

function ActivityLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get("/api/logs");
        setLogs(res.data.logs || []);
      } catch (e) {
        console.error("Failed to fetch logs");
      }
    };
    
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <Terminal className="text-blue-500" size={20} />
          Activity Logs
        </h2>
        <button 
          onClick={handleCopyLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 hover:border-slate-600"
        >
          {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy Logs"}
        </button>
      </div>
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 h-64 overflow-y-auto break-all flex flex-col-reverse">
        <div>
          {logs.length === 0 ? (
            <p className="text-slate-500 italic">No logs available...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`py-1 ${log.startsWith('[ERROR]') ? 'text-red-400' : 'text-slate-300'}`}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<any>(null);
  
  // Auth Flow State
  const [apiId, setApiId] = useState(import.meta.env.VITE_TELEGRAM_API_ID || "");
  const [apiHash, setApiHash] = useState(import.meta.env.VITE_TELEGRAM_API_HASH || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [password, setPassword] = useState("");
  
  const [botToken, setBotToken] = useState(import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "");
  const [logChannel, setLogChannel] = useState(import.meta.env.VITE_TELEGRAM_LOG_CHANNEL || "");
  
  const [pluginName, setPluginName] = useState("");
  const [pluginCode, setPluginCode] = useState("");
  const [pluginUrl, setPluginUrl] = useState("");
  const [installingPlugin, setInstallingPlugin] = useState(false);
  const [pluginMsg, setPluginMsg] = useState("");

  const [step, setStep] = useState<"credentials" | "phone" | "code" | "password" | "success">("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionString, setSessionString] = useState("");

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await axios.get("/api/bot/status");
      setStatus(res.data.status);
      if (res.data.status?.lastError) {
        setError(`Bot Error: ${res.data.status.lastError}`);
      }
    } catch (err) {
      console.error("Failed to fetch bot status");
    }
  };

  const handleInstallPlugin = async () => {
    setInstallingPlugin(true);
    setPluginMsg("");
    try {
      const res = await axios.post("/api/bot/plugin", {
        name: pluginName,
        code: pluginCode,
        url: pluginUrl
      });
      setPluginMsg("✅ " + res.data.message);
      setPluginName("");
      setPluginCode("");
      setPluginUrl("");
    } catch (err: any) {
      setPluginMsg("❌ " + (err.response?.data?.error || "Failed to install plugin"));
    }
    setInstallingPlugin(false);
  };

  const handleSendCode = async () => {
    setLoading(true);
    setError("");
    try {
      await axios.post("/api/auth/send-code", { apiId, apiHash, phoneNumber });
      setStep("code");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send code");
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/auth/sign-in", {
        apiId,
        apiHash,
        phoneNumber,
        phoneCode,
        password
      });
      
      setSessionString(res.data.sessionString);
      setStep("success");
    } catch (err: any) {
      if (err.response?.data?.needsPassword) {
        setStep("password");
        setError("Two-step verification required.");
      } else {
        setError(err.response?.data?.error || "Sign in failed");
      }
    }
    setLoading(false);
  };

  const handleStartBot = async () => {
      setLoading(true);
      setError("");
      try {
          await axios.post("/api/bot/start", {
              sessionString,
              apiId,
              apiHash,
              botToken,
              logChannel
          });
          await checkStatus();
      } catch (err: any) {
           setError(err.response?.data?.error || "Failed to start bot");
      }
      setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <header className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Terminal className="text-white" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">RITS</h1>
                    <p className="text-slate-400 text-sm">Personal Automation Platform</p>
                </div>
            </div>
            
            <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${status?.isRunning ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                <div className={`w-2 h-2 rounded-full ${status?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></div>
                {status?.isRunning ? 'Online' : 'Offline'}
            </div>
        </header>

        {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
                {status?.floodWaitSeconds && (
                    <div className="mt-2 font-semibold">
                        Telegram API rate limit reached. Please wait {Math.ceil(status.floodWaitSeconds / 60)} minutes before trying again.
                    </div>
                )}
            </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
            
            {/* Status Card */}
            {status?.isRunning && (
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                         <div className="flex items-center gap-4 mb-6">
                            <CheckCircle className="text-emerald-500" size={24} />
                            <div>
                                <h2 className="text-lg font-medium text-white">RITS Active</h2>
                                <p className="text-sm text-slate-400">Connected as {status.user?.name}</p>
                            </div>
                         </div>
                         <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-sm text-slate-300">
                             <p className="mb-2 text-slate-500">// Available Modules in Telegram</p>
                             <p><span className="text-blue-400">.help</span> - List all modules</p>
                             <p><span className="text-blue-400">.pmpermit [on/off]</span> - Anti-PM spam</p>
                             <p><span className="text-blue-400">.approve / .disapprove</span> - Manage PMs</p>
                             <p><span className="text-blue-400">.save / .get / .notes</span> - Notes/Snippets</p>
                             <p><span className="text-blue-400">.setname / .setbio</span> - Profile tools</p>
                             <p><span className="text-blue-400">.b64en / .spam</span> - Utility tools</p>
                             <p><span className="text-blue-400">.ping / .alive</span> - Status checks</p>
                             <p><span className="text-blue-400">.id / .sysinfo</span> - Info tools</p>
                             <p><span className="text-blue-400">.filter / .stop</span> - Chat filters</p>
                             <p><span className="text-blue-400">.gcast</span> - Broadcast messages</p>
                             <p><span className="text-blue-400">.mock / .vapor / .clap</span> - Fun tools</p>
                             <p><span className="text-blue-400">.weather / .dict / .ud</span> - API Tools</p>
                             <p><span className="text-blue-400">.quote / .joke / .meme</span> - Random content</p>
                             <p><span className="text-blue-400">.dog / .cat</span> - Cute animals</p>
                             <p><span className="text-blue-400">.hash / .uuid / .ip</span> - Dev utils</p>
                             <p><span className="text-blue-400">.google / .wiki / .github</span> - Search tools</p>
                             <p><span className="text-blue-400">.calc / .short / .crypto</span> - Utilities</p>
                             <p><span className="text-blue-400">.spam / .dspam / .tagall</span> - Messaging</p>
                             <p><span className="text-blue-400">.setname / .setbio / .block</span> - Profile management</p>
                             <p><span className="text-blue-400">.exec / .term / .eval</span> - Execution tools</p>
                             <p><span className="text-blue-400">.restart / .sleep</span> - System controls</p>
                             <p><span className="text-blue-400">.setvar / .getvar / .delvar</span> - Env variables</p>
                             <p><span className="text-blue-400">.logs / .json / .status</span> - Debugging</p>
                             <p><span className="text-blue-400">.addsudo / .rmsudo</span> - Sudo management</p>
                             <p><span className="text-blue-400">.join / .leave</span> - Channel logic</p>
                             <p><span className="text-blue-400">.addbot</span> - Add bots/users to group</p>
                             <p><span className="text-blue-400">.ban / .unban / .purge</span> - Admin tools</p>
                             <p><span className="text-blue-400">.afk [reason]</span> - Set AFK status</p>
                         </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-lg font-medium text-white flex items-center gap-2 mb-6">
                            <Settings className="text-blue-500" size={20} />
                            Dynamic Plugin Installer
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Plugin Name (Optional)</label>
                                <input 
                                    type="text" 
                                    value={pluginName}
                                    onChange={(e) => setPluginName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="e.g. custom_eval"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Plugin URL (Raw Code URL)</label>
                                <input 
                                    type="text" 
                                    value={pluginUrl}
                                    onChange={(e) => setPluginUrl(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="https://gist.githubusercontent.com/..."
                                />
                            </div>
                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-slate-800"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">OR</span>
                                <div className="flex-grow border-t border-slate-800"></div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Paste Code (JavaScript)</label>
                                <textarea 
                                    value={pluginCode}
                                    onChange={(e) => setPluginCode(e.target.value)}
                                    rows={5}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                                    placeholder="export default { name: 'MyPlugin', ... }"
                                ></textarea>
                            </div>
                            
                            {pluginMsg && (
                                <div className={`p-3 rounded-lg text-sm ${pluginMsg.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {pluginMsg}
                                </div>
                            )}

                            <button 
                                onClick={handleInstallPlugin}
                                disabled={installingPlugin || (!pluginUrl && !pluginCode)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {installingPlugin ? 'Installing...' : 'Install Plugin'}
                            </button>
                        </div>
                    </div>

                    <ActivityLogs />
                </div>
            )}

            {/* Auth Flow Card */}
            {!status?.isRunning && (
                <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2 mb-6">
                        <Shield className="text-blue-500" size={20} />
                        Session Generator
                    </h2>
                    
                    {step === "credentials" && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400 mb-4">Get your API ID and Hash from my.telegram.org.</p>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">API ID</label>
                                <input 
                                    type="text" 
                                    value={apiId}
                                    onChange={(e) => setApiId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="e.g. 1234567"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">API Hash</label>
                                <input 
                                    type="text" 
                                    value={apiHash}
                                    onChange={(e) => setApiHash(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="e.g. 0123456789abcdef0123456789abcdef"
                                />
                            </div>
                            <button 
                                onClick={() => setStep("phone")}
                                disabled={!apiId || !apiHash}
                                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {step === "phone" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <Smartphone className="text-blue-400" />
                                <p className="text-sm text-blue-100">Enter your phone number with country code.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number</label>
                                <input 
                                    type="text" 
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="+1234567890"
                                />
                            </div>
                            <button 
                                onClick={handleSendCode}
                                disabled={loading || !phoneNumber}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {loading ? 'Sending Code...' : 'Send Login Code'}
                            </button>
                        </div>
                    )}

                    {step === "code" && (
                        <div className="space-y-4">
                             <div className="flex items-center gap-3 mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <Key className="text-emerald-400" />
                                <p className="text-sm text-emerald-100">Enter the code sent to your Telegram app.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Login Code</label>
                                <input 
                                    type="text" 
                                    value={phoneCode}
                                    onChange={(e) => setPhoneCode(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-center tracking-widest text-lg"
                                    placeholder="12345"
                                />
                            </div>
                            <button 
                                onClick={handleSignIn}
                                disabled={loading || !phoneCode}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>
                        </div>
                    )}

                    {step === "password" && (
                        <div className="space-y-4">
                             <div className="flex items-center gap-3 mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <Shield className="text-amber-400" />
                                <p className="text-sm text-amber-100">Two-step verification is enabled. Enter your password.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button 
                                onClick={handleSignIn}
                                disabled={loading || !password}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="space-y-4">
                            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                                <CheckCircle className="text-emerald-500 mx-auto mb-3" size={32} />
                                <h3 className="text-lg font-medium text-emerald-400 mb-2">Session Generated</h3>
                                <p className="text-sm text-emerald-100/70 mb-4">
                                    Your secure session string has been created.
                                </p>
                                <div className="relative mb-6">
                                    <div className="bg-slate-950 p-3 pr-10 rounded-lg border border-emerald-500/30 break-all text-xs font-mono text-slate-400 h-24 overflow-y-auto text-left selection:bg-emerald-500/30">
                                        {sessionString}
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            navigator.clipboard.writeText(sessionString);
                                            const btn = e.currentTarget;
                                            const originalHTML = btn.innerHTML;
                                            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
                                            setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors border border-slate-700 hover:border-slate-600"
                                        title="Copy Session String"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                
                                <div className="text-left space-y-4 mb-6 pt-4 border-t border-emerald-500/20">
                                    <h4 className="text-sm font-medium text-slate-300">Optional Configuration</h4>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Bot Token (BotFather)</label>
                                        <input 
                                            type="text" 
                                            value={botToken}
                                            onChange={(e) => setBotToken(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                                            placeholder="123456:ABC-DEF..."
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Allows inline buttons (like an assistant bot)</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Log Channel ID</label>
                                        <input 
                                            type="text" 
                                            value={logChannel}
                                            onChange={(e) => setLogChannel(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                                            placeholder="-100..."
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Where the bot will send activity logs</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleStartBot}
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    <PlayCircle size={20} />
                                    {loading ? 'Booting RITS...' : 'Start RITS Now'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
