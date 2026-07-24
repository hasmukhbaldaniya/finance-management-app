"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const SELECT = Sequelize.QueryTypes.SELECT;

    // These three columns are about to be repointed from users.id to
    // employees.id — drop the old FK constraints first (they still
    // reference "users") and re-add them against "employees" at the end,
    // rather than leaving them dangling until the next migration drops
    // the users table outright.
    await queryInterface.removeConstraint("employees", "employees_createdBy_fkey");
    await queryInterface.removeConstraint("employees", "employees_updatedBy_fkey");
    await queryInterface.removeConstraint("employee_invites", "employee_invites_sentBy_fkey");

    const users = await queryInterface.sequelize.query(`SELECT * FROM users`, { type: SELECT });

    for (const user of users) {
      let organizationId = user.activeOrganizationId;
      if (!organizationId) {
        const fallback = await queryInterface.sequelize.query(
          `SELECT "organizationId" FROM organization_members WHERE "userId" = :userId ORDER BY id ASC LIMIT 1`,
          { replacements: { userId: user.id }, type: SELECT }
        );
        organizationId = fallback[0]?.organizationId ?? null;
      }
      // No organization to attach to at all — shouldn't happen for a real
      // account, but skip defensively rather than fail the whole migration.
      if (!organizationId) continue;

      const ownerRows = await queryInterface.sequelize.query(
        `SELECT 1 FROM organization_members WHERE "userId" = :userId AND "organizationId" = :organizationId AND role = 'owner'`,
        { replacements: { userId: user.id, organizationId }, type: SELECT }
      );
      const isOwner = ownerRows.length > 0;

      const contactNumber = user.phone && user.phone.trim() ? user.phone.trim() : null;
      const countryCode = contactNumber ? "+91" : null;
      const invitationStatus = user.registrationCompletedAt ? "registered" : "pending";

      const existingByEmail = await queryInterface.sequelize.query(
        `SELECT * FROM employees WHERE LOWER(email) = LOWER(:email)`,
        { replacements: { email: user.email }, type: SELECT }
      );
      const linked = existingByEmail.find((employee) => employee.userId === user.id);

      // Any OTHER employee row sharing this email is a pending invite for
      // someone who — unbeknownst to whoever invited them — already has a
      // real login account under that email. Employee.email is about to
      // become globally unique (it's the login identifier now), so that
      // invite can no longer coexist with the real account being migrated
      // in. It was never accepted (no password, invitationStatus stays
      // "pending" until someone completes onboarding), so it's removed
      // here rather than left to violate the new unique index.
      const staleConflicts = existingByEmail.filter((employee) => employee.id !== linked?.id);
      for (const conflict of staleConflicts) {
        await queryInterface.sequelize.query(`DELETE FROM employee_invites WHERE "employeeId" = :id`, {
          replacements: { id: conflict.id },
        });
        await queryInterface.sequelize.query(
          `DELETE FROM approval_levels WHERE "employeeId" = :id OR "approverEmployeeId" = :id`,
          { replacements: { id: conflict.id } }
        );
        await queryInterface.sequelize.query(`DELETE FROM employee_ff_numbers WHERE "employeeId" = :id`, {
          replacements: { id: conflict.id },
        });
        await queryInterface.sequelize.query(`DELETE FROM employee_projects WHERE "employeeId" = :id`, {
          replacements: { id: conflict.id },
        });
        await queryInterface.sequelize.query(`DELETE FROM employee_company_access WHERE "employeeId" = :id`, {
          replacements: { id: conflict.id },
        });
        await queryInterface.sequelize.query(`DELETE FROM employees WHERE id = :id`, {
          replacements: { id: conflict.id },
        });
      }

      let employeeId;
      if (linked) {
        // Already-linked case: this user previously triggered the
        // approver-picker's shadow-employee auto-create (or was otherwise
        // linked via userId). Bring it up to date with real auth data, and
        // prefer the user's real phone over any synthetic placeholder
        // contact number that auto-create logic may have fabricated.
        await queryInterface.sequelize.query(
          `UPDATE employees SET
             "passwordHash" = :passwordHash,
             "emailVerifiedAt" = :emailVerifiedAt,
             "mobileVerifiedAt" = :mobileVerifiedAt,
             "isOwner" = :isOwner,
             "invitationStatus" = :invitationStatus,
             "countryCode" = COALESCE(:countryCode, "countryCode"),
             "contactNumber" = COALESCE(:contactNumber, "contactNumber")
           WHERE id = :id`,
          {
            replacements: {
              id: linked.id,
              passwordHash: user.passwordHash,
              emailVerifiedAt: user.emailVerifiedAt,
              mobileVerifiedAt: user.mobileVerifiedAt,
              isOwner,
              invitationStatus,
              countryCode,
              contactNumber,
            },
          }
        );
        employeeId = linked.id;
      } else {
        const inserted = await queryInterface.sequelize.query(
          `INSERT INTO employees
             ("organizationId", "firstName", "lastName", email, "countryCode", "contactNumber",
              status, "invitationStatus", "passwordHash", "emailVerifiedAt", "mobileVerifiedAt",
              "isOwner", "createdAt", "updatedAt")
           VALUES
             (:organizationId, :firstName, :lastName, :email, :countryCode, :contactNumber,
              'active', :invitationStatus, :passwordHash, :emailVerifiedAt, :mobileVerifiedAt,
              :isOwner, NOW(), NOW())
           RETURNING id`,
          {
            replacements: {
              organizationId,
              firstName: user.firstName || user.name,
              lastName: user.lastName || "",
              email: user.email,
              countryCode,
              contactNumber,
              invitationStatus,
              passwordHash: user.passwordHash,
              emailVerifiedAt: user.emailVerifiedAt,
              mobileVerifiedAt: user.mobileVerifiedAt,
              isOwner,
            },
            type: SELECT,
          }
        );
        employeeId = inserted[0].id;
      }

      await queryInterface.sequelize.query(
        `UPDATE employees SET "createdBy" = :employeeId WHERE "createdBy" = :userId`,
        { replacements: { employeeId, userId: user.id } }
      );
      await queryInterface.sequelize.query(
        `UPDATE employees SET "updatedBy" = :employeeId WHERE "updatedBy" = :userId`,
        { replacements: { employeeId, userId: user.id } }
      );
      await queryInterface.sequelize.query(
        `UPDATE employee_invites SET "sentBy" = :employeeId WHERE "sentBy" = :userId`,
        { replacements: { employeeId, userId: user.id } }
      );
    }

    await queryInterface.addConstraint("employees", {
      fields: ["createdBy"],
      type: "foreign key",
      name: "employees_createdBy_fkey",
      references: { table: "employees", field: "id" },
    });
    await queryInterface.addConstraint("employees", {
      fields: ["updatedBy"],
      type: "foreign key",
      name: "employees_updatedBy_fkey",
      references: { table: "employees", field: "id" },
    });
    await queryInterface.addConstraint("employee_invites", {
      fields: ["sentBy"],
      type: "foreign key",
      name: "employee_invites_sentBy_fkey",
      references: { table: "employees", field: "id" },
    });
  },

  async down() {
    // Irreversible by design — this migration only copies/repoints data
    // forward onto employees. Restoring the pre-merge state requires the
    // pg_dump backup taken before running this migration sequence, not a
    // mechanical down() (the users/organization_members tables this would
    // need to restore into are dropped by the next migration anyway).
  },
};
