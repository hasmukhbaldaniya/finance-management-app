// Password reset is destructive to whatever account it targets, so this
// spec never touches the shared demo login — every test registers its own
// brand-new throwaway organization (see cy.apiRegisterOrganization in
// cypress/support/commands.ts) and resets that account's own password.
const NEW_PASSWORD = "NewPassw0rd!";

describe("001 - Authentication - Forgot Password", () => {
  let ownerEmail: string;

  beforeEach(() => {
    cy.apiRegisterOrganization().then((org) => {
      ownerEmail = org.ownerEmail;
    });
    // Registration itself logs the new owner in — clear that session so
    // forgot-password's own "already authenticated? bounce to /dashboard"
    // layout guard (forgot-password/layout.tsx) doesn't short-circuit these
    // tests before they ever reach the form.
    cy.clearCookies();
  });

  it("redirects step 2/3 back to step 1 when visited directly with no email/token in context", () => {
    cy.visit("/forgot-password/verify");
    cy.location("pathname").should("eq", "/forgot-password");
    cy.visit("/forgot-password/reset");
    cy.location("pathname").should("eq", "/forgot-password");
  });

  it("shows an error for an email that isn't registered", () => {
    cy.visit("/forgot-password");
    cy.findByLabelText("Email").type("nobody-registered@example.com");
    cy.findByRole("button", { name: /submit/i }).click();
    cy.findByRole("alert").should("contain.text", "This email is not registered.");
    cy.location("pathname").should("eq", "/forgot-password");
  });

  it("rejects an incorrect OTP", () => {
    cy.visit("/forgot-password");
    cy.findByLabelText("Email").type(ownerEmail);
    cy.findByRole("button", { name: /submit/i }).click();
    // Submitting this step sends a real OTP email before responding — see
    // the equivalent comment in 002-organization-signup/registration.cy.ts.
    cy.location("pathname", { timeout: 15000 }).should("eq", "/forgot-password/verify");

    cy.findByLabelText("OTP").type("000000");
    cy.findByRole("button", { name: /verify/i }).click();
    cy.findByRole("alert").should("contain.text", "Invalid OTP. Please try again.");
    cy.location("pathname").should("eq", "/forgot-password/verify");
  });

  it("requests, verifies, resets the password end-to-end, and the new password logs in", () => {
    cy.visit("/forgot-password");
    cy.findByLabelText("Email").type(ownerEmail);
    cy.findByRole("button", { name: /submit/i }).click();
    cy.location("pathname", { timeout: 15000 }).should("eq", "/forgot-password/verify");

    cy.getLatestNotification(ownerEmail, "email")
      .extractOtp()
      .then((otp) => {
        cy.findByLabelText("OTP").type(otp);
      });
    cy.findByRole("button", { name: /verify/i }).click();
    cy.location("pathname").should("eq", "/forgot-password/reset");

    cy.findByLabelText("New Password").type(NEW_PASSWORD);
    cy.findByLabelText("Confirm Password").type(NEW_PASSWORD);
    cy.findByRole("button", { name: /submit/i }).click();
    cy.location("pathname").should("eq", "/login");

    cy.findByLabelText("Email or Phone Number").type(ownerEmail);
    cy.findByLabelText("Password").type(NEW_PASSWORD);
    cy.findByRole("button", { name: /login/i }).click();
    cy.location("pathname").should("eq", "/dashboard");
  });
});
