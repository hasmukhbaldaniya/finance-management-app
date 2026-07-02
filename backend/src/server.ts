import { createApp } from "./app";
import { env } from "./config/env";
import { sequelize } from "./config/database";

async function start(): Promise<void> {
  await sequelize.authenticate();
  console.log("Database connection established.");

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

start().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
