// 010 — CSV upload → validate → confirm. A plain CSV string works (parsing
// is csv-parse/sync for .csv files, see auth-service's employee-bulk-file.ts)
// — no XLSX binary needed. Column headers/order are BULK_COLUMNS in
// auth-service/src/utils/constants/bulk-invite.constant.ts; "Company" must
// match the calling org's name exactly, "Role"/"Department"/"Grade" must
// already exist by exact name.
function summaryStat(label: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.contains(".MuiPaper-root", label).find(".MuiTypography-h6");
}

describe("010 - Bulk Invite Employees", () => {
  let ownerEmail: string;
  let ownerPassword: string;
  let organizationName: string;
  let departmentName: string;
  let gradeName: string;

  before(() => {
    const unique = `${Date.now()}`;
    departmentName = `Cypress Dept ${unique}`;
    gradeName = `Cypress Grade ${unique}`;

    cy.apiRegisterOrganization().then((org) => {
      ownerEmail = org.ownerEmail;
      ownerPassword = org.ownerPassword;
      organizationName = org.organizationName;
      cy.request("POST", `${Cypress.env("gatewayUrl")}/departments`, { name: departmentName });
      cy.request("POST", `${Cypress.env("gatewayUrl")}/grades`, { name: gradeName });
    });
  });

  beforeEach(() => {
    cy.loginAs(ownerEmail, ownerPassword);
    cy.visit("/company-settings/employees/bulk-invite");
  });

  it("uploads a valid CSV row, shows the success summary, and Invite persists it as Pending", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const email = `cypress-bulk-${unique}@example.com`;
    const contactNumber = `7${unique.slice(-9)}`;
    const csv = [
      "Title,First Name,Last Name,Email,Country Code,Contact Number,DOB,Gender,Employee ID,Company,Role,Department,Grade,Projects",
      `Mr,Bulk,Employee,${email},+91,${contactNumber},,Male,,${organizationName},Company Admin,${departmentName},${gradeName},`,
    ].join("\n");

    cy.findByLabelText("Upload File").selectFile(
      { contents: Cypress.Buffer.from(csv), fileName: "bulk-invite.csv", mimeType: "text/csv" },
      { force: true }
    );

    summaryStat("Total Records").should("have.text", "1");
    summaryStat("Success").should("have.text", "1");
    summaryStat("Failed").should("have.text", "0");
    summaryStat("New Employees").should("have.text", "1");
    summaryStat("Updated").should("have.text", "0");

    cy.findByRole("button", { name: /^invite$/i }).should("be.enabled").click();
    cy.location("pathname", { timeout: 15000 }).should("eq", "/company-settings/employees");

    cy.findByRole("button", { name: /show filters/i }).click();
    cy.get("thead tr").eq(1).find("th").eq(1).find("input").type(email);
    cy.contains("tbody tr", email).should("contain.text", "Pending");
  });

  it("surfaces a row-level failure and offers an error report, without blocking the whole file", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const goodEmail = `cypress-bulk-ok-${unique}@example.com`;
    const csv = [
      "Title,First Name,Last Name,Email,Country Code,Contact Number,DOB,Gender,Employee ID,Company,Role,Department,Grade,Projects",
      `Mr,Bulk,Good,${goodEmail},+91,${`7${unique.slice(-9)}`},,Male,,${organizationName},Company Admin,${departmentName},${gradeName},`,
      // Invalid: not-a-real-email plus a Role that doesn't exist in this org.
      `Mr,Bulk,Bad,not-an-email,+91,${`6${unique.slice(-9)}`},,Male,,${organizationName},Nonexistent Role,${departmentName},${gradeName},`,
    ].join("\n");

    cy.findByLabelText("Upload File").selectFile(
      { contents: Cypress.Buffer.from(csv), fileName: "bulk-invite-mixed.csv", mimeType: "text/csv" },
      { force: true }
    );

    summaryStat("Total Records").should("have.text", "2");
    summaryStat("Success").should("have.text", "1");
    summaryStat("Failed").should("have.text", "1");
    cy.findByRole("button", { name: /download error report/i }).should("be.visible");
  });
});
