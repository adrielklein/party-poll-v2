const { App, ExpressReceiver, LogLevel } = require("@slack/bolt");
const serverlessExpress = require("@vendia/serverless-express");
const { Client } = require("pg");

const { createPoll } = require("./pollCreator/poll");

const db_creds = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: true,
};

const database = {
  set: async (key, data) => {
    console.log("Database SET start");
    console.log({
      key,
      data,
    });
    const client = new Client(db_creds);
    await client.connect();
    const result = await client.query(
      "INSERT INTO installations (id, data) VALUES($1, $2)",
      [key, JSON.stringify(data)]
    );
    console.log("finished the pool query for Database SET", { result });
    await client.end();
  },
  delete: async (key) => {
    console.log("Database DELETE start");
    const client = new Client(db_creds);
    await client.connect();
    const result = await client.query(
      `DELETE FROM installations WHERE id='${key}';`
    );
    await client.end();
    console.log("Database DELETE END", { result });
  },
  get: async (key) => {
    console.log("Database GET Start", key);
    const client = new Client(db_creds);
    await client.connect();
    const result = await client.query(
      `SELECT data FROM installations WHERE id='${key}'`
    );
    const returnValue = result.rows[0].data;
    console.log("Database GET end", { result, returnValue });
    await client.end();
    return returnValue;
  },
};

const expressReceiver = new ExpressReceiver({
  processBeforeResponse: true,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: "my-secret",
  installerOptions: {
    directInstall: true,
  },
  scopes: [
    "chat:write",
    "commands",
    "channels:join",
    "reactions:write",
    "channels:read",
  ],
  installationStore: {
    storeInstallation: async (installation) => {
      // Bolt will pass your handler an installation object
      // Change the lines below so they save to your dat  ase
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
      console.log("HELLLOOOOOO");
      console.log("calling fetchInstallation with", { installQuery });

      if (
        installQuery.isEnterpriseInstall &&
        installQuery.enterpriseId !== undefined
      ) {
        // handle org wide app installation lookup
        console.log("orgwide", installQuery.enterpriseId);
        const returnValue = await database.get(installQuery.enterpriseId);

        console.log({ returnValue });

        return returnValue;
      }
      if (installQuery.teamId !== undefined) {
        // single team app installation lookup
        console.log("singleTeam", installQuery.teamId);
        const returnValue = await database.get(installQuery.teamId);
        console.log({ returnValue });
        return returnValue;
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
  installerOptions: {
    directInstall: true,
  },
});

app.command("/partypoll", async ({ ack, say, body, client }) => {
  console.log("got to /partypoll and starting execution", body.channel_id);
  const conversationListResponse = await client.conversations.list();
  const isPublicChannel =
    conversationListResponse.channels.filter(
      (channel) => channel.id === body.channel_id
    ).length > 0;
  if (isPublicChannel) {
    ack();
    const joinResult = await client.conversations.join({
      channel: body.channel_id,
    });

    console.log("finished client.conversations.join", { result: joinResult });
    await createPoll(body.text, say, client);
    console.log("finished createPoll");
  } else {
    ack(
      "/partypoll cannot be used in a private channel or DM at this time. Please use the command only in public channels."
    );
  }
});

app.command("/partypolltest", async ({ ack, say, body, client }) => {
  console.log("got to test");
  await ack();
  await say("hello world");
  console.log("done with say");
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
  // THIS CODE DOESN'T ACTUALLY HIT SINCE THE REDIRECT URL IS BUILT IN BY BOLT
  console.log("got to oauth_redirect with req", { req });
  const query = req.query;
  res.writeHead(200, { "Content-Type": "application/json" });

  console.log("got here with query", { query });

  const code = query.code;
  const state = query.state;
  const error = query.error;

  if (error === "access_denied") {
    res.send(
      "<p>You have denied access to Party Poll. If this was a mistake, please visit <a href='https://party-poll.app/'>the home page</a> and try again.<p>"
    );
  } else if (error) {
    console.log("unexpected error!!!", { error });

    res.send(
      `<p>An unexpected error occured (${error}), please visit  <a href='https://party-poll.app/'>the home page</a> to try again.</p>`
    );
  }
});

expressReceiver.router.get("/health-check", (req, res) => {
  // You're working with an express req and res now.
  console.log("loggin health check");
  res.send("yay!");
});

module.exports.handler = serverlessExpress({
  app: expressReceiver.app,
});
