const { App, ExpressReceiver, LogLevel } = require("@slack/bolt");
const { FileInstallationStore } = require("@slack/oauth");
const serverlessExpress = require("@vendia/serverless-express");
const axios = require("axios");

var qs = require("querystring");
const { createPoll } = require("./pollCreator/poll");

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: "my-secret",
  scopes: ["chat:write", "commands"],
});

// Initializes your app with your bot token and signing secret
const app = new App({
  // token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
  processBeforeResponse: true,
  logLevel: LogLevel.DEBUG,
  redirectUri:
    "https://dtyiwqjl70.execute-api.us-east-1.amazonaws.com/dev/slack/oauth_redirect",
  installerOptions: {
    directInstall: true,
  },
});

app.command("/partypoll", async ({ ack, say, body, client }) => {
  // Acknowledge command request
  await ack();
  await client.conversations.join({ channel: body.channel_id });
  await createPoll(body.text, say, client);
});

expressReceiver.router.post("/slack/events", (req, res) => {
  const body = req.body;
  res.writeHead(200, { "Content-Type": "application/json" });

  console.log("got here with body", { body });

  const responseBody = { challenge: body.challenge };

  console.log("got here with responseBody", { responseBody });

  res.write(JSON.stringify(responseBody));
  res.end();
});

expressReceiver.router.get("/slack/oauth_redirect", async (req, res) => {
  console.log("got to oauth_redirect with req", { req });
  const query = req.query;
  res.writeHead(200, { "Content-Type": "application/json" });

  console.log("got here with query", { params: query });

  const code = query.code;
  const state = query.state;

  console.log("got here with code and state", { code, state });

  const data = {
    code,
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    state,
  };
  console.log("client id is ", process.env.SLACK_CLIENT_ID);
  const options = {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    data: qs.stringify(data),
    url: "https://slack.com/api/oauth.v2.access",
  };
  try {
    await axios(options)
      .then((response) => {
        console.log("success in api/oauth.v2.access");
        console.log({ response });
        console.log("meta", response.data.response_metadata);
      })
      .catch((error) => {
        console.log("error in api/oauth.v2.access");
        console.log(error);
      });
  } catch (error) {
    console.log("got error with axios", { error });
  }
  console.log("done with axios");

  res.send("You are now authenticated and can use Party Poll in your app!");
  res.end();
});

expressReceiver.router.get("/health-check", (req, res) => {
  // You're working with an express req and res now.
  console.log("loggin health check");
  res.send("yay!");
});

module.exports.handler = serverlessExpress({
  app: expressReceiver.app,
});
