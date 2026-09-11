// 014 — My Categories is a card grid, not a table — each CategoryCard's
// Duplicate/Edit/Delete/Enable-Disable controls carry `data-stop-card-navigation`
// so clicking them doesn't also trigger the card's own "navigate to Category
// Details" click handler. Enable AND Disable both confirm via dialog here
// (a deliberate departure from Employee Listing's asymmetric instant-Activate,
// per this component's own code comment) — Delete only ever renders for a
// draft category.
describe("014 - My Categories Listing", () => {
  let ownerEmail: string;
  let ownerPassword: string;

  before(() => {
    cy.apiRegisterOrganization().then((org) => {
      ownerEmail = org.ownerEmail;
      ownerPassword = org.ownerPassword;
    });
  });

  it("shows the empty state with a Create Category button for a freshly-registered org", () => {
    cy.apiRegisterOrganization().then((org) => {
      cy.loginAs(org.ownerEmail, org.ownerPassword);
      cy.visit("/company-settings/categories");
      cy.findByText("No categories yet.").should("be.visible");
      // Rendered as `Button component={Link}` — a real <a>, so its role is
      // "link", not "button". Two exist while empty (top-right + the
      // empty-state's own), findAllBy avoids a false ambiguity failure.
      cy.findAllByRole("link", { name: /create category/i }).should("have.length", 2);
    });
  });

  it("renders an active category's card: no Delete action, Disable available", () => {
    cy.loginAs(ownerEmail, ownerPassword);
    cy.apiCreateCategory().then((category) => {
      cy.visit("/company-settings/categories");
      cy.contains(".MuiPaper-root", category.name).within(() => {
        cy.findByText("Draft").should("not.exist");
        cy.findByRole("button", { name: `Delete ${category.name}` }).should("not.exist");
      });
      cy.get(`[aria-label="Disable ${category.name}"]`).should("exist");
    });
  });

  it("renders a draft category's card: Draft badge, Delete available, toggle disabled", () => {
    cy.loginAs(ownerEmail, ownerPassword);
    cy.apiCreateCategory({ activate: false }).then((category) => {
      cy.visit("/company-settings/categories");
      cy.contains(".MuiPaper-root", category.name).should("contain.text", "Draft");
      cy.findByRole("button", { name: `Delete ${category.name}` }).should("be.visible");
      // isEnabled defaults to true even for a draft (claim-service's own
      // model default) — the Switch's aria-label reflects that (still
      // "Disable", not "Enable") even though it renders visually
      // unchecked+disabled while draft.
      cy.get(`[aria-label="Disable ${category.name}"] input`).should("be.disabled");
    });
  });

  it("Enable/Disable both open a confirmation dialog", () => {
    cy.loginAs(ownerEmail, ownerPassword);
    cy.apiCreateCategory().then((category) => {
      cy.visit("/company-settings/categories");

      cy.get(`[aria-label="Disable ${category.name}"]`).click();
      cy.findByRole("heading", { name: "Disable Category?" }).should("be.visible");
      cy.findByRole("button", { name: /yes, disable/i }).click();
      cy.get(`[aria-label="Enable ${category.name}"]`).should("exist");

      cy.get(`[aria-label="Enable ${category.name}"]`).click();
      cy.findByRole("heading", { name: "Enable Category?" }).should("be.visible");
      cy.findByRole("button", { name: /yes, enable/i }).click();
      cy.get(`[aria-label="Disable ${category.name}"]`).should("exist");
    });
  });

  it("Delete requires confirmation and only ever applies to a draft category", () => {
    cy.loginAs(ownerEmail, ownerPassword);
    cy.apiCreateCategory({ activate: false }).then((category) => {
      cy.visit("/company-settings/categories");

      cy.findByRole("button", { name: `Delete ${category.name}` }).click();
      // The dialog uses curly quotes (&ldquo;/&rdquo;), not straight ones.
      cy.findByText(`Are you sure you want to delete “${category.name}”? This action cannot be undone.`).should(
        "be.visible"
      );
      cy.findByRole("button", { name: /yes, delete/i }).click();
      cy.contains(".MuiPaper-root", category.name).should("not.exist");
    });
  });

  it("clicking the card body (not an action button) navigates to Category Details", () => {
    cy.loginAs(ownerEmail, ownerPassword);
    cy.apiCreateCategory().then((category) => {
      cy.visit("/company-settings/categories");
      cy.contains(".MuiPaper-root", category.name).click();
      cy.location("pathname").should("eq", `/company-settings/categories/${category.categoryId}`);
    });
  });
});
