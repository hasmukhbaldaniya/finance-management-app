// header.tsx is the source of truth here, not user-stories/003-header-navigation.md —
// that doc still describes a "Switch Active Organization" screen and a
// "Reports" nav link, both removed/renamed since (see frontend/CLAUDE.md's
// SessionContext section and the Reports/Dashboard section).
const NAV_LINKS: Array<[string, string]> = [
  ["Dashboard", "/dashboard"],
  ["Trips", "/trips"],
  ["Claims", "/claims"],
  ["Approvals", "/approvals"],
  ["Finance", "/finance"],
  ["Company Settings", "/company-settings/employees"],
  ["Help", "/help"],
];

describe("003 - Header Navigation", () => {
  let ownerEmail: string;
  let ownerPassword: string;

  before(() => {
    cy.apiRegisterOrganization().then((org) => {
      ownerEmail = org.ownerEmail;
      ownerPassword = org.ownerPassword;
    });
  });

  beforeEach(() => {
    cy.loginAs(ownerEmail, ownerPassword);
  });

  it("renders every top-level nav link with the right destination", () => {
    cy.visit("/dashboard");
    NAV_LINKS.forEach(([name, href]) => {
      cy.findByRole("link", { name }).should("have.attr", "href", href);
    });
    cy.findByRole("link", { name: "Dashboard" }).should("have.attr", "aria-current", "page");
  });

  it("shows the Company Settings sub-header, with Associated Organizations for an owner", () => {
    cy.visit("/company-settings/employees");
    cy.findByRole("navigation", { name: "Company Settings" }).within(() => {
      cy.findByRole("link", { name: "Employee management" }).should("have.attr", "href", "/company-settings/employees");
      cy.findByRole("link", { name: "Categories management" }).should(
        "have.attr",
        "href",
        "/company-settings/categories"
      );
      cy.findByRole("link", { name: "Roles & privileges" }).should(
        "have.attr",
        "href",
        "/company-settings/roles-privileges"
      );
      cy.findByRole("link", { name: "Grades" }).should("have.attr", "href", "/company-settings/grades");
      cy.findByRole("link", { name: "Departments" }).should("have.attr", "href", "/company-settings/departments");
      cy.findByRole("link", { name: "Associated Organizations" }).should(
        "have.attr",
        "href",
        "/company-settings/associated-organizations"
      );
    });
  });

  it("opens the Profile dropdown with the logged-in identity, View Profile, and Logout", () => {
    cy.visit("/dashboard");
    // Matches both the trigger button and the dropdown's own identity block,
    // so assert on the org name instead — the button's own name already
    // proves "Cypress Owner" is showing.
    cy.findByRole("button", { name: new RegExp(`Cypress Owner`, "i") }).click();
    cy.findByText(/^Cypress Org /).should("be.visible");
    // MUI's MenuItem sets an explicit role="menuitem", overriding the
    // underlying <a>'s implicit "link" role — findByRole("link") never
    // matches it even though it renders as a real anchor (component={Link}).
    cy.findByRole("menuitem", { name: "View Profile" }).should("have.attr", "href", "/profile");
    cy.findByRole("menuitem", { name: "Logout" }).click();
    cy.location("pathname").should("eq", "/login");
    // Logout clears the session server-side too — a private route now bounces back to /login.
    cy.visit("/dashboard");
    cy.location("pathname").should("eq", "/login");
  });
});

describe("003 - Header Navigation - non-owner", () => {
  let ownerEmail: string;
  let ownerPassword: string;
  let employeeEmail: string;
  let employeePassword: string;

  before(() => {
    cy.apiRegisterOrganization().then((org) => {
      ownerEmail = org.ownerEmail;
      ownerPassword = org.ownerPassword;
      cy.apiInviteAndOnboardEmployee({ roleName: "Members" }).then((employee) => {
        employeeEmail = employee.email;
        employeePassword = employee.password;
      });
    });
  });

  it("hides Associated Organizations from the sub-header for a non-owner", () => {
    cy.loginAs(employeeEmail, employeePassword);
    cy.visit("/company-settings/employees");
    cy.findByRole("navigation", { name: "Company Settings" }).within(() => {
      cy.findByRole("link", { name: "Employee management" }).should("be.visible");
      cy.findByRole("link", { name: "Associated Organizations" }).should("not.exist");
    });
  });

  it("403s the Associated Organizations API for a non-owner regardless of the UI", () => {
    cy.loginAs(employeeEmail, employeePassword);
    cy.request({
      url: `${Cypress.env("gatewayUrl")}/associated-organizations`,
      failOnStatusCode: false,
    }).its("status").should("eq", 403);
  });

  it("still shows Associated Organizations for the owner of the same org", () => {
    cy.loginAs(ownerEmail, ownerPassword);
    cy.visit("/company-settings/employees");
    cy.findByRole("navigation", { name: "Company Settings" }).within(() => {
      cy.findByRole("link", { name: "Associated Organizations" }).should("be.visible");
    });
  });
});
