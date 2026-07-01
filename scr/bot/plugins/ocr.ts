import { NewMessageEvent } from "telegram/events/index.js";
import axios from "axios";
import FormData from "form-data";
import { logToChannel } from "../index.js";

export default [
  {
    name: "OCR Reader",
    description: "Get OCR result for images (file size limit = 1MB)",
    command: "ocr",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
      const apiKey = process.env.OCR_SPACE_API_KEY;
      if (!apiKey) {
        await event.message.edit({
            text: "`Oops!! get the OCR API from` [HERE](https://ocr.space/OCRAPI) `& add it to your Environment Variables` (`OCR_SPACE_API_KEY`)"
        });
        return;
      }

      if (!event.message.replyToMsgId) {
        await event.message.edit({ text: "`I can't read nothing (°ー°〃)\nPlease reply to an image!`" });
        return;
      }

      const replyMsg = await event.message.getReplyMessage();
      if (!replyMsg?.media) {
        await event.message.edit({ text: "`Please reply to an image!`" });
        return;
      }

      const text = event.message.text || "";
      const lang_code = text.split(" ")[1] || "eng";

      await event.message.edit({ text: "`Trying to Read.. 📖`" });

      const buffer = await event.client?.downloadMedia(replyMsg, {});

      if (!buffer) {
        await event.message.edit({ text: "`Failed to download image!`" });
        return;
      }

      try {
        const form = new FormData();
        form.append("file", Buffer.from(buffer), { filename: "image.jpg" });
        form.append("apikey", apiKey);
        form.append("language", lang_code);
        form.append("isOverlayRequired", "false");

        const res = await axios.post("https://api.ocr.space/parse/image", form, {
          headers: form.getHeaders(),
        });

        if (res.data.IsErroredOnProcessing) {
            await event.message.edit({
                text: `\`Couldn't read it.. (╯‵□′)╯︵┻━┻\`\n\`I guess I need new glasses.. 👓\`\n\n**ERROR**: \`${res.data.ErrorMessage || "Unknown Error"}\``
            });
            return;
        }

        const parsedText = res.data.ParsedResults?.[0]?.ParsedText || "";
        
        if (!parsedText.trim()) {
            await event.message.edit({ text: "**Here's what I could read from it:**\n\n`No text found.`" });
        } else {
            await event.message.edit({
                text: `**Here's what I could read from it:**\n\n\`${parsedText}\``
            });
        }
        
        await logToChannel("`ocr` command successfully executed");
      } catch (e: any) {
        await event.message.edit({
            text: `\`Couldn't read it.. (╯‵□′)╯︵┻━┻\`\n\`I guess I need new glasses.. 👓\`\n\n**ERROR**: \`${e.message}\``
        });
      }
    }
  }
];
