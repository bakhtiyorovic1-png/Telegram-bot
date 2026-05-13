import app from "./app";
import { logger } from "./lib/logger";
import { setupWebhook } from "./bot";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function startKeepAlive(baseUrl: string) {
  const INTERVAL_MS = 10 * 60 * 1000;
  const pingUrl = `${baseUrl}/api/healthz`;

  setInterval(async () => {
    try {
      const res = await fetch(pingUrl);
      logger.info({ status: res.status }, "Keep-alive ping sent");
    } catch (e) {
      logger.warn({ err: e }, "Keep-alive ping failed");
    }
  }, INTERVAL_MS);

  logger.info({ pingUrl, intervalMinutes: 10 }, "Keep-alive started");
}

app.listen(port, async (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  try {
    await setupWebhook();
  } catch (e) {
    logger.error(e, "Failed to set up webhook");
    process.exit(1);
  }

  const renderUrl = process.env["RENDER_EXTERNAL_URL"];
  if (renderUrl) {
    startKeepAlive(renderUrl);
  }
});
