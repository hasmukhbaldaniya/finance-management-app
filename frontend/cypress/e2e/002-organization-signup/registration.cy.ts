// Drives the real 5-step wizard end-to-end (org/GST -> details -> verify
// email -> mobile -> dashboard) — this is the one spec that types through
// every step itself; every other module creates its fixture organization
// via cy.apiRegisterOrganization() instead (see cypress/support/commands.ts
// and docs/PLANS/cypress-e2e-testing-plan.md's "Test data strategy").
// The seeded demo org's GST number, reused below to exercise the
// already-registered edge case (auth-service/src/seeders/20260702030000-demo-user.js).
const TAKEN_GST_NUMBER = "27AAAAA0000A1Z5";

function uniqueSuffix(): string {
  return `${Date.now()}${Cypress._.random(100, 999)}`;
}

describe("002 - Organization Signup", () => {
  it("rejects a GST number that's already registered", () => {
    cy.visit("/register");
    cy.findByLabelText("Organization Name").type("Duplicate GST Co");
    // GST availability only checks on blur, not on every keystroke — blur it
    // explicitly rather than relying on a later focus change to trigger it.
    cy.findByLabelText("GST Number").type(TAKEN_GST_NUMBER).blur();
    cy.findByText("This GST number is already registered.").should("be.visible");
    cy.findByRole("button", { name: /continue/i }).should("be.disabled");
    cy.location("pathname").should("eq", "/register");
  });

  it("completes the full signup wizard and lands on the dashboard", () => {
    const unique = uniqueSuffix();
    const organizationName = `Cypress Signup Co ${unique}`;
    const gstNumber = `29CYSGN${unique.slice(-4)}A1Z8`;
    const email = `cypress-signup-${unique}@example.com`;
    const mobileNumber = `8${unique.slice(-9)}`;
    const password = "Cypress@123";

    // Step 1 — Organization Name + GST
    cy.visit("/register");
    cy.findByLabelText("Organization Name").type(organizationName);
    cy.findByLabelText("GST Number").type(gstNumber).blur();
    cy.findByText("GST number is available.").should("be.visible");
    cy.findByRole("button", { name: /continue/i }).click();
    cy.location("pathname").should("eq", "/register/details");

    // Step 2 — Personal details
    cy.findByLabelText("First Name").type("Cypress");
    cy.findByLabelText("Last Name").type("Signup");
    cy.findByLabelText("Email").type(email);
    cy.findByLabelText("Password").type(password);
    cy.findByLabelText("Confirm Password").type(password);
    cy.findByRole("button", { name: /continue/i }).click();
    // Submitting this step sends a real OTP email (through communications-service's
    // SMTP send) before the response comes back — give it more room than the
    // default 4s command timeout.
    cy.location("pathname", { timeout: 15000 }).should("eq", "/register/verify-email");

    // Step 3 — Verify email OTP (read back from communications-service,
    // since auth-service only ever stores a one-way hash of it)
    cy.getLatestNotification(email, "email")
      .extractOtp()
      .then((otp) => {
        cy.findByLabelText("OTP").type(otp);
      });
    cy.findByRole("button", { name: /verify/i }).click();
    cy.location("pathname").should("eq", "/register/mobile");

    // Step 4 — Mobile number, Skip (saves the number, skips OTP verification)
    cy.findByLabelText("Mobile Number").type(mobileNumber);
    cy.findByRole("button", { name: /^skip$/i }).click();

    cy.location("pathname").should("eq", "/dashboard");
    cy.findByRole("tab", { name: /expense summary/i }).should("be.visible");
  });
});
