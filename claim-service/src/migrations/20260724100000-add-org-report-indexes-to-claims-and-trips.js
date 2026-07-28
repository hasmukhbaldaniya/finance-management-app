"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Backs listClaimsForOrg/listTripsForOrg (org-reports.controller.ts) and
    // reports-service's Expense Summary/Claim Cost/Trip Cost/Red-Flagged
    // Expenses reports — all filter by organizationId + a createdAt range
    // (ordered by createdAt DESC) and/or an equality status filter. Without
    // these, both queries fall back to a full-table scan on organizationId
    // alone as claims/trips grow.
    await queryInterface.addIndex("claims", ["organizationId", "createdAt"], { name: "claims_org_created_at_idx" });
    await queryInterface.addIndex("claims", ["organizationId", "status"], { name: "claims_org_status_idx" });
    await queryInterface.addIndex("trips", ["organizationId", "createdAt"], { name: "trips_org_created_at_idx" });
    await queryInterface.addIndex("trips", ["organizationId", "status"], { name: "trips_org_status_idx" });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("claims", "claims_org_created_at_idx");
    await queryInterface.removeIndex("claims", "claims_org_status_idx");
    await queryInterface.removeIndex("trips", "trips_org_created_at_idx");
    await queryInterface.removeIndex("trips", "trips_org_status_idx");
  },
};
