"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "activeOrganizationId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "organizations", key: "id" },
      onDelete: "SET NULL",
    });

    // Backfill every existing user's active organization to their first (today,
    // always only) membership, so behavior is unchanged until someone actually
    // switches — see user-stories/003-header-navigation.md.
    await queryInterface.sequelize.query(`
      UPDATE "users" u
      SET "activeOrganizationId" = (
        SELECT om."organizationId"
        FROM "organization_members" om
        WHERE om."userId" = u.id
        ORDER BY om.id ASC
        LIMIT 1
      )
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "activeOrganizationId");
  },
};
