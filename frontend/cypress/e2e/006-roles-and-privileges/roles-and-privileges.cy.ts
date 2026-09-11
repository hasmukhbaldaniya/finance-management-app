// 006 — every freshly-registered org already has two seeded, isDefault
// roles (Company Admin: all 8 privileges; Members: a fixed 4-privilege
// subset — auth-service/src/utils/constants/role.constant.ts's
// PRIVILEGE_KEYS/MEMBERS_ROLE_PRIVILEGES) that can never be deleted, only
// viewed (a disabled Switch + a read-only View dialog instead of Edit).
// Custom roles reuse the exact same form/status/delete-confirm shape as
// Grade/Department (004/005) — see that pair's own header comments for the
// shared a11y notes this spec reuses (MUI Switch aria-label placement).
const ALL_PRIVILEGES = [
  "Employee management",
  "Basic Features",
  "Category Management",
  "Create Claim / Trips",
  "Claim / Trip Approvals",
  "Reports",
  "Finance View",
  "Consumption & Billing",
];
const MEMBERS_DEFAULT_PRIVILEGES = ["Employee management", "Basic Features", "Category Management", "Create Claim / Trips"];

describe("006 - Roles & Privileges Management", () => {
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
    cy.visit("/company-settings/roles-privileges");
  });

  it("lists the two seeded default roles as Default, not deletable, and view-only", () => {
    // Scope to "td" (data cells), not "tr" — the header row is a <tr> too,
    // and matching against the bare row tag risks resolving to it during
    // the brief window before the roles list finishes its first load.
    cy.contains("td", "Company Admin").closest("tr").should("contain.text", "Default");
    cy.contains("td", "Members").closest("tr").should("contain.text", "Default");

    // Default roles get a View action (eye icon), not an Edit pencil.
    cy.findByRole("button", { name: "View Company Admin" }).should("exist");
    cy.findByRole("button", { name: "Edit Company Admin" }).should("not.exist");

    // Their status Switch is genuinely disabled, not just a no-op handler.
    cy.get('[aria-label="Disable Company Admin"] input').should("be.disabled");
  });

  it("Company Admin's View dialog shows all 8 privileges checked, read-only", () => {
    cy.findByRole("button", { name: "View Company Admin" }).click();
    cy.findByRole("heading", { name: "Company Admin" }).should("be.visible");
    cy.findByLabelText("Role Name").should("have.value", "Company Admin").and("be.disabled");
    ALL_PRIVILEGES.forEach((label) => {
      cy.findByLabelText(label).should("be.checked").and("be.disabled");
    });
  });

  it("Members' View dialog shows only its fixed 4-privilege subset checked", () => {
    cy.findByRole("button", { name: "View Members" }).click();
    cy.findByRole("heading", { name: "Members" }).should("be.visible");
    MEMBERS_DEFAULT_PRIVILEGES.forEach((label) => {
      cy.findByLabelText(label).should("be.checked");
    });
    ALL_PRIVILEGES.filter((label) => !MEMBERS_DEFAULT_PRIVILEGES.includes(label)).forEach((label) => {
      cy.findByLabelText(label).should("not.be.checked");
    });
  });

  it("creates a custom role with a privilege subset, rejects a duplicate name, edits it, then deletes it (0 members)", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const name = `Cypress Role ${unique}`;
    const renamed = `${name} Renamed`;

    cy.findByRole("button", { name: "New Role" }).click();
    cy.findByRole("heading", { name: "New Role" }).should("be.visible");
    cy.findByLabelText("Role Name").type(name);
    cy.findByLabelText("Reports").click();
    cy.findByLabelText("Finance View").click();
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");
    cy.contains("tr", name).should("contain.text", "Custom");

    // Duplicate name — rejected inline, dialog stays open.
    cy.findByRole("button", { name: "New Role" }).click();
    cy.findByLabelText("Role Name").type(name);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByText("A role with this name already exists.").should("be.visible");
    cy.findByRole("button", { name: "Cancel" }).click();
    // Wait for the dialog's own exit animation to actually finish before
    // opening the next one — opening Edit immediately after can race MUI's
    // ~225ms close transition and intermittently cover the new dialog's
    // content.
    cy.findByRole("dialog").should("not.exist");

    // Edit — pre-filled name + the two privileges chosen above, rename and
    // toggle one privilege off.
    cy.findByRole("button", { name: `Edit ${name}` }).click();
    cy.findByRole("heading", { name: "Edit Role" }).should("be.visible");
    cy.findByLabelText("Role Name").should("have.value", name).clear().type(renamed);
    cy.findByLabelText("Reports").should("be.checked");
    cy.findByLabelText("Finance View").should("be.checked").click();
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");
    cy.contains("tr", renamed).should("be.visible");
    cy.contains("tr", new RegExp(`^${name}$`)).should("not.exist");

    cy.findByRole("button", { name: `Edit ${renamed}` }).click();
    cy.findByRole("heading", { name: "Edit Role" }).should("be.visible");
    cy.findByLabelText("Reports").should("be.checked");
    cy.findByLabelText("Finance View").should("not.be.checked");

    // Delete — allowed at 0 members, two-step confirm inside the same
    // dialog. This dialog is taller than Grade/Department's (8 privilege
    // checkboxes), so the delete panel sits further down and needs an
    // explicit scroll — same "covered by a fixed-position container"
    // signature seen on Employee Listing/Invite's own buttons.
    cy.findByText("Delete this role").scrollIntoView().should("be.visible");
    cy.findByRole("button", { name: /^delete$/i }).click();
    cy.findByText("Are you sure you want to delete this role? This cannot be undone.").should("be.visible");
    cy.findByRole("button", { name: /^delete$/i }).click();
    cy.findByRole("dialog").should("not.exist");
    cy.contains("tr", renamed).should("not.exist");
  });

  it("Disable/Enable a custom role both open a confirmation dialog", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const name = `Cypress Role ${unique}`;

    cy.findByRole("button", { name: "New Role" }).click();
    cy.findByLabelText("Role Name").type(name);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");

    cy.get(`[aria-label="Disable ${name}"]`).click();
    cy.findByRole("heading", { name: "Disable this role?" }).should("be.visible");
    cy.findByRole("button", { name: /^disable$/i }).click();
    cy.get(`[aria-label="Enable ${name}"]`).should("exist");

    cy.get(`[aria-label="Enable ${name}"]`).click();
    cy.findByRole("heading", { name: "Enable this role?" }).should("be.visible");
    cy.findByRole("button", { name: /^enable$/i }).click();
    cy.get(`[aria-label="Disable ${name}"]`).should("exist");
  });
});
