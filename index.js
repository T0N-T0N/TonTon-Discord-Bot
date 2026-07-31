import discord from "discord.js";

const {
  Client,
  GatewayIntentBits,
} = discord;

const requiredVariables = ["DISCORD_TOKEN", "ROLE_ID"];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    console.error(`Missing environment variable: ${variable}`);
    process.exit(1);
  }
}

const config = {
  token: process.env.DISCORD_TOKEN,
  roleId: process.env.ROLE_ID,

  lumiBotId:
    process.env.LUMI_BOT_ID || "1448480054739730512",

  sourceChannelId:
    process.env.SOURCE_CHANNEL_ID || null,

  targetChannelId:
    process.env.TARGET_CHANNEL_ID || null,

  replyToApplication:
    process.env.REPLY_TO_APPLICATION === "true",

  formName:
    process.env.FORM_NAME?.trim() || null,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.id !== config.lumiBotId) return;

    if (
      config.sourceChannelId &&
      message.channel.id !== config.sourceChannelId
    ) {
      return;
    }

    const embed = message.embeds[0];
    if (!embed) return;

    const title = embed.title || "";
    const description = embed.description || "";

    if (title !== "📥 New Application") return;

    if (!description.includes("submitted a new application")) {
      return;
    }

    if (
      config.formName &&
      !description
        .toLowerCase()
        .includes(config.formName.toLowerCase())
    ) {
      return;
    }

    const pingText =
      `<@&${config.roleId}> A new application was submitted.`;

    const messageOptions = {
      content: pingText,
      allowedMentions: {
        roles: [config.roleId],
      },
    };

    if (config.targetChannelId) {
      const targetChannel = await client.channels.fetch(
        config.targetChannelId
      );

      if (!targetChannel || !targetChannel.isTextBased()) {
        throw new Error(
          "TARGET_CHANNEL_ID is not a text-based channel."
        );
      }

      await targetChannel.send(messageOptions);
      return;
    }

    if (config.replyToApplication) {
      await message.reply({
        ...messageOptions,
        allowedMentions: {
          roles: [config.roleId],
          repliedUser: false,
        },
      });
    } else {
      await message.channel.send(messageOptions);
    }
  } catch (error) {
    console.error(
      "Failed to process Lumi application:",
      error
    );
  }
});

client.on("error", (error) => {
  console.error("Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

client.login(config.token);