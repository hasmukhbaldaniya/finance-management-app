"use strict";

const SMARTSENSE_GST_NUMBER = "27AAAAA0000A1Z5";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("organizations", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      gstNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.createTable("organization_members", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "owner",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("organization_members", ["organizationId", "userId"], {
      unique: true,
      name: "organization_members_organization_id_user_id_unique",
    });

    // Every user is required to belong to at least one organization (see
    // user-stories/002-organization-signup.md Open Questions). Pre-existing users
    // created under 001, before organizations existed, are backfilled into one
    // default "Smartsense" organization here so that invariant holds immediately.
    const now = new Date();
    await queryInterface.bulkInsert("organizations", [
      {
        name: "Smartsense",
        gstNumber: SMARTSENSE_GST_NUMBER,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await queryInterface.sequelize.query(`
      INSERT INTO "organization_members" ("organizationId", "userId", "role", "createdAt", "updatedAt")
      SELECT o.id, u.id, 'owner', NOW(), NOW()
      FROM "users" u, "organizations" o
      WHERE o."gstNumber" = '${SMARTSENSE_GST_NUMBER}'
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("organization_members");
    await queryInterface.dropTable("organizations");
  },
};
