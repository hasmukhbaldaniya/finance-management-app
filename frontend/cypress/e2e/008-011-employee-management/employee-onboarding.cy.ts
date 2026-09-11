// 011 — the invited employee's own accept-invite flow, reached via the
// link in the invite email. Uses cy.apiInviteAndOnboardEmployee({onboard:
// false}) to get a real, still-pending invite without going through
// cy.apiInviteAndOnboardEmployee's own onboarding half, then drives every
// onboarding page for real through the browser (that command's own
// onboarding chain is direct API calls, meant as fast setup for OTHER
// modules — this spec is what actually verifies 011's UI).
const PASSWORD = "Onboard@123";

describe("011 - Employee Onboarding", () => {
  let ownerEmail: string;
  let ownerPassword: string;

  before(() => {
    cy.apiRegisterOrganization().then((org) => {
      ownerEmail = org.ownerEmail;
      ownerPassword = org.ownerPassword;
    });
  });

  it("completes the full flow via the real invite link and lands on the dashboard", () => {
    // Test isolation clears cookies before every test, even though `before`
    // only ran once — re-establish the owner session apiInviteAndOnboardEmployee
    // needs before calling it.
    cy.loginAs(ownerEmail, ownerPassword);
    cy.apiInviteAndOnboardEmployee({ onboard: false }).then((employee) => {
      // The invite itself (and cy.apiRegisterOrganization before it) leaves
      // the browser holding the OWNER's session — onboarding is a public,
      // no-session flow, so clear it before visiting.
      cy.clearCookies();

      cy.getLatestNotification(employee.email, "email")
        .extractToken()
        .then((token) => {
          cy.visit(`/onboarding?token=${token}`);

          // Step 1 — set password. Email is pre-filled/disabled from the token.
          cy.findByLabelText("Email").should("have.value", employee.email);
          cy.findByLabelText("Password").type(PASSWORD);
          cy.findByLabelText("Confirm Password").type(PASSWORD);
          cy.findByRole("button", { name: /continue/i }).click();
          cy.location("pathname").should("eq", "/onboarding/profile");

          // Step 2 — profile, pre-filled from the invite's own Basic Information.
          cy.findByLabelText("First Name").should("have.value", employee.firstName);
          cy.findByLabelText("Last Name").should("have.value", employee.lastName);
          cy.findByRole("button", { name: /continue/i }).click();
          cy.location("pathname").should("eq", "/onboarding/mobile");

          // Step 3 — mobile. Unlike registration's own mobile step, onboarding's
          // Skip needs no number entered at all — it completes immediately.
          cy.findByRole("button", { name: /^skip$/i }).click();
          cy.location("pathname", { timeout: 15000 }).should("eq", "/dashboard");
          cy.findByRole("tab", { name: /expense summary/i }).should("be.visible");
        });

      // The new employee can now log in with the password they just set.
      cy.clearCookies();
      cy.visit("/login");
      cy.findByLabelText("Email or Phone Number").type(employee.email);
      cy.findByLabelText("Password").type(PASSWORD);
      cy.findByRole("button", { name: /login/i }).click();
      cy.location("pathname").should("eq", "/dashboard");
    });
  });

  it("shows an invalid-link state for a bad token instead of silently redirecting", () => {
    cy.clearCookies();
    cy.visit("/onboarding?token=not-a-real-token");
    cy.findByText("Invitation link invalid").should("be.visible");
  });
});
