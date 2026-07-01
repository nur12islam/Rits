import { NewMessageEvent } from "telegram/events/index.js";
import axios from "axios";
import crypto from "crypto";

export default [
    {
        name: "Weather",
        description: "Get weather for a city",
        command: "weather",
    category: "Tools",
        handler: async (event: NewMessageEvent) => {
            const city = event.message.text?.replace(/^\.weather\s*/, "") || "";
            if (!city) {
                await event.message.edit({ text: "`Provide a city name.`" });
                return;
            }
            try {
                const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=3`);
                await event.message.edit({ text: `**Weather:**\n\`${res.data}\`` });
            } catch (e) {
                await event.message.edit({ text: "`Could not fetch weather.`" });
            }
        }
    },
    {
        name: "Quote",
        description: "Get a random quote",
        command: "quote",
    category: "Fun",
        handler: async (event: NewMessageEvent) => {
            try {
                const res = await axios.get("https://api.quotable.io/random");
                await event.message.edit({ text: `__"${res.data.content}"__\n\n- **${res.data.author}**` });
            } catch (e) {
                await event.message.edit({ text: "`Could not fetch quote.`" });
            }
        }
    },
    {
        name: "Meme",
        description: "Get a random meme",
        command: "meme",
    category: "Fun",
        handler: async (event: NewMessageEvent) => {
            try {
                const res = await axios.get("https://meme-api.com/gimme");
                await event.message.delete({ revoke: true }).catch(() => {});
                await event.client?.sendMessage(event.chatId!, { file: res.data.url, message: `**${res.data.title}**` });
            } catch (e) {
                await event.message.edit({ text: "`Could not fetch meme.`" });
            }
        }
    },
    {
        name: "Dog",
        description: "Get a random dog picture",
        command: "dog",
    category: "Fun",
        handler: async (event: NewMessageEvent) => {
            try {
                const res = await axios.get("https://dog.ceo/api/breeds/image/random");
                await event.message.delete({ revoke: true }).catch(() => {});
                await event.client?.sendMessage(event.chatId!, { file: res.data.message });
            } catch (e) {
                await event.message.edit({ text: "`Could not fetch dog.`" });
            }
        }
    },
    {
        name: "Cat",
        description: "Get a random cat picture",
        command: "cat",
    category: "Fun",
        handler: async (event: NewMessageEvent) => {
            try {
                const res = await axios.get("https://api.thecatapi.com/v1/images/search");
                await event.message.delete({ revoke: true }).catch(() => {});
                await event.client?.sendMessage(event.chatId!, { file: res.data[0].url });
            } catch (e) {
                await event.message.edit({ text: "`Could not fetch cat.`" });
            }
        }
    },
    {
        name: "Joke",
        description: "Get a random joke",
        command: "joke",
    category: "Fun",
        handler: async (event: NewMessageEvent) => {
            try {
                const res = await axios.get("https://v2.jokeapi.dev/joke/Any?type=single");
                const text = res.data.joke || `${res.data.setup}\n\n${res.data.delivery}`;
                await event.message.edit({ text: `**Joke:**\n\`${text}\`` });
            } catch (e) {
                await event.message.edit({ text: "`Could not fetch joke.`" });
            }
        }
    },
    {
        name: "Hash",
        description: "Hash text (md5, sha1, sha256)",
        command: "hash",
    category: "Tools",
        handler: async (event: NewMessageEvent) => {
            const text = event.message.text?.replace(/^\.hash\s*/, "") || "";
            if (!text) {
                await event.message.edit({ text: "`Provide text to hash.`" });
                return;
            }
            const md5 = crypto.createHash('md5').update(text).digest('hex');
            const sha1 = crypto.createHash('sha1').update(text).digest('hex');
            const sha256 = crypto.createHash('sha256').update(text).digest('hex');
            await event.message.edit({ text: `**Text:** \`${text}\`\n\n**MD5:** \`${md5}\`\n**SHA1:** \`${sha1}\`\n**SHA256:** \`${sha256}\`` });
        }
    },
    {
        name: "UUID",
        description: "Generate a UUID",
        command: "uuid",
    category: "Tools",
        handler: async (event: NewMessageEvent) => {
            await event.message.edit({ text: `**UUID:** \`${crypto.randomUUID()}\`` });
        }
    },
    {
        name: "IP Info",
        description: "Get information about an IP address",
        command: "ip",
    category: "Tools",
        handler: async (event: NewMessageEvent) => {
            const ip = event.message.text?.replace(/^\.ip\s*/, "") || "";
            if (!ip) {
                await event.message.edit({ text: "`Provide an IP address.`" });
                return;
            }
            try {
                const res = await axios.get(`http://ip-api.com/json/${ip}`);
                if (res.data.status === "fail") {
                    await event.message.edit({ text: "`Invalid IP address.`" });
                    return;
                }
                const data = res.data;
                await event.message.edit({ text: `**IP Info for ${ip}**\n\n🌍 **Country:** ${data.country}\n🏙 **City:** ${data.city}\n📍 **Lat/Lon:** ${data.lat}, ${data.lon}\n🏢 **ISP:** ${data.isp}\n🌐 **Org:** ${data.org}` });
            } catch (e) {
                await event.message.edit({ text: "`Could not fetch IP info.`" });
            }
        }
    },
    {
        name: "Dictionary",
        description: "Define a word",
        command: "dict",
    category: "Search",
        handler: async (event: NewMessageEvent) => {
            const word = event.message.text?.replace(/^\.dict\s*/, "") || "";
            if (!word) return;
            try {
                const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
                const data = res.data[0];
                const meaning = data.meanings[0].definitions[0].definition;
                await event.message.edit({ text: `**Dictionary: ${word}**\n\n📖 ${meaning}` });
            } catch (e) {
                await event.message.edit({ text: "`Word not found.`" });
            }
        }
    },
    {
        name: "Urban Dictionary",
        description: "Define a word on Urban Dictionary",
        command: "ud",
    category: "Search",
        handler: async (event: NewMessageEvent) => {
            const word = event.message.text?.replace(/^\.ud\s*/, "") || "";
            if (!word) return;
            try {
                const res = await axios.get(`http://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
                if (res.data.list.length === 0) {
                    await event.message.edit({ text: "`Word not found.`" });
                    return;
                }
                const data = res.data.list[0];
                const meaning = data.definition.replace(/\[/g, "").replace(/\]/g, "");
                await event.message.edit({ text: `**Urban Dictionary: ${word}**\n\n📖 ${meaning}` });
            } catch (e) {
                await event.message.edit({ text: "`Word not found.`" });
            }
        }
    }
];
