"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Backs Claim's new `paranoid: true` — deleteClaim's own `claim.destroy()`
    // now sets this instead of removing the row, so a deleted claim stays
    // recoverable and Sequelize's default queries (findAll/findOne/etc.)
    // automatically exclude it without any call-site changes.
    await queryInterface.addColumn("claims", "deletedAt", { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("claims", "deletedAt");
  },
};
