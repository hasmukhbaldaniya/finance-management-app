// 004 — Grade Management is the reference implementation every other
// org-scoped CRUD screen (Department, Roles & Privileges) copies almost
// verbatim (see frontend/CLAUDE.md). Search input and the Members-count
// cell have no accessible label — the count cell's visible text (the
// number itself) IS its accessible name though, since it's a bare
// `<button>{count}</button>` with no aria-label, so findByRole(button,
// {name}) still works for it.
describe("004 - Grade Management", () => {
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
    cy.visit("/company-settings/grades");
  });

  it("shows the empty state for a freshly-registered org", () => {
    cy.apiRegisterOrganization().then((org) => {
      cy.loginAs(org.ownerEmail, org.ownerPassword);
      cy.visit("/company-settings/grades");
      cy.findByText("No grades found.").should("be.visible");
    });
  });

  it("creates a grade, rejects a duplicate name, edits it, then deletes it (0 members)", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const name = `Cypress Grade ${unique}`;
    const renamed = `${name} Renamed`;

    cy.findByRole("button", { name: "New Grade" }).click();
    cy.findByRole("heading", { name: "New Grade" }).should("be.visible");
    cy.findByLabelText("Grade Name").type(name);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");
    cy.contains("td", name).should("be.visible");

    // Duplicate name — rejected inline, dialog stays open.
    cy.findByRole("button", { name: "New Grade" }).click();
    cy.findByLabelText("Grade Name").type(name);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByText("A grade with this name already exists.").should("be.visible");
    cy.findByRole("button", { name: "Cancel" }).click();
    // Wait for the exit animation to finish before opening the next dialog
    // — otherwise it can intermittently race MUI's ~225ms close transition.
    cy.findByRole("dialog").should("not.exist");

    // Edit — pre-filled, rename.
    cy.findByRole("button", { name: `Edit ${name}` }).click();
    cy.findByRole("heading", { name: "Edit Grade" }).should("be.visible");
    cy.findByLabelText("Grade Name").should("have.value", name).clear().type(renamed);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");
    cy.contains("td", renamed).should("be.visible");
    // Exact match, not substring — `renamed` contains `name` as a prefix.
    cy.contains("td", new RegExp(`^${name}$`)).should("not.exist");

    // Delete — allowed at 0 members, two-step confirm inside the same dialog.
    cy.findByRole("button", { name: `Edit ${renamed}` }).click();
    cy.findByText("Delete this grade").scrollIntoView().should("be.visible");
    cy.findByRole("button", { name: /^delete$/i }).click();
    cy.findByText("Are you sure you want to delete this grade? This cannot be undone.").should("be.visible");
    cy.findByRole("button", { name: /^delete$/i }).click();
    cy.findByRole("dialog").should("not.exist");
    cy.contains("td", renamed).should("not.exist");
  });

  it("Disable/Enable both open a confirmation dialog (unlike Employee Listing's asymmetric toggle)", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const name = `Cypress Grade ${unique}`;

    cy.findByRole("button", { name: "New Grade" }).click();
    cy.findByLabelText("Grade Name").type(name);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");

    // MUI's Switch puts a passed aria-label on the wrapping span, not the
    // inner role="switch" input (see cypress/support/commands.ts's
    // selectMuiOption comment for the same family of gap) — target it via
    // the attribute selector directly, not findByRole("switch", {name}).
    cy.get(`[aria-label="Disable ${name}"]`).click();
    cy.findByRole("heading", { name: "Disable this grade?" }).should("be.visible");
    cy.findByRole("button", { name: /^disable$/i }).click();
    cy.get(`[aria-label="Enable ${name}"]`).should("exist");

    cy.get(`[aria-label="Enable ${name}"]`).click();
    cy.findByRole("heading", { name: "Enable this grade?" }).should("be.visible");
    cy.findByRole("button", { name: /^enable$/i }).click();
    cy.get(`[aria-label="Disable ${name}"]`).should("exist");
  });

  it("the Members count is only clickable once an employee is actually assigned to it", () => {
    cy.findByRole("button", { name: "New Grade" }).click();
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const name = `Cypress Grade ${unique}`;
    cy.findByLabelText("Grade Name").type(name);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");

    // 0 members: the count cell renders plain, non-interactive text — no
    // dialog opens even if clicked.
    cy.contains("tr", name).find("td").eq(1).find("button").should("have.text", "0").click({ force: true });
    cy.findByRole("dialog").should("not.exist");

    // Look up this grade's real id (the grades list API), then assign a
    // real employee to it via cy.apiInviteAndOnboardEmployee — the Members
    // dialog only has anything to show once that's true.
    cy.request({ url: `${Cypress.env("gatewayUrl")}/grades`, qs: { search: name } }).then(({ body }) => {
      const gradeId = (body as { grades: { id: number; name: string }[] }).grades.find((g) => g.name === name)!.id;

      cy.apiInviteAndOnboardEmployee({ gradeId }).then(() => {
        cy.loginAs(ownerEmail, ownerPassword);
        cy.visit("/company-settings/grades");

        cy.contains("tr", name).find("td").eq(1).find("button").should("have.text", "1").click();
        cy.findByRole("heading", { name: `Members — ${name}` }).should("be.visible");
        cy.findByText("Cypress Employee").should("be.visible");
      });
    });
  });
});
