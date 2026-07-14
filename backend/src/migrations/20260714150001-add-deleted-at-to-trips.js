"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Backs Trip's new `paranoid: true` — deleteTrip's own `trip.destroy()`
    // now sets this instead of removing the row, so a deleted trip stays
    // recoverable and Sequelize's default queries (findAll/findOne/etc.)
    // automatically exclude it without any call-site changes.
    await queryInterface.addColumn("trips", "deletedAt", { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("trips", "deletedAt");
  },
};
