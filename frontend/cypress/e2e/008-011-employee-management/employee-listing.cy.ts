// 009 — search/filter/sort/suspend-activate on the main Employee listing.
// The Employee Status filter (SelectField) and the per-column filter Inputs
// have no accessible label/name at all (see cypress/support/commands.ts's
// selectMuiOption comment for the same gap on labeled SelectFields — this
// one isn't even labeled) — targeted by the filter row's known column order
// instead: Employee Name(0), Email(1), Role(2, empty), Department(3, empty),
// Grade(4, empty), Contact Number(5), Invitation Status(6, empty),
// Employee Status(7, select), Actions(8, empty) — see SORTABLE_COLUMNS in
// employees/page.tsx.
describe("009 - Employee Listing", () => {
  let ownerEmail: string;
  let ownerPassword: string;
  let activeEmployeeEmail: string;
  let pendingEmployeeEmail: string;

  before(() => {
    cy.apiRegisterOrganization().then((org) => {
      ownerEmail = org.ownerEmail;
      ownerPassword = org.ownerPassword;
    });
    cy.apiInviteAndOnboardEmployee().then((employee) => {
      activeEmployeeEmail = employee.email;
    });
    cy.apiInviteAndOnboardEmployee({ onboard: false }).then((employee) => {
      pendingEmployeeEmail = employee.email;
    });
  });

  beforeEach(() => {
    cy.loginAs(ownerEmail, ownerPassword);
    cy.visit("/company-settings/employees");
    cy.findByRole("button", { name: /show filters/i }).click();
  });

  it("never lists the logged-in caller's own row", () => {
    cy.get("thead tr").eq(1).find("th").eq(1).find("input").type(ownerEmail);
    cy.contains("tbody tr", ownerEmail).should("not.exist");
    cy.findByText("No Employees Found").should("be.visible");
  });

  it("filters by Employee Status", () => {
    cy.get("thead tr").eq(1).find("th").eq(7).find('[role="combobox"]').click();
    cy.findByRole("option", { name: "Active" }).click();
    cy.contains("tbody tr", activeEmployeeEmail).should("exist");
    cy.contains("tbody tr", pendingEmployeeEmail).should("not.exist");

    cy.get("thead tr").eq(1).find("th").eq(7).find('[role="combobox"]').click();
    cy.findByRole("option", { name: "Pending Invitation" }).click();
    cy.contains("tbody tr", pendingEmployeeEmail).should("exist");
    cy.contains("tbody tr", activeEmployeeEmail).should("not.exist");
  });

  it("Suspend confirms first, Activate applies immediately — the documented asymmetry", () => {
    cy.get("thead tr").eq(1).find("th").eq(1).find("input").type(activeEmployeeEmail);
    cy.contains("tbody tr", activeEmployeeEmail).as("row");
    cy.get("@row").find('[aria-label="Suspend"]').scrollIntoView().click();

    cy.findByRole("heading", { name: "Suspend Employee?" }).should("be.visible");
    cy.findByRole("button", { name: "Suspend" }).click();
    cy.get("@row").should("contain.text", "Suspended");
    cy.get("@row").find('[aria-label="Activate"]').should("exist");

    // Activate: no confirmation dialog at all.
    cy.get("@row").find('[aria-label="Activate"]').click();
    cy.get("@row").should("contain.text", "Active");
    cy.findByRole("heading", { name: "Suspend Employee?" }).should("not.exist");
  });

  it("Edit opens the pre-filled edit page for that employee", () => {
    cy.get("thead tr").eq(1).find("th").eq(1).find("input").type(activeEmployeeEmail);
    cy.contains("tbody tr", activeEmployeeEmail)
      .find("a[aria-label^='Edit ']")
      .then((link) => {
        const href = link.attr("href") as string;
        cy.wrap(link).click();
        cy.location("pathname").should("eq", href);
      });
    cy.findByLabelText("First Name").should("have.value", "Cypress");
    // .should("exist"), not "be.visible" — the Zoho SalesIQ chat bubble
    // (fixed, bottom-right) can overlap this button, unrelated to the page
    // itself having loaded correctly.
    cy.findByRole("button", { name: /save changes/i }).should("exist");
  });
});
