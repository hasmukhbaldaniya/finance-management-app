// 013 — Category Management is this codebase's largest feature: a 4-step
// wizard (Basic Details -> Expense Form -> Policies -> Project Policies).
// Steps 2-4 involve substantially more UI surface (a field-type library,
// eligibility/rules/approval-flow editors) than a UI-driven test can cover
// economically — per Phase 4's own research, cy.apiCreateCategory() chains
// claim-service's real REST contract directly for those steps instead (the
// same "bypass the wizard UI, not the backend contract" posture
// cy.apiInviteAndOnboardEmployee already uses for Employee Onboarding).
// This spec covers what's left: Step 1 (Basic Details) driven for real
// through the browser, since it's this codebase's actual entry point and
// simple enough to exercise directly.
describe("013 - Category Creation (Step 1 - Basic Details)", () => {
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
    cy.visit("/company-settings/categories/new");
  });

  it("shows validation errors when submitted empty", () => {
    cy.findByRole("button", { name: /save & continue/i }).click();
    cy.findByText("Category Name is required.").should("be.visible");
    cy.findByText("Description is required.").should("be.visible");
    cy.location("pathname").should("eq", "/company-settings/categories/new");
  });

  it("creates a category and continues to the Expense Form step", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const name = `Cypress Category ${unique}`;

    cy.findByLabelText("Category Name").type(name);
    cy.findByLabelText("Description").type("A category created end-to-end by Cypress.");
    cy.findByRole("button", { name: /save & continue/i }).click();

    cy.location("pathname").should("match", /\/company-settings\/categories\/\d+\/expense-form$/);
  });

  it("rejects a name that's already in use by another category in the org", () => {
    cy.apiCreateCategory().then((existing) => {
      cy.loginAs(ownerEmail, ownerPassword);
      cy.visit("/company-settings/categories/new");
      cy.findByLabelText("Category Name").type(existing.name);
      cy.findByLabelText("Description").type("Trying to reuse an existing category name.");
      cy.findByRole("button", { name: /save & continue/i }).click();
      cy.findByText("A category with this name already exists.").should("be.visible");
      cy.location("pathname").should("eq", "/company-settings/categories/new");
    });
  });

  it("Save as Draft returns to the listing with a Draft badge, without requiring Step 2-4", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const name = `Cypress Draft Category ${unique}`;

    cy.findByLabelText("Category Name").type(name);
    cy.findByLabelText("Description").type("Saved as a draft from Step 1 only.");
    cy.findByRole("button", { name: /save as draft/i }).click();

    cy.location("pathname", { timeout: 10000 }).should("eq", "/company-settings/categories");
    cy.contains(".MuiPaper-root", name).should("contain.text", "Draft");
  });
});
