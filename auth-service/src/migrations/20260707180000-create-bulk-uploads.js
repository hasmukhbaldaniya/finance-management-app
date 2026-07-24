"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("bulk_uploads", {
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
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "employees", key: "id" },
        onDelete: "SET NULL",
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      totalRows: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      successRows: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failedRows: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      newRows: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      updatedRows: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex("bulk_uploads", ["organizationId"], {
      name: "bulk_uploads_organization_id",
    });

    await queryInterface.createTable("bulk_upload_errors", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      uploadId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "bulk_uploads", key: "id" },
        onDelete: "CASCADE",
      },
      rowNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      employeeEmail: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      employeeName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      errorMessage: {
        type: Sequelize.STRING,
        allowNull: false,
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

    await queryInterface.addIndex("bulk_upload_errors", ["uploadId"], {
      name: "bulk_upload_errors_upload_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("bulk_upload_errors");
    await queryInterface.dropTable("bulk_uploads");
  },
};
