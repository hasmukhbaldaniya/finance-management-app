// 012 — the logged-in employee's own self-service Profile screen, a
// separate epic from admin-managed Employee Management (008-011).
describe("012 - Employee Profile", () => {
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
    cy.visit("/profile");
  });

  it("renders the logged-in owner's own read-only details", () => {
    cy.findByText("My Profile").should("be.visible");
    // "Cypress Owner" also matches the header's own trigger button, so scope
    // to the Full Name field's Stack (label + value siblings), same pattern
    // as the header dropdown's org-name assertion in header-navigation.cy.ts.
    cy.contains(".MuiStack-root", "Full Name").should("contain.text", "Cypress Owner");
    cy.findByText(ownerEmail).should("be.visible");
    cy.findByText(/^Cypress Org /).should("be.visible");
  });

  it("Edit Profile saves Title/First/Last Name without touching contact number", () => {
    cy.findByRole("button", { name: "Edit Profile" }).click();
    cy.selectMuiOption("Title", "Mrs");
    cy.findByLabelText("First Name").clear().type("Updated");
    // Registration never collects Gender, so the owner's profile starts
    // without one — Edit Profile validates it as required on Save
    // regardless of which fields were actually touched.
    cy.selectMuiOption("Gender", "Male");
    cy.findByRole("button", { name: /^save$/i }).click();

    cy.findByRole("dialog").should("not.exist");
    cy.findByText("Updated Owner").should("be.visible");
  });

  it("changing the contact number requires OTP verification before it's saved", () => {
    const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
    const newNumber = `9${unique.slice(-9)}`;

    cy.findByRole("button", { name: "Edit Profile" }).click();
    cy.findByLabelText("Contact Number").clear().type(newNumber);
    cy.selectMuiOption("Gender", "Male");
    cy.findByRole("button", { name: /^save$/i }).click();

    cy.findByText("Verify your new mobile number").should("be.visible");
    cy.getLatestNotification(newNumber, "whatsapp")
      .extractOtp()
      .then((otp) => cy.findByLabelText("OTP").type(otp));
    cy.findByRole("button", { name: /^verify$/i }).click();

    cy.findByRole("dialog").should("not.exist");
    cy.findByText(new RegExp(newNumber)).should("be.visible");
  });

  it("Change Password rejects the wrong current password", () => {
    cy.findByRole("button", { name: "Change Password" }).click();
    cy.findByLabelText("Current Password").type("DefinitelyWrong@1");
    cy.findByLabelText("New Password").type("NewPassw0rd@1");
    cy.findByLabelText("Confirm New Password").type("NewPassw0rd@1");
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByText("Current password is incorrect.").should("be.visible");
  });

  it("Change Password succeeds and the new password logs in", () => {
    const newPassword = "NewPassw0rd@2";
    cy.findByRole("button", { name: "Change Password" }).click();
    cy.findByLabelText("Current Password").type(ownerPassword);
    cy.findByLabelText("New Password").type(newPassword);
    cy.findByLabelText("Confirm New Password").type(newPassword);
    cy.findByRole("button", { name: /^save$/i }).click();
    cy.findByRole("dialog").should("not.exist");

    cy.clearCookies();
    cy.visit("/login");
    cy.findByLabelText("Email or Phone Number").type(ownerEmail);
    cy.findByLabelText("Password").type(newPassword);
    cy.findByRole("button", { name: /login/i }).click();
    cy.location("pathname").should("eq", "/dashboard");
  });
});
