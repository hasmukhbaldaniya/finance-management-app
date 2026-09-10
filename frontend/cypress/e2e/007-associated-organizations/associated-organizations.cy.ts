// 007 — Associated Organizations is genuinely unseedable for a Cypress-created
// org: auth-service's associated-organization.routes.ts exposes only GET / and
// PATCH /:id/status (confirmed by reading the routes file directly) — there is
// no create/invite endpoint anywhere, no controller/registration/seeder ever
// inserts an AssociatedOrganization row, matching 007's own Out of Scope note.
// A raw SQL insert to populate one would be exactly the fixture-drift
// anti-pattern this whole test plan avoids elsewhere (see the plan doc's
// "Test data strategy").
//
// That statically limits what's reachable here even further than expected:
// page.tsx's `rows.length === 0 ? <EmptyText/> : <Table>...</Table>` swaps
// out the ENTIRE table (headers, sort labels, and the filter row) rather
// than rendering an empty-results row inside a table shell that's always
// present — the exact same pre-existing, documented, deliberately-not-fixed
// bug frontend/CLAUDE.md already flags for this page ("this page has this
// exact same latent bug ... not fixed, since it wasn't asked for"). Net
// effect: for a freshly-registered org, the sortable-column headers and the
// per-column filter inputs literally never render at all — there is no way
// to test them here without either fixing that bug (out of scope for adding
// tests) or working around the missing seed data (the anti-pattern above).
// This spec is scoped to exactly what's left: the empty state itself, and
// the filter toggle button's own state (which sits outside that
// conditional, so it still flips correctly even though nothing appears).
// Owner-only nav visibility + the 403 for a non-owner are already covered
// by header-navigation.cy.ts — not duplicated here.
describe("007 - Associated Organizations Network", () => {
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
    cy.visit("/company-settings/associated-organizations");
  });

  it("renders the empty state for a freshly-registered org, with no crash or infinite loading", () => {
    cy.findByRole("heading", { name: "Associated Organizations" }).should("be.visible");
    cy.findByText("No associated organizations found.").should("be.visible");
  });

  it("the filter toggle button flips state even though there's no data for a filter row to appear over", () => {
    cy.findByRole("button", { name: "Show filters" }).click();
    cy.findByRole("button", { name: "Close filters" }).should("be.visible");
    // No table/filter row exists to assert on — see this file's own header
    // comment for why (rows.length === 0 skips the whole <Table>, headers
    // included, a pre-existing bug this spec works around by not asserting
    // past this point).
    cy.findByRole("button", { name: "Close filters" }).click();
    cy.findByRole("button", { name: "Show filters" }).should("be.visible");
  });
});
