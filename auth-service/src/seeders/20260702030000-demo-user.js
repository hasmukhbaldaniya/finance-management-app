"use strict";

const bcrypt = require("bcryptjs");

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "Passw0rd!";
const SMARTSENSE_GST_NUMBER = "27AAAAA0000A1Z5";
const COMPANY_ADMIN_ROLE_NAME = "Company Admin";

/** @type {import('sequelize-cli').Seed} */
module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const now = new Date();

    // "Smartsense" (and its default roles) already exist by the time seeders
    // run — created by the create-organizations/create-roles migrations, not
    // by this seeder — so the demo employee just attaches to it.
    await queryInterface.sequelize.query(
      `
      INSERT INTO "employees"
        ("organizationId", "firstName", "lastName", email, status, "invitationStatus",
         "passwordHash", "emailVerifiedAt", "isOwner", "createdAt", "updatedAt")
      SELECT o.id, 'Demo', 'User', :email, 'active', 'registered', :passwordHash, :now, true, :now, :now
      FROM "organizations" o
      WHERE o."gstNumber" = :gstNumber
      `,
      { replacements: { email: DEMO_EMAIL, passwordHash, now, gstNumber: SMARTSENSE_GST_NUMBER } }
    );

    await queryInterface.sequelize.query(
      `
      INSERT INTO "employee_company_access" ("employeeId", "organizationId", "roleId", "createdAt", "updatedAt")
      SELECT e.id, e."organizationId", r.id, :now, :now
      FROM "employees" e
      JOIN "roles" r ON r."organizationId" = e."organizationId" AND r.name = :roleName
      WHERE e.email = :email
      `,
      { replacements: { email: DEMO_EMAIL, roleName: COMPANY_ADMIN_ROLE_NAME, now } }
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `
      DELETE FROM "employee_company_access"
      WHERE "employeeId" IN (SELECT id FROM "employees" WHERE email = :email)
      `,
      { replacements: { email: DEMO_EMAIL } }
    );
    await queryInterface.bulkDelete("employees", { email: DEMO_EMAIL });
  },
};
