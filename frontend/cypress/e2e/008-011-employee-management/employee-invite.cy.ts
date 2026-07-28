// 008 — the single-page Invite Employee wizard (all 4 sections editable at
// once, one "Send Invite" submit running 5 sequential API calls). A
// freshly-registered org has the two seeded Roles but zero Departments/
// Grades, so this spec creates one of each via direct API calls first —
// same "call the real endpoint, don't fake it" posture cy.apiRegisterOrganization
// already follows (see cypress/support/commands.ts).
describe("008 - Employee Invitation", () => {
  let ownerEmail: string;
  let ownerPassword: string;
  let departmentName: string;
  let gradeName: string;

  before(() => {
    const unique = `${Date.now()}`;
    departmentName = `Cypress Dept ${unique}`;
    gradeName = `Cypress Grade ${unique}`;

    cy.apiRegisterOrganization().then((org) => {
      ownerEmail = org.ownerEmail;
      ownerPassword = org.ownerPassword;
      cy.request("POST", `${Cypress.env("gatewayUrl")}/departments`, { name: departmentName });
      cy.request("POST", `${Cypress.env("gatewayUrl")}/grades`, { name: gradeName });
    });
  });

  beforeEach(() => {
    cy.loginAs(ownerEmail, ownerPassword);
  });

  function fillMinimalInviteForm(email: string, contactNumber: string): void {
    cy.selectMuiOption("Title", "Mr");
    cy.findByLabelText("First Name").type("Invitee");
    cy.findByLabelText("Last Name").type("One");
    cy.findByLabelText("Email").type(email);
    cy.findByLabelText("Contact Number").type(contactNumber);
    cy.selectMuiOption("Gender", "Male");

    cy.selectMuiOption("Role", "Members");
    cy.selectMuiOption("Department", departmentName);
    cy.selectMuiOption("Grade", gradeName);

    cy.selectMuiOption("Level 1 Approver", new RegExp(`Cypress Owner \\(${ownerEmail}\\)`));
  }

  it("sends a real invite through the full wizard and it shows up as Pending in the listing", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const email = `cypress-invitee-${unique}@example.com`;
    const contactNumber = `7${unique.slice(-9)}`;

    cy.visit("/company-settings/employees/invite");
    fillMinimalInviteForm(email, contactNumber);
    cy.findByRole("button", { name: /send invite/i }).click();

    cy.location("pathname", { timeout: 15000 }).should("eq", "/company-settings/employees");

    cy.findByRole("button", { name: /show filters/i }).click();
    // The Email filter input has no accessible label (only a shared,
    // non-unique placeholder="Search" across every filter column) — a real
    // a11y gap, worked around here by the filter row's known column order
    // (Employee Name, Email, ..., see employees/page.tsx's SORTABLE_COLUMNS).
    cy.get("thead tr").eq(1).find("th").eq(1).find("input").type(email);
    // Plain jQuery-style .find(), not nested testing-library queries inside
    // .within() — chaining two find-by-role/text calls against the same
    // .within() scope here intermittently throws "container...undefined",
    // seemingly a stale-reference quirk once the row re-renders.
    cy.contains("tbody tr", email).as("employeeRow");
    // The table cell renders just "Pending" — "Pending Invitation" is only
    // the filter dropdown's option label for the same status.
    cy.get("@employeeRow").should("contain.text", "Pending");
    cy.get("@employeeRow").find("button").contains(/resend invite/i).scrollIntoView().should("be.visible");
  });

  it("rejects an email that's already in use with an inline error, not a silent redirect", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const duplicateEmail = `cypress-dup-${unique}@example.com`;

    // First invite establishes the email.
    cy.visit("/company-settings/employees/invite");
    fillMinimalInviteForm(duplicateEmail, `6${unique.slice(-9)}`);
    cy.findByRole("button", { name: /send invite/i }).click();
    cy.location("pathname", { timeout: 15000 }).should("eq", "/company-settings/employees");

    // Second invite reuses the same email.
    cy.visit("/company-settings/employees/invite");
    fillMinimalInviteForm(duplicateEmail, `5${unique.slice(-9)}`);
    cy.findByRole("button", { name: /send invite/i }).click();

    cy.findByText("This email is already in use.").scrollIntoView().should("be.visible");
    cy.location("pathname").should("eq", "/company-settings/employees/invite");
  });
});
