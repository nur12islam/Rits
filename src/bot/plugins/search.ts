import { NewMessageEvent } from "telegram/events/index.js";
import axios from "axios";

export default [
  {
    name: "Google Search",
    description: "Search Google",
    command: "google",
    category: "Search",
    handler: async (event: NewMessageEvent) => {
      const query = event.message.text?.replace(/^\.google\s*/, "");
      if (!query) {
        await event.message.edit({ text: "`Provide a search query!`" });
        return;
      }
      await event.message.edit({ text: "`Searching Google...`" });
      const url = `https://google.com/search?q=${encodeURIComponent(query)}`;
      await event.message.edit({ text: `**Google Search for:** \`${query}\`\n\n[Click here for results](${url})` });
    }
  },
  {
    name: "GitHub",
    description: "Get GitHub User Info",
    command: "github",
    category: "Search",
    handler: async (event: NewMessageEvent) => {
      const user = event.message.text?.replace(/^\.github\s*/, "");
      if (!user) return;
      try {
        const res = await axios.get(`https://api.github.com/users/${user}`);
        const data = res.data;
        const out = `**GitHub User Info:**\n\n👤 **Name:** ${data.name || data.login}\n🏢 **Company:** ${data.company || "N/A"}\n📝 **Bio:** ${data.bio || "N/A"}\n📦 **Public Repos:** ${data.public_repos}\n👥 **Followers:** ${data.followers}\n🔗 **Profile:** [Link](${data.html_url})`;
        await event.message.edit({ text: out });
      } catch (e) {
        await event.message.edit({ text: "`User not found on GitHub.`" });
      }
    }
  },
  {
    name: "Wikipedia",
    description: "Search Wikipedia",
    command: "wiki",
    category: "Search",
    handler: async (event: NewMessageEvent) => {
      const query = event.message.text?.replace(/^\.wiki\s*/, "");
      if (!query) return;
      try {
        const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        const data = res.data;
        if (data.type === "disambiguation") {
             await event.message.edit({ text: `**Wikipedia:**\nDisambiguation page. Please be more specific.\n[Link](${data.content_urls.desktop.page})` });
        } else {
             await event.message.edit({ text: `**Wikipedia: ${data.title}**\n\n${data.extract}\n\n[Read more](${data.content_urls.desktop.page})` });
        }
      } catch (e) {
        await event.message.edit({ text: "`No results found on Wikipedia.`" });
      }
    }
  }
];
