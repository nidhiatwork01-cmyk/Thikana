import { buildApp } from "./app.js";
import { env } from "./config/index.js";
import { APP_CONFIG } from "@thikana/shared-types";

async function main() {
  const app = buildApp();

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST
    });
    app.log.info(`🚀 ${APP_CONFIG.name} API server listening on ${address}`);
    app.log.info(`📍 Regional Focus: ${APP_CONFIG.city}, ${APP_CONFIG.state}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}. Shutting down gracefully...`);
      await app.close();
      process.exit(0);
    });
  }
}

main();
