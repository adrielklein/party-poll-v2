const { App, LogLevel } = require("@slack/bolt");
var qs = require("querystring");
const { createPoll } = require("./pollCreator/poll");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
  customRoutes: [
    {
      path: "/",
      method: ["POST"],
      handler: (req, res) => {
        let data = "";
        req.on("data", (chunk) => {
          data += chunk;
        });
        req.on("end", () => {
          const body = JSON.parse(data);
          res.writeHead(200, { "Content-Type": "application/json" });

          const responseBody = { challenge: body.challenge };

          res.write(JSON.stringify(responseBody));
          res.end();
        });
        req.on("error", (err) => {
          // This prints the error message and stack trace to `stderr`.
          console.error(err.stack);
        });
      },
    },
  ],
});

app.message("hello", async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Hey there <@${message.user}>!`,
        },
      },
    ],
    text: `Hey there <@${message.user}>!`,
  });
});

app.command("/echo", async ({ command, ack, respond }) => {
  // Acknowledge command request
  await ack();

  await respond(`${command.text}`);
});

app.command("/partypoll", async ({ command, ack, say, body }) => {
  // Acknowledge command request
  await ack();
  await createPoll(body.channel_id, body.text, say)

  await say(`Party poll coming soon!`);
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
