import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
} from "discord.js";

const required = ["DISCORD_TOKEN", "ROLE_ID"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const config = {
  token: process.env.DISCORD_TOKEN,
  roleId: process.env.ROLE_ID,

  // Lumi Applications bot ID from your message logs.
  lumiBotId: process.env.LUMI_BOT_ID ?? "1448480054739730512",

  // Leave blank to accept Lumi application messages in any channel.
  sourceChannelId: process.env.SOURCE_CHANNEL_ID || null,

  // Leave blank to send the ping in the same channel as Lumi's message.
  targetChannelId: process.env.TARGET_CHANNEL_ID || null,

  // Set to "true" to reply directly to Lumi's application message.
  replyToApplication: process.env.REPLY_TO_APPLICATION === "true",

  // Optional: only ping for one form. Leave blank for every Lumi application.
  formName: process.env.FORM_NAME?.trim() || null,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    // Only process messages sent by Lumi Applications.
    if (message.author.id !== config.lumiBotId) return;

    // Optionally restrict detection to one channel.
    if (
      config.sourceChannelId &&
      message.channel.id !== config.sourceChannelId
    ) {
      return;
    }

    const embed = message.embeds.at(0);
    if (!embed) return;

    const title = embed.title ?? "";
    const description = embed.description ?? "";

    // Matches the log message:
    // Title: "📥 New Application"
    if (title !== "📥 New Application") return;

    // Extra safety check so similarly titled embeds do not trigger it.
    if (!description.includes("submitted a new application")) return;

    // Optional filter for one specific application form.
    if (
      config.formName &&
      !description.toLowerCase().includes(config.formName.toLowerCase())
    ) {
      return;
    }

    const pingText = `<@&${config.roleId}> A new application was submitted.`;

    if (config.targetChannelId) {
      const targetChannel = await client.channels.fetch(config.targetChannelId);

      if (!targetChannel?.isTextBased()) {
        throw new Error("TARGET_CHANNEL_ID is not a text-based channel.");
      }

      await targetChannel.send({
        content: pingText,
        allowedMentions: { roles: [config.roleId] },
      });
      return;
    }

    if (config.replyToApplication) {
      await message.reply({
        content: pingText,
        allowedMentions: {
          roles: [config.roleId],
          repliedUser: false,
        },
      });
    } else {
      await message.channel.send({
        content: pingText,
        allowedMentions: { roles: [config.roleId] },
      });
    }
  } catch (error) {
    console.error("Failed to process a Lumi application message:", error);
  }
});

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

client.login(config.token);
