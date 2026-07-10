import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();
app.listen(env.port, () => {
  console.log(`AI service listening on port ${env.port}${env.anthropicApiKey ? "" : " (ANTHROPIC_API_KEY not set — extraction calls will return 'not configured')"}`);
});
