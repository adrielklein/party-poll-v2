const reactionNames = [
  "tada",
  "balloon",
  "confetti_ball",
  "partying_face",
  "birthday",
  "gift",
  "cupcake",
  "laughing",
  "pinata",
  "kissing_heart",
];

const createPoll = async (channelId, text, say) => {
  console.log("createPoll", { text });
  //   if (text === "help" || text === "") {
  //     return sendHelp(channelId);
  //   }
  const values = text
    .replace(/\“|\”|\〝|\〞/g, '"') // Convert irregular quotes to regular ones
    .match(/\w+|"[^"]+"/g)
    .map((value) => value.replace(/\"|\'|\“|\”|\”|\〝|\〞/g, ""));
  console.log({ values });
  const options = values.length === 1 ? ["yes", "no"] : values.splice(1);
  if (options.length > 10) {
    return sendError(channelId);
  }
  console.log({ options });

  formattedOptions = options.map(
    (option, i) => `:${reactionNames[i]}: ${option}`
  );

  const thing = {
    channel: channelId,
    blocks: [
      { type: "header", text: { type: "plain_text", text: values[0] } },
      {
        type: "section",
        text: { type: "mrkdwn", text: formattedOptions.join("\n") },
      },
    ],
  };
  say(thing);

  //   try {
  //     console.log("about to post");
  //     const { channel, message } = await web.chat.postMessage({
  //       token: getAccessToken(),
  //       channel: channelId,
  //       blocks: [
  //         { type: "header", text: { type: "plain_text", text: values[0] } },
  //         {
  //           type: "section",
  //           text: { type: "mrkdwn", text: formattedOptions.join("\n") },
  //         },
  //       ],
  //     });
  //     console.log("posted", { channel, message });
  //     const { ts } = message;
  //     for (let i = 0; i < options.length; i++) {
  //       await web.reactions.add({
  //         token: getAccessToken(),
  //         channel,
  //         name: reactionNames[i],
  //         timestamp: ts,
  //       });
  //     }
  //   } catch (error) {
  //     console.log({ error });
  //   }

  console.log("Message posted!");
};

exports.createPoll = createPoll;
