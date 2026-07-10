"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // AI-Powered claims persist a Claim row (and upload/process invoice
    // files against it) before the employee has reviewed anything on Step
    // 2 — necessary so the AI service has something to attach files to.
    // hasBeenSaved distinguishes "exists so processing can run" from "the
    // employee has actually saved it at least once" — listClaims filters
    // on this so an abandoned Step-2 claim never shows in My Claim/Split
    // Request. Set true by saveExpenses (draft or final) and by
    // splitClaim's newly-created claim (already assembled from previously-
    // saved expenses, so it's complete from the moment it's created).
    await queryInterface.addColumn("claims", "hasBeenSaved", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    // Existing claims (created before this column existed) are, by
    // definition, already real/visible — backfill true so nothing that
    // used to show in the listing suddenly disappears.
    await queryInterface.sequelize.query('UPDATE "claims" SET "hasBeenSaved" = true');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("claims", "hasBeenSaved");
  },
};
