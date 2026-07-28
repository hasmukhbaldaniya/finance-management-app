import { defineConfig } from "cypress";

// See docs/PLANS/cypress-e2e-testing-plan.md for the environment topology and
// why baseUrl is the frontend, not the gateway, even though every network
// call under test goes through the gateway.
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    setupNodeEvents() {
      // No custom tasks yet — cy.request() alone covers the gateway/
      // communications-service calls tests need (see support/commands.ts).
    },
  },
  env: {
    // The single browser-facing origin every app request goes through —
    // never call auth-service/claim-service/etc. directly from a test.
    gatewayUrl: process.env.CYPRESS_GATEWAY_URL ?? "http://localhost:4400/api",
    // Test-support only: reading back a delivered OTP/invite-link body has
    // no equivalent in the real app, so it's the one thing tests call
    // directly instead of through the gateway (see the plan doc's
    // "Decisions" section, point 1).
    communicationsServiceUrl: process.env.CYPRESS_COMMUNICATIONS_SERVICE_URL ?? "http://localhost:4200/api",
    communicationsInternalApiKey: process.env.CYPRESS_COMMUNICATIONS_INTERNAL_API_KEY ?? "",
  },
});
