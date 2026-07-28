// The one spec in this codebase that drives the real login form — every
// other module logs in via cy.loginAs() (see cypress/support/commands.ts).
// Credentials are the seeded demo account, not a secret: see
// auth-service/src/seeders/20260702030000-demo-user.js.
const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "Passw0rd!";

describe("001 - Authentication - Login", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("shows validation errors when submitted empty", () => {
    cy.findByRole("button", { name: /login/i }).click();
    cy.findByText("Email or phone number is required.").should("be.visible");
    cy.findByText("Password is required.").should("be.visible");
    cy.location("pathname").should("eq", "/login");
  });

  it("rejects an identifier that is neither a valid email nor an India phone number", () => {
    cy.findByLabelText("Email or Phone Number").type("not-an-identifier");
    cy.findByLabelText("Password").type("whatever");
    cy.findByRole("button", { name: /login/i }).click();
    cy.findByText("Enter a valid email address or India phone number.").should("be.visible");
  });

  it("shows an error toast for invalid credentials", () => {
    cy.findByLabelText("Email or Phone Number").type(DEMO_EMAIL);
    cy.findByLabelText("Password").type("WrongPassword!1");
    cy.findByRole("button", { name: /login/i }).click();
    cy.findByRole("alert").should("contain.text", "Invalid email/phone number or password.");
    cy.location("pathname").should("eq", "/login");
  });

  it("logs in with valid credentials and redirects to the dashboard", () => {
    cy.findByLabelText("Email or Phone Number").type(DEMO_EMAIL);
    cy.findByLabelText("Password").type(DEMO_PASSWORD);
    cy.findByRole("button", { name: /login/i }).click();
    cy.location("pathname").should("eq", "/dashboard");
  });

  it("links to Forgot Password and Register", () => {
    cy.findByRole("link", { name: /forgot password/i }).should("have.attr", "href", "/forgot-password");
    cy.findByRole("link", { name: /register your company/i }).should("have.attr", "href", "/register");
  });
});
