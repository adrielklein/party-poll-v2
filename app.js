const { App, ExpressReceiver, LogLevel } = require("@slack/bolt");
const serverlessExpress = require("@vendia/serverless-express");
const axios = require("axios");
const { Pool } = require("pg");

var qs = require("querystring");
const { createPoll } = require("./pollCreator/poll");

const pool = new Pool({
  user: "adrielklein",
  host: "database-1.cdfkloccybir.us-east-1.rds.amazonaws.com",
  database: "partypoll",
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const database = {
  set: async (key, data) => {
    console.log("Database SET start");
    const query = `INSERT INTO installations (id, data) VALUES('${key}', '${JSON.stringify(
      data
    )}');`;
    console.log({
      query,
    });
    const result = await pool.query(query);
    console.log("finished the pool query for Database SET", { result });
  },
  delete: async (key) => {
    console.log("Database DELETE start");
    const result = await pool.query(
      `DELETE FROM installations WHERE id='${key}';`
    );
    console.log("Database DELETE END", { result });
  },
  get: async (key) => {
    console.log("Database GET Start");
    const result = await pool.query(
      `SELECT data FROM installations WHERE id='${key}'`
    );
    const returnValue = result.rows[0].data;
    console.log("Database GET end", { result, returnValue });
    return returnValue;
  },
};

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: "my-secret",
  scopes: [
    "chat:write",
    "commands",
    "channels:join",
    "channels:history",
    "chat:write",
    "chat:write.public",
    "groups:history",
    "im:history",
    "mpim:history",
    "reactions:write",
  ],
  // installerOptions: {
  //   redirectUriPath:
  //     "https://dtyiwqjl70.execute-api.us-east-1.amazonaws.com/dev/slack/oauth_redirect",
  // },
  installationStore: {
    storeInstallation: async (installation) => {
      // Bolt will pass your handler an installation object
      // Change the lines below so they save to your database
      console.log("calling storeInstallation");
      if (
        installation.isEnterpriseInstall &&
        installation.enterprise !== undefined
      ) {
        // handle storing org-wide app installation
        return await database.set(installation.enterprise.id, installation);
      }
      if (installation.team !== undefined) {
        // single team app installation
        return await database.set(installation.team.id, installation);
      }
      throw new Error("Failed saving installation data to installationStore");
    },
    fetchInstallation: async (installQuery) => {
      // Bolt will pass your handler an installQuery object
      // Change the lines below so they fetch from your database
      console.log("calling fetchInstallation");

      if (
        installQuery.isEnterpriseInstall &&
        installQuery.enterpriseId !== undefined
      ) {
        // handle org wide app installation lookup
        return await database.get(installQuery.enterpriseId);
      }
      if (installQuery.teamId !== undefined) {
        // single team app installation lookup
        return await database.get(installQuery.teamId);
      }
      throw new Error("Failed fetching installation");
    },
    deleteInstallation: async (installQuery) => {
      // Bolt will pass your handler  an installQuery object
      // Change the lines below so they delete from your database
      console.log("calling deleteInstallation");
      if (
        installQuery.isEnterpriseInstall &&
        installQuery.enterpriseId !== undefined
      ) {
        // org wide app installation deletion
        return await database.delete(installQuery.enterpriseId);
      }
      if (installQuery.teamId !== undefined) {
        // single team app installation deletion
        return await database.delete(installQuery.teamId);
      }
      throw new Error("Failed to delete installation");
    },
  },
});

// Initializes your app with your bot token and signing secret
const app = new App({
  // token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
  processBeforeResponse: true,
  logLevel: LogLevel.DEBUG,
  // redirectUri:
  //   "https://dtyiwqjl70.execute-api.us-east-1.amazonaws.com/dev/slack/oauth_redirect",
  installerOptions: {
    directInstall: true,
  },
});

app.command("/partypoll", async ({ ack, say, body, client }) => {
  console.log("got to /partypoll", ack, say, body, client);
  // Acknowledge command request
  const ackResult = await ack();
  console.log("finished ack", { ackResult });
  // console.log("client.conversations", client.conversations);
  // await client.conversations.join({ channel: body.channel_id });
  // console.log("finished client.conversations.join");
  await createPoll(body.text, say, client);
  console.log("finished createPoll");
  console.log("error in slach command", { error });
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
