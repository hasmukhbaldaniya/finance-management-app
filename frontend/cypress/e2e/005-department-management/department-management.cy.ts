// 005 — Department Management is a byte-for-byte mechanical copy of Grade
// Management (004) with the noun swapped (confirmed by diffing the two
// page/dialog implementations) — this spec mirrors grade-management.cy.ts
// exactly for the same reason. See that file's own header comment for the
// shared a11y notes (Members-count cell, MUI Switch aria-label placement).
describe("005 - Department Management", () => {
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
    cy.visit("/company-settings/departments");
  });

  it("shows the empty state for a freshly-registered org", () => {
    cy.apiRegisterOrganization().then((org) => {
      cy.loginAs(org.ownerEmail, org.ownerPassword);
      cy.visit("/company-settings/departments");
      cy.findByText("No departments found.").should("be.visible");
    });
  });

  it("creates a department, rejects a duplicate name, edits it, then deletes it (0 members)", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const name = `Cypress Dept ${unique}`;
    const renamed = `${name} Renamed`;

    cy.findByRole("button", { name: "New Department" }).click();
    cy.findByRole("heading", { name: "New Department" }).should("be.visible");
    cy.findByLabelText("Department Name").type(name);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");
    cy.contains("td", name).should("be.visible");

    // Duplicate name — rejected inline, dialog stays open.
    cy.findByRole("button", { name: "New Department" }).click();
    cy.findByLabelText("Department Name").type(name);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByText("A department with this name already exists.").should("be.visible");
    cy.findByRole("button", { name: "Cancel" }).click();
    // Wait for the exit animation to finish before opening the next dialog
    // — otherwise it can intermittently race MUI's ~225ms close transition.
    cy.findByRole("dialog").should("not.exist");

    // Edit — pre-filled, rename.
    cy.findByRole("button", { name: `Edit ${name}` }).click();
    cy.findByRole("heading", { name: "Edit Department" }).should("be.visible");
    cy.findByLabelText("Department Name").should("have.value", name).clear().type(renamed);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");
    cy.contains("td", renamed).should("be.visible");
    // Exact match, not substring — `renamed` contains `name` as a prefix.
    cy.contains("td", new RegExp(`^${name}$`)).should("not.exist");

    // Delete — allowed at 0 members, two-step confirm inside the same dialog.
    cy.findByRole("button", { name: `Edit ${renamed}` }).click();
    cy.findByText("Delete this department").scrollIntoView().should("be.visible");
    cy.findByRole("button", { name: /^delete$/i }).click();
    cy.findByText("Are you sure you want to delete this department? This cannot be undone.").should("be.visible");
    cy.findByRole("button", { name: /^delete$/i }).click();
    cy.findByRole("dialog").should("not.exist");
    cy.contains("td", renamed).should("not.exist");
  });

  it("Disable/Enable both open a confirmation dialog (unlike Employee Listing's asymmetric toggle)", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const name = `Cypress Dept ${unique}`;

    cy.findByRole("button", { name: "New Department" }).click();
    cy.findByLabelText("Department Name").type(name);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");

    cy.get(`[aria-label="Disable ${name}"]`).click();
    cy.findByRole("heading", { name: "Disable this department?" }).should("be.visible");
    cy.findByRole("button", { name: /^disable$/i }).click();
    cy.get(`[aria-label="Enable ${name}"]`).should("exist");

    cy.get(`[aria-label="Enable ${name}"]`).click();
    cy.findByRole("heading", { name: "Enable this department?" }).should("be.visible");
    cy.findByRole("button", { name: /^enable$/i }).click();
    cy.get(`[aria-label="Disable ${name}"]`).should("exist");
  });

  it("the Members count is only clickable once an employee is actually assigned to it", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const name = `Cypress Dept ${unique}`;

    cy.findByRole("button", { name: "New Department" }).click();
    cy.findByLabelText("Department Name").type(name);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");

    cy.contains("tr", name).find("td").eq(1).find("button").should("have.text", "0").click({ force: true });
    cy.findByRole("dialog").should("not.exist");

    cy.request({ url: `${Cypress.env("gatewayUrl")}/departments`, qs: { search: name } }).then(({ body }) => {
      const departmentId = (body as { departments: { id: number; name: string }[] }).departments.find(
        (d) => d.name === name
      )!.id;

      cy.apiInviteAndOnboardEmployee({ departmentId }).then(() => {
        cy.loginAs(ownerEmail, ownerPassword);
        cy.visit("/company-settings/departments");

        cy.contains("tr", name).find("td").eq(1).find("button").should("have.text", "1").click();
        cy.findByRole("heading", { name: `Members — ${name}` }).should("be.visible");
        cy.findByText("Cypress Employee").should("be.visible");
      });
    });
  });
});
