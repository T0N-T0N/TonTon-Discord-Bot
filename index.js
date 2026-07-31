import discord from "discord.js";

const {
  Client,
  GatewayIntentBits,
} = discord;

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing environment variable: DISCORD_TOKEN");
  process.exit(1);
}

const config = {
  token: process.env.DISCORD_TOKEN,

  lumiBotId:
    process.env.LUMI_BOT_ID || "1448480054739730512",

  // Leave blank to watch every channel.
  // Multiple channel IDs should be separated by commas.
  sourceChannelIds: process.env.SOURCE_CHANNEL_IDS
    ? process.env.SOURCE_CHANNEL_IDS
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [],

  // Match each Lumi form name to the role that should be pinged.
  formRoles: {
    "Forgotten Storyteller Application":
      process.env.STORYTELLER_ROLE_ID,

    "Forgotten Scouts Application":
      process.env.SCOUTS_ROLE_ID,

    "Forgotten Helper Application":
      process.env.HELPER_ROLE_ID,

    "Forgotten Designer Application":
      process.env.DESIGNER_ROLE_ID,

    "Forgotten Architects Application":
      process.env.ARCHITECTS_ROLE_ID,

    "Forgotten Visionaries Application":
      process.env.VISIONARIES_ROLE_ID,

    "Forgotten Festival Application":
      process.env.FESTIVAL_ROLE_ID,

    "Forgotten Support Application":
      process.env.SUPPORT_ROLE_ID,
  },
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
    // Only process messages from Lumi.
    if (message.author.id !== config.lumiBotId) return;

    // Restrict the bot to selected channels when IDs are provided.
    if (
      config.sourceChannelIds.length > 0 &&
      !config.sourceChannelIds.includes(message.channel.id)
    ) {
      return;
    }

    const embed = message.embeds[0];
    if (!embed) return;

    // Match Lumi's application embed.
    if (embed.title !== "📝 New Application — Pending Review") {
      return;
    }

    const formField = embed.fields?.find(
      (field) => field.name.toLowerCase() === "form"
    );

    const applicantField = embed.fields?.find(
      (field) => field.name.toLowerCase() === "applicant"
    );

    const formName = formField?.value?.trim();
    const applicantName =
      applicantField?.value?.trim() || "Someone";

    if (!formName) {
      console.log("Application detected, but no form name was found.");
      return;
    }

    // Find the correct role for this form.
    const roleId = config.formRoles[formName];

    if (!roleId) {
      console.log(
        `No role is configured for form: ${formName}`
      );
      return;
    }

    // Ping the correct role in the same channel as Lumi's message.
    await message.channel.send({
      content:
        `<@&${roleId}> ${applicantName} submitted a ` +
        `**${formName}**. Discuss in the thread below.`,
      allowedMentions: {
        roles: [roleId],
      },
    });

    console.log(
      `Pinged role ${roleId} for "${formName}" ` +
      `in channel ${message.channel.id}`
    );
  } catch (error) {
    console.error(
      "Failed to process a Lumi application:",
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
