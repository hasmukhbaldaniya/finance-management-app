"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "firstName", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "lastName", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "emailVerifiedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "mobileVerifiedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Pre-existing users predate the concept of an unverified account — grandfather
    // them in so the column stays meaningful for accounts created from here on.
    await queryInterface.sequelize.query(`UPDATE "users" SET "emailVerifiedAt" = NOW()`);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "mobileVerifiedAt");
    await queryInterface.removeColumn("users", "emailVerifiedAt");
    await queryInterface.removeColumn("users", "lastName");
    await queryInterface.removeColumn("users", "firstName");
  },
};
