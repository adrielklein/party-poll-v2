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

const sendError = (say, numOptions) => {
  return say({
    response_type: "ephemeral",
    text: "Sorry friend :cry:",
    attachments: [
      {
        text: `Max number of options is 10. You gave ${numOptions} :flushed:\nPlease try again with fewer options`,
      },
    ],
  });
};

const createPoll = async ( text, say, client) => {
  console.log("createPoll", { text });
  if (text === "help" || text === "") {
    return sendHelp(say);
  }

  const values = text
    .replace(/\“|\”|\〝|\〞/g, '"') // Convert irregular quotes to regular ones
    .match(/\w+|"[^"]+"/g)
    .map((value) => value.replace(/\"|\'|\“|\”|\”|\〝|\〞/g, ""));
  const title = values[0];
  const options = values.length === 1 ? ["yes", "no"] : values.slice(1);
  if (options.length > 10) {
    return sendError(say, options.length);
  }

  const formattedOptions = options.map(
    (option, i) => `:${REACTION_NAMES[i]}: ${option}`
  );

  const outboundMessage = {
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
