const { App, LogLevel } = require("@slack/bolt");
var qs = require("querystring");

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

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
