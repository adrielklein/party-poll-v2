const { App, LogLevel, AwsLambdaReceiver } = require("@slack/bolt");

var qs = require("querystring");
const { createPoll } = require("./pollCreator/poll");

// Initialize your custom receiver
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: awsLambdaReceiver,
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

          console.log("got here with body", { body });

          const responseBody = { challenge: body.challenge };

          console.log("got here with responseBody", { responseBody });

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

app.command("/partypoll", async ({ ack, say, body, client }) => {
  // Acknowledge command request
  await ack();
  await client.conversations.join({ channel: body.channel_id });
  await createPoll(body.text, say, client);
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();

// Handle the Lambda function event
module.exports.handler = async (event, context, callback) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
