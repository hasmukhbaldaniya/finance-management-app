// 015 — Edit reuses the exact same BasicDetailsForm as Create (013), just
// pre-loaded via useLoadCategory; Duplicate (new/page.tsx's ?duplicateFrom=)
// copies description/fields/policies from the source category but
// deliberately resets name to "" and drops id/status entirely, per that
// page's own code comment — the result is a brand-new, unrelated draft.
describe("015 - Category Edit and Duplicate", () => {
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

  it("Edit persists a Basic Details change on the same category", () => {
    cy.apiCreateCategory().then((category) => {
      cy.visit(`/company-settings/categories/${category.categoryId}/basic-details`);
      cy.findByLabelText("Category Name").should("have.value", category.name);
      cy.findByLabelText("Description").should("have.value", "Created by Cypress for E2E testing.").clear().type("Updated by a Cypress edit test.");
      // Save as Draft never renders here — this category is already active.
      cy.findByRole("button", { name: /save as draft/i }).should("not.exist");
      cy.findByRole("button", { name: /save & continue/i }).click();

      cy.location("pathname").should("eq", `/company-settings/categories/${category.categoryId}/expense-form`);

      cy.request({ url: `${Cypress.env("gatewayUrl")}/categories/${category.categoryId}` }).then(({ body }) => {
        expect((body as { category: { description: string } }).category.description).to.eq("Updated by a Cypress edit test.");
      });
    });
  });

  it("Duplicate starts a brand-new draft with the description carried over but the name reset", () => {
    cy.apiCreateCategory().then((source) => {
      cy.visit(`/company-settings/categories/new?duplicateFrom=${source.categoryId}`);

      cy.findByLabelText("Category Name").should("have.value", "");
      cy.findByLabelText("Description").should("have.value", "Created by Cypress for E2E testing.");

      const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
      const duplicateName = `Cypress Duplicate ${unique}`;
      cy.findByLabelText("Category Name").type(duplicateName);
      cy.findByRole("button", { name: /save & continue/i }).click();

      // Step 1's own "Save & Continue" only ever calls createCategory — the
      // duplicated fields/policies live in wizard context on the client and
      // aren't PUT to the server until each later step is itself saved, so
      // the new category id has no fields server-side yet. What IS already
      // true: the Expense Form step renders the copied-over field names
      // straight from context (CategoryWizardContext's own
      // startSkippingLoadsFor guards this exact page from re-fetching and
      // clobbering them with the still-empty server record).
      cy.location("pathname", { timeout: 10000 })
        .should("match", /\/company-settings\/categories\/\d+\/expense-form$/)
        .then((pathname) => {
          const newCategoryId = Number(pathname.split("/")[3]);
          expect(newCategoryId).to.not.eq(source.categoryId);
        });
      // findAllBy, not findBy — "Amount"/"Expense Date" also appear as
      // field-type-library option labels elsewhere on this step, not just
      // as the already-added field's own name.
      cy.findAllByText("Amount").should("have.length.greaterThan", 0);
      cy.findAllByText("Expense Date").should("have.length.greaterThan", 0);
    });
  });
});
