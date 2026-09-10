// 016 — Version History reuses the centered Dialog primitive (not a real
// slide-in drawer — a documented scope simplification) and reads its
// content from GET /categories/:id/versions, whose response shape forks
// entirely on `isDraft`. Category Details itself (the page every "View
// Details" link lands on) renders snapshot.name as its own h5 heading plus
// a "Basic Details" section — the deeper field/policy summary rendering
// wasn't independently re-verified beyond that during Phase 4 research, so
// this spec only asserts what's confirmed.
describe("016 - Category Version History", () => {
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

  it("a draft category shows Draft/Unsaved changes, no version list", () => {
    cy.apiCreateCategory({ activate: false }).then((category) => {
      cy.visit("/company-settings/categories");
      cy.findByRole("button", { name: `View version history for ${category.name}` }).click();

      cy.findByRole("heading", { name: `${category.name} Version History` }).should("be.visible");
      // "Draft" also matches the card's own status Chip behind the dialog —
      // scope to the dialog's aggregate text instead of a bare findByText.
      cy.findByRole("dialog").should("contain.text", "Draft").and("contain.text", "Unsaved draft changes");
      cy.findByRole("link", { name: "View Details" }).should("have.attr", "href", `/company-settings/categories/${category.categoryId}`);
      cy.findByText(/^Version \d/).should("not.exist");
    });
  });

  it("a freshly-activated category already has exactly one Version 1.0 entry", () => {
    cy.apiCreateCategory().then((category) => {
      cy.visit("/company-settings/categories");
      cy.findByRole("button", { name: `View version history for ${category.name}` }).click();

      cy.findByRole("heading", { name: `${category.name} Version History` }).should("be.visible");
      cy.findByText("Version 1.0").should("be.visible");
      cy.findByRole("link", { name: "View Details" }).should(
        "have.attr",
        "href",
        `/company-settings/categories/${category.categoryId}?version=1.0`
      );
    });
  });

  it("View Details opens the real Category Details page for that version", () => {
    cy.apiCreateCategory().then((category) => {
      cy.visit("/company-settings/categories");
      cy.findByRole("button", { name: `View version history for ${category.name}` }).click();
      cy.findByRole("link", { name: "View Details" }).click();

      cy.location("pathname").should("eq", `/company-settings/categories/${category.categoryId}`);
      cy.location("search").should("eq", "?version=1.0");
      cy.findByRole("heading", { name: category.name }).should("be.visible");
      cy.findByRole("heading", { name: "Basic Details" }).should("be.visible");
    });
  });
});
