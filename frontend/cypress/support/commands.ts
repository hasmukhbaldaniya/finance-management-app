/// <reference types="cypress" />
import "@testing-library/cypress/add-commands";

export type RegisteredOrganization = {
  organizationName: string;
  gstNumber: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
};

export type LatestNotification = {
  channel: "email" | "whatsapp";
  subject: string | null;
  body: string;
  createdAt: string;
};

// Every dropdown in this app is src/components/select-field.tsx (a MUI
// `Select`). Two accessibility gaps make the usual findByLabelText/findByRole
// approach fail on it, confirmed against MUI's own SelectInput source:
//   1. Its visible, interactive part is a `role="combobox"` <div> — not a
//      labelable element per the HTML spec — so a `<label htmlFor>` pointing
//      at it (which select-field.tsx's callers all do, matching every other
//      field in this app) is simply invalid HTML; findByLabelText refuses it.
//   2. select-field.tsx never passes MUI's `labelId`/`label`/`aria-label`
//      props, so that combobox <div> has no accessible name via ARIA either
//      — the `id` it IS given lands on a hidden native <input> instead (MUI's
//      own a11y escape hatch for a real <label for>, which this codebase
//      doesn't use). Net effect: this component currently has no accessible
//      name at all, a real gap against the global "every interactive element
//      needs the ARIA attributes its role requires" rule — flagged, not
//      fixed here (out of scope for adding tests; would need a select-field.tsx
//      change plus a design call on which prop to wire).
// Until that's fixed, locate the combobox by DOM proximity to its sibling
// <label> instead. Reused across every module with a SelectField (Employee
// Invitation, Category/Trip/Claim forms, ...), not just Employee Management.
Cypress.Commands.add("selectMuiOption", (labelText: string | RegExp, optionText: string | RegExp) => {
  const labelMatcher = typeof labelText === "string" ? new RegExp(`^${labelText}$`) : labelText;
  cy.contains("label", labelMatcher).parent().find('[role="combobox"]').click();
  return cy.findByRole("option", { name: optionText }).click();
});

const GATEWAY_URL = Cypress.env("gatewayUrl") as string;
const COMMUNICATIONS_SERVICE_URL = Cypress.env("communicationsServiceUrl") as string;
const COMMUNICATIONS_INTERNAL_API_KEY = Cypress.env("communicationsInternalApiKey") as string;

// Logs in via the same POST the real login form calls, then caches the
// resulting session cookie for the run — see "Authentication strategy" in
// docs/PLANS/cypress-e2e-testing-plan.md. Every module's tests use this
// instead of driving the login form themselves; only 001-authentication's
// own spec exercises the real form.
Cypress.Commands.add("loginAs", (identifier: string, password: string) => {
  return cy.session(
    ["loginAs", identifier],
    () => {
      cy.request("POST", `${GATEWAY_URL}/auth/login`, { identifier, password });
    },
    {
      validate: () => {
        cy.request({ url: `${GATEWAY_URL}/auth/me`, failOnStatusCode: false }).its("status").should("eq", 200);
      },
    }
  );
});

// Test-support only: reads back the most recent notification body
// communications-service actually delivered/logged for a recipient, since
// that's the only place a plaintext OTP or invite link exists in this
// system (auth-service only ever stores a one-way hash). Calls
// communications-service directly, not through the gateway — see
// "Decisions", point 1, in the plan doc for why that's a deliberate
// exception to "tests only go through the gateway".
Cypress.Commands.add("getLatestNotification", (to: string, channel: "email" | "whatsapp" = "email") => {
  return cy
    .request({
      url: `${COMMUNICATIONS_SERVICE_URL}/notifications/latest`,
      qs: { to, channel },
      headers: COMMUNICATIONS_INTERNAL_API_KEY ? { "X-Internal-Api-Key": COMMUNICATIONS_INTERNAL_API_KEY } : {},
    })
    .then((response) => response.body as LatestNotification);
});

Cypress.Commands.add("extractOtp", { prevSubject: true } as const, (notification: LatestNotification) => {
  const match = notification.body.match(/\b\d{6}\b/);
  if (!match) {
    throw new Error(`No 6-digit OTP found in notification body: ${notification.body}`);
  }
  return cy.wrap(match[0]);
});

// The employee-invite email links to `<frontend origin>/onboarding?token=<jwt>`
// (auth-service/src/utils/employee-invite-mailer.ts) — pulls just the token
// out of that URL.
Cypress.Commands.add("extractToken", { prevSubject: true } as const, (notification: LatestNotification) => {
  const match = notification.body.match(/\?token=(\S+)/);
  if (!match) {
    throw new Error(`No onboarding token found in notification body: ${notification.body}`);
  }
  return cy.wrap(match[1]);
});

// Creates a brand-new organization by calling the real registration
// endpoints directly (through the gateway) — the same sequence
// register/*/page.tsx drives, minus typing into the form. Every module past
// 001/002 calls this in a `before` hook instead of sharing one fixture org,
// so specs never depend on another spec file's run order (see "Test data
// strategy" in the plan doc). Mobile is saved-but-unverified, mirroring the
// wizard's own "Skip" action on register/mobile.
//
// Leaves the browser holding a real, valid session cookie for the new owner
// (completeRegistration logs in immediately, same as the real wizard) — call
// cy.clearCookies() afterward if a spec needs to visit /login or
// /forgot-password next, since both of those routes' own layout.tsx redirect
// an already-authenticated visitor straight to /dashboard.
Cypress.Commands.add("apiRegisterOrganization", (overrides: Partial<RegisteredOrganization> = {}) => {
  const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
  const organizationName = overrides.organizationName ?? `Cypress Org ${unique}`;
  // GST_REGEX only allows a fixed 5-letter/4-digit shape, so the digit slice
  // alone (10,000 values) is too small a keyspace for a full-suite run that
  // registers dozens of orgs — observed colliding (a real 409) once in
  // practice. Deriving 3 of the 5 letters from a different digit window too
  // widens this to ~175M combinations.
  const gstLetters = "CY" + unique.slice(-7, -4).split("").map((d) => String.fromCharCode(65 + (Number(d) % 26))).join("");
  const gstNumber = overrides.gstNumber ?? `27${gstLetters}${unique.slice(-4)}A1Z9`;
  const ownerEmail = overrides.ownerEmail ?? `cypress-${unique}@example.com`;
  const ownerPassword = overrides.ownerPassword ?? "Cypress@123";
  const ownerFirstName = overrides.ownerFirstName ?? "Cypress";
  const ownerLastName = overrides.ownerLastName ?? "Owner";
  const mobileNumber = `9${unique.slice(-9)}`;

  return cy
    .request("POST", `${GATEWAY_URL}/auth/registrations`, {
      organizationName,
      gstNumber,
      firstName: ownerFirstName,
      lastName: ownerLastName,
      email: ownerEmail,
      password: ownerPassword,
    })
    .then(() => cy.getLatestNotification(ownerEmail, "email"))
    .then((notification) => cy.wrap(notification).extractOtp())
    .then((otp) =>
      cy.request("POST", `${GATEWAY_URL}/auth/registrations/email-otp/verify`, { email: ownerEmail, otp })
    )
    .then(({ body }) => {
      const registrationToken = (body as { registrationToken: string }).registrationToken;
      return cy
        .request("PUT", `${GATEWAY_URL}/auth/registrations/mobile`, { registrationToken, mobileNumber })
        .then(() => cy.request("POST", `${GATEWAY_URL}/auth/registrations/complete`, { registrationToken }));
    })
    .then(() => {
      const result: RegisteredOrganization = {
        organizationName,
        gstNumber,
        ownerEmail,
        ownerPassword,
        ownerFirstName,
        ownerLastName,
      };
      return result;
    });
});

export type InvitedEmployee = {
  employeeId: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: number;
  departmentId: number;
  gradeId: number;
  /** true once the onboarding chain has actually run — false means only the invite (008) half happened, e.g. for testing Employee Listing's "pending invitation"/Resend Invite state. */
  onboarded: boolean;
};

export type InviteAndOnboardOverrides = {
  roleName?: string; // "Company Admin" | "Members" (both always seeded, see auth-service's createRegistration) or a custom role name
  password?: string;
  /** Set false to stop after sending the invite (008) — skips 011's onboarding chain entirely, leaving the employee in "Pending Invitation" status. Defaults true. */
  onboard?: boolean;
  /** Reuse an existing Department/Grade instead of creating a throwaway one — e.g. so a Grade/Department Management test can assert its own Members dialog against a real assigned employee. */
  departmentId?: number;
  gradeId?: number;
};

// Invites a brand-new employee (008's 5-call sequence) and immediately
// accepts that invite (011's onboarding chain) via direct API calls — the
// Phase 2 counterpart to cy.apiRegisterOrganization. Must run as an
// already-authenticated owner/Company-Admin (i.e. after cy.apiRegisterOrganization
// in the same test), since it reads the caller's own id off GET /auth/me to
// use as the new employee's Level 1 approver.
//
// A freshly-registered org has the two seeded Roles but zero Departments/
// Grades, so this also creates one throwaway Department + Grade to satisfy
// Company Access's required fields — real endpoint calls, not fixtures.
//
// Ends with the SAME chain onboarding/mobile/page.tsx's own "Skip" button
// takes (mobile number saved, OTP verification skipped) and leaves the
// browser holding a valid session cookie for the NEW EMPLOYEE, not the
// owner who called this — cy.loginAs(ownerEmail, ownerPassword) afterward
// to switch back if a test still needs to act as the owner.
Cypress.Commands.add("apiInviteAndOnboardEmployee", (overrides: InviteAndOnboardOverrides = {}) => {
  const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
  const email = `cypress-employee-${unique}@example.com`;
  const password = overrides.password ?? "Cypress@123";
  const firstName = "Cypress";
  const lastName = "Employee";
  const roleName = overrides.roleName ?? "Members";
  const inviteContactNumber = `9${unique.slice(-9)}`;
  const onboardingContactNumber = `8${unique.slice(-9)}`;

  type Ctx = { ownerId: number; roleId: number; departmentId: number; gradeId: number; employeeId: number; token: string };

  return cy
    .request("GET", `${GATEWAY_URL}/auth/me`)
    .then(({ body }) => (body as { user: { id: number } }).user.id)
    .then((ownerId) =>
      cy.request("GET", `${GATEWAY_URL}/roles`).then(({ body }) => {
        const role = (body as { roles: { id: number; name: string }[] }).roles.find((r) => r.name === roleName);
        if (!role) {
          throw new Error(`Role "${roleName}" not found — was the organization registered via cy.apiRegisterOrganization()?`);
        }
        return { ownerId, roleId: role.id };
      })
    )
    .then(({ ownerId, roleId }) => {
      if (overrides.departmentId) {
        return cy.wrap({ ownerId, roleId, departmentId: overrides.departmentId });
      }
      return cy
        .request("POST", `${GATEWAY_URL}/departments`, { name: `Cypress Dept ${unique}` })
        .then(({ body }) => ({ ownerId, roleId, departmentId: (body as { department: { id: number } }).department.id }));
    })
    .then(({ ownerId, roleId, departmentId }) => {
      if (overrides.gradeId) {
        return cy.wrap({ ownerId, roleId, departmentId, gradeId: overrides.gradeId });
      }
      return cy
        .request("POST", `${GATEWAY_URL}/grades`, { name: `Cypress Grade ${unique}` })
        .then(({ body }) => ({ ownerId, roleId, departmentId, gradeId: (body as { grade: { id: number } }).grade.id }));
    })
    .then(({ ownerId, roleId, departmentId, gradeId }) =>
      cy
        .request("POST", `${GATEWAY_URL}/employees`, {
          title: "Mr",
          firstName,
          lastName,
          email,
          countryCode: "+91",
          contactNumber: inviteContactNumber,
          gender: "Male",
        })
        .then(({ body }) => ({ ownerId, roleId, departmentId, gradeId, employeeId: (body as { id: number }).id }))
    )
    .then((ctx) =>
      cy
        .request("PUT", `${GATEWAY_URL}/employees/${ctx.employeeId}/company-access`, {
          roleId: ctx.roleId,
          departmentId: ctx.departmentId,
          gradeId: ctx.gradeId,
          projectIds: [],
        })
        .then(() => ctx)
    )
    .then((ctx) =>
      cy.request("POST", `${GATEWAY_URL}/employees/${ctx.employeeId}/ff-numbers`, { ffNumbers: [] }).then(() => ctx)
    )
    .then((ctx) =>
      cy
        .request("POST", `${GATEWAY_URL}/employees/${ctx.employeeId}/approvals`, {
          approvers: [{ level: 1, approverEmployeeId: ctx.ownerId }],
        })
        .then(() => ctx)
    )
    .then((ctx) => cy.request("POST", `${GATEWAY_URL}/employees/${ctx.employeeId}/invitations`).then(() => ctx))
    .then((ctx) => {
      if (overrides.onboard === false) {
        const result: InvitedEmployee = {
          employeeId: ctx.employeeId,
          email,
          password,
          firstName,
          lastName,
          roleId: ctx.roleId,
          departmentId: ctx.departmentId,
          gradeId: ctx.gradeId,
          onboarded: false,
        };
        return cy.wrap(result);
      }

      return cy
        .getLatestNotification(email, "email")
        .extractToken()
        .then((token) => ({ ...ctx, token }) as Ctx)
        .then((c) =>
          cy.request("POST", `${GATEWAY_URL}/employee-onboarding/verify-token`, { token: c.token }).then(() => c)
        )
        .then((c) =>
          cy.request("POST", `${GATEWAY_URL}/employee-onboarding/password`, { token: c.token, password }).then(() => c)
        )
        .then((c) =>
          cy
            .request("POST", `${GATEWAY_URL}/employee-onboarding/profile`, { token: c.token, title: "Mr", firstName, lastName })
            .then(() => c)
        )
        .then((c) =>
          cy
            .request("PUT", `${GATEWAY_URL}/employee-onboarding/mobile`, {
              token: c.token,
              countryCode: "+91",
              contactNumber: onboardingContactNumber,
            })
            .then(() => c)
        )
        .then((c) => cy.request("POST", `${GATEWAY_URL}/employee-onboarding/complete`, { token: c.token }).then(() => c))
        .then((c) => {
          const result: InvitedEmployee = {
            employeeId: c.employeeId,
            email,
            password,
            firstName,
            lastName,
            roleId: c.roleId,
            departmentId: c.departmentId,
            gradeId: c.gradeId,
            onboarded: true,
          };
          return result;
        });
    });
});

export type CreatedCategory = {
  categoryId: number;
  name: string;
  departmentId: number | null;
  status: "draft" | "active";
};

export type CreateCategoryOverrides = {
  name?: string;
  /** Set false to stop right after Step 1 (category created, still "draft", no fields/policies) — e.g. for testing Delete, which is draft-only. Defaults true. */
  activate?: boolean;
};

// Creates a category via claim-service's own REST contract directly (create
// -> fields -> policies -> project-policies), the Phase 4 counterpart to
// cy.apiRegisterOrganization/cy.apiInviteAndOnboardEmployee. The minimal
// valid payload for each step was confirmed against claim-service's actual
// validation code, not guessed:
//   - fields: needs exactly one `useAsExpenseDate` date field and one
//     `useAsClaimAmount` amount field when isDraftSave is false.
//   - policies: needs >=1 Claim Policy even when isDraftSave is true (only
//     duplicate-name/rule checks are skipped by that flag, not the "at
//     least one policy" requirement) — eligibility needs a real Department,
//     rules can be `[]`, and a Default Flow with `autoApprove: true` needs
//     zero approvers (`stages: []`), the simplest possible valid flow.
//   - project-policies: `{enableProjectPolicies: false}` alone is the
//     terminal call that flips draft -> active, no projectPolicies array
//     needed.
// A freshly-registered org has zero categories (no seed data survives
// org creation, see docs/PLANS/cypress-e2e-testing-plan.md), so this also
// creates its own throwaway Department for the Claim Policy's eligibility —
// same "call the real endpoint, don't fake it" posture every other
// api-fixture command in this file already follows.
Cypress.Commands.add("apiCreateCategory", (overrides: CreateCategoryOverrides = {}) => {
  const unique = `${Date.now()}${Cypress._.random(100, 999)}`;
  const name = overrides.name ?? `Cypress Category ${unique}`;
  const activate = overrides.activate ?? true;

  return cy
    .request("POST", `${GATEWAY_URL}/categories`, {
      name,
      description: "Created by Cypress for E2E testing.",
      ziptrripCategoryIds: [],
      isDraftSave: false,
    })
    .then(({ body }) => {
      const categoryId = (body as { id: number }).id;

      if (!activate) {
        const result: CreatedCategory = { categoryId, name, departmentId: null, status: "draft" };
        return cy.wrap(result);
      }

      return cy
        .request("POST", `${GATEWAY_URL}/departments`, { name: `Cypress Cat Dept ${unique}` })
        .then(({ body: deptBody }) => (deptBody as { department: { id: number } }).department.id)
        .then((departmentId) =>
          cy
            .request("PUT", `${GATEWAY_URL}/categories/${categoryId}/fields`, {
              isDraftSave: false,
              fields: [
                {
                  id: -1,
                  fieldType: "amount",
                  fieldName: "Amount",
                  tooltip: null,
                  isRequired: true,
                  addToPolicyRules: true,
                  conditionalVisibility: null,
                  redFlagMode: null,
                  redFlagValue: null,
                  redFlagAction: null,
                  config: { useAsClaimAmount: true },
                },
                {
                  id: -2,
                  fieldType: "date",
                  fieldName: "Expense Date",
                  tooltip: null,
                  isRequired: true,
                  addToPolicyRules: true,
                  conditionalVisibility: null,
                  redFlagMode: null,
                  redFlagValue: null,
                  redFlagAction: null,
                  config: { useAsExpenseDate: true },
                },
              ],
            })
            .then(() => departmentId)
        )
        .then((departmentId) =>
          cy
            .request("PUT", `${GATEWAY_URL}/categories/${categoryId}/policies`, {
              isDraftSave: false,
              claimPolicies: [
                {
                  name: "Cypress Claim Policy",
                  eligibility: [{ eligibilityType: "department", entityIds: [departmentId] }],
                  rules: [],
                  approvalLevels: [{ level: null, isDefaultFlow: true, autoApprove: true, stages: [] }],
                },
              ],
              exceptionPolicies: [],
            })
            .then(() => departmentId)
        )
        .then((departmentId) =>
          cy.request("PUT", `${GATEWAY_URL}/categories/${categoryId}/project-policies`, { enableProjectPolicies: false }).then(() => {
            const result: CreatedCategory = { categoryId, name, departmentId, status: "active" };
            return result;
          })
        );
    });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      loginAs(identifier: string, password: string): Chainable<null>;
      selectMuiOption(labelText: string | RegExp, optionText: string | RegExp): Chainable<JQuery<HTMLElement>>;
      getLatestNotification(to: string, channel?: "email" | "whatsapp"): Chainable<LatestNotification>;
      extractOtp(): Chainable<string>;
      extractToken(): Chainable<string>;
      apiRegisterOrganization(overrides?: Partial<RegisteredOrganization>): Chainable<RegisteredOrganization>;
      apiInviteAndOnboardEmployee(overrides?: InviteAndOnboardOverrides): Chainable<InvitedEmployee>;
      apiCreateCategory(overrides?: CreateCategoryOverrides): Chainable<CreatedCategory>;
    }
  }
}
