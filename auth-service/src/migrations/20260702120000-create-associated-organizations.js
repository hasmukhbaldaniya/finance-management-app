"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("associated_organizations", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      ownerOrganizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "organizations", key: "id" },
        onDelete: "SET NULL",
      },
      contactName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contactEmail: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contactPhone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      registrationType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      invitedAt: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex("associated_organizations", ["ownerOrganizationId"], {
      name: "associated_organizations_owner_organization_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("associated_organizations");
  },
};
