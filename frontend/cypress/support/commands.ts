/// <reference types="cypress" />
import "@testing-library/cypress/add-commands";

export type RegisteredOrganization = {
  organizationName: string;
  gstNumber: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
};

export type LatestNotification = {
  channel: "email" | "whatsapp";
  subject: string | null;
  body: string;
  createdAt: string;
};

const GATEWAY_URL = Cypress.env("gatewayUrl") as string;
const COMMUNICATIONS_SERVICE_URL = Cypress.env("communicationsServiceUrl") as string;
const COMMUNICATIONS_INTERNAL_API_KEY = Cypress.env("communicationsInternalApiKey") as string;

// Logs in via the same POST the real login form calls, then caches the
// resulting session cookie for the run — see "Authentication strategy" in
// docs/PLANS/cypress-e2e-testing-plan.md. Every module's tests use this
// instead of driving the login form themselves; only 001-authentication's
// own spec exercises the real form.
Cypress.Commands.add("loginAs", (identifier: string, password: string) => {
  return cy.session(
    ["loginAs", identifier],
    () => {
      cy.request("POST", `${GATEWAY_URL}/auth/login`, { identifier, password });
    },
    {
      validate: () => {
        cy.request({ url: `${GATEWAY_URL}/auth/me`, failOnStatusCode: false }).its("status").should("eq", 200);
      },
    }
  );
});

// Test-support only: reads back the most recent notification body
// communications-service actually delivered/logged for a recipient, since
// that's the only place a plaintext OTP or invite link exists in this
// system (auth-service only ever stores a one-way hash). Calls
// communications-service directly, not through the gateway — see
// "Decisions", point 1, in the plan doc for why that's a deliberate
// exception to "tests only go through the gateway".
Cypress.Commands.add("getLatestNotification", (to: string, channel: "email" | "whatsapp" = "email") => {
  return cy
    .request({
      url: `${COMMUNICATIONS_SERVICE_URL}/notifications/latest`,
      qs: { to, channel },
      headers: COMMUNICATIONS_INTERNAL_API_KEY ? { "X-Internal-Api-Key": COMMUNICATIONS_INTERNAL_API_KEY } : {},
    })
    .then((response) => response.body as LatestNotification);
});

Cypress.Commands.add("extractOtp", { prevSubject: true } as const, (notification: LatestNotification) => {
  const match = notification.body.match(/\b\d{6}\b/);
  if (!match) {
    throw new Error(`No 6-digit OTP found in notification body: ${notification.body}`);
  }
  return cy.wrap(match[0]);
});

// Creates a brand-new organization by calling the real registration
// endpoints directly (through the gateway) — the same sequence
// register/*/page.tsx drives, minus typing into the form. Every module past
// 001/002 calls this in a `before` hook instead of sharing one fixture org,
// so specs never depend on another spec file's run order (see "Test data
// strategy" in the plan doc). Mobile is saved-but-unverified, mirroring the
// wizard's own "Skip" action on register/mobile.
//
// Leaves the browser holding a real, valid session cookie for the new owner
// (completeRegistration logs in immediately, same as the real wizard) — call
// cy.clearCookies() afterward if a spec needs to visit /login or
// /forgot-password next, since both of those routes' own layout.tsx redirect
// an already-authenticated visitor straight to /dashboard.
Cypress.Commands.add("apiRegisterOrganization", (overrides: Partial<RegisteredOrganization> = {}) => {
  const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
  const organizationName = overrides.organizationName ?? `Cypress Org ${unique}`;
  const gstNumber = overrides.gstNumber ?? `27CYPRS${unique.slice(-4)}A1Z9`;
  const ownerEmail = overrides.ownerEmail ?? `cypress-${unique}@example.com`;
  const ownerPassword = overrides.ownerPassword ?? "Cypress@123";
  const ownerFirstName = overrides.ownerFirstName ?? "Cypress";
  const ownerLastName = overrides.ownerLastName ?? "Owner";
  const mobileNumber = `9${unique.slice(-9)}`;

  return cy
    .request("POST", `${GATEWAY_URL}/auth/registrations`, {
      organizationName,
      gstNumber,
      firstName: ownerFirstName,
      lastName: ownerLastName,
      email: ownerEmail,
      password: ownerPassword,
    })
    .then(() => cy.getLatestNotification(ownerEmail, "email"))
    .then((notification) => cy.wrap(notification).extractOtp())
    .then((otp) =>
      cy.request("POST", `${GATEWAY_URL}/auth/registrations/email-otp/verify`, { email: ownerEmail, otp })
    )
    .then(({ body }) => {
      const registrationToken = (body as { registrationToken: string }).registrationToken;
      return cy
        .request("PUT", `${GATEWAY_URL}/auth/registrations/mobile`, { registrationToken, mobileNumber })
        .then(() => cy.request("POST", `${GATEWAY_URL}/auth/registrations/complete`, { registrationToken }));
    })
    .then(() => {
      const result: RegisteredOrganization = {
        organizationName,
        gstNumber,
        ownerEmail,
        ownerPassword,
        ownerFirstName,
        ownerLastName,
      };
      return result;
    });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      loginAs(identifier: string, password: string): Chainable<null>;
      getLatestNotification(to: string, channel?: "email" | "whatsapp"): Chainable<LatestNotification>;
      extractOtp(): Chainable<string>;
      apiRegisterOrganization(overrides?: Partial<RegisteredOrganization>): Chainable<RegisteredOrganization>;
    }
  }
}
