"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "registrationCompletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Pre-existing users (and anyone backfilled via the Smartsense migration) never
    // went through the registration wizard, so there's no "registrationToken" of
    // theirs to ever worry about being replayed — mark them as already-completed
    // for consistency, matching the emailVerifiedAt backfill.
    await queryInterface.sequelize.query(`UPDATE "users" SET "registrationCompletedAt" = NOW()`);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "registrationCompletedAt");
  },
};
