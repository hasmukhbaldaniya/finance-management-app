import { createApp } from "./app";
import { env } from "./config/env";

function start(): void {
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Gateway listening on port ${env.port}`);
  });
}

start();
