import { createApp } from "./app";
import { env } from "./config/env";

function start(): void {
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`reports-service listening on port ${env.port}`);
  });
}

start();
