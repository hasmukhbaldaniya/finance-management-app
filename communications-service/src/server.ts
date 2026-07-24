import { createApp } from "./app";
import { env } from "./config/env";
import { connectMongo } from "./db/mongoose";

async function main(): Promise<void> {
  await connectMongo();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`communications-service listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start communications-service:", err);
  process.exit(1);
});
