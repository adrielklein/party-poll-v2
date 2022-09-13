const { HELP_TEXT_LINES } = require("./constants");
const { REACTION_NAMES } = require("./constants");

const sendHelp = (say) => {
  return say({
    text: "Hello friend :wave: Welcome to party poll :balloon:",
    attachments: [
      {
        text: HELP_TEXT_LINES.join("\n"),
      },
    ],
  });
};

const getTitleAndFormattedOptions = (channelId, text) => {
  const values = text
    .replace(/\“|\”|\〝|\〞/g, '"') // Convert irregular quotes to regular ones
    .match(/\w+|"[^"]+"/g)
    .map((value) => value.replace(/\"|\'|\“|\”|\”|\〝|\〞/g, ""));
  const title = values[0];
  const options = values.length === 1 ? ["yes", "no"] : values;
  if (options.length > 10) {
    return sendError(channelId);
  }

  return {
    title,
    formattedOptions: options
      .slice(1)
      .map((option, i) => `:${REACTION_NAMES[i]}: ${option}`),
  };
};

const createPoll = async (channelId, text, say, client) => {
  console.log("createPoll", { text });
  if (text === "help" || text === "") {
    return sendHelp(say);
  }

  const { title, formattedOptions } = getTitleAndFormattedOptions(
    channelId,
    text
  );

  const outboundMessage = {
    channel: channelId,
    blocks: [
      { type: "header", text: { type: "plain_text", text: title } },
      {
        type: "section",
        text: { type: "mrkdwn", text: formattedOptions.join("\n") },
      },
    ],
  };
  const sayResponse = await say(outboundMessage);
  const { channel, message } = sayResponse;
  const { ts } = message;

  for (let i = 0; i < formattedOptions.length; i++) {
    await client.reactions.add({
      channel,
      name: REACTION_NAMES[i],
      timestamp: ts,
    });
  }

  console.log("Message posted!");
};

exports.createPoll = createPoll;
