"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Employee is now the login entity — this link no longer means anything
    // (an Employee IS the account, not a pointer to one).
    await queryInterface.removeColumn("employees", "userId");

    // Employee.email/contactNumber were org-scoped unique; now that Employee
    // is the login identity, they need to be globally unique instead, same
    // as the old users.email/phone columns were.
    await queryInterface.removeIndex("employees", "employees_organization_id_email_unique");
    await queryInterface.removeIndex("employees", "employees_organization_id_contact_unique");
    await queryInterface.addIndex("employees", ["email"], {
      unique: true,
      name: "employees_email_unique",
    });
    await queryInterface.addIndex("employees", ["countryCode", "contactNumber"], {
      unique: true,
      name: "employees_contact_unique",
    });

    await queryInterface.dropTable("organization_members");
    await queryInterface.dropTable("users");
  },

  async down(queryInterface, Sequelize) {
    // Structural rollback only — see the previous migration's down() note.
    // Recreates users/organization_members empty; does not repopulate them.
    await queryInterface.createTable("users", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      phone: { type: Sequelize.STRING, allowNull: true, unique: true },
      passwordHash: { type: Sequelize.STRING, allowNull: false },
      firstName: { type: Sequelize.STRING, allowNull: true },
      lastName: { type: Sequelize.STRING, allowNull: true },
      emailVerifiedAt: { type: Sequelize.DATE, allowNull: true },
      mobileVerifiedAt: { type: Sequelize.DATE, allowNull: true },
      registrationCompletedAt: { type: Sequelize.DATE, allowNull: true },
      activeOrganizationId: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.createTable("organization_members", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: Sequelize.INTEGER, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      role: { type: Sequelize.STRING, allowNull: false, defaultValue: "owner" },
      gradeId: { type: Sequelize.INTEGER, allowNull: true },
      departmentId: { type: Sequelize.INTEGER, allowNull: true },
      roleId: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.removeIndex("employees", "employees_contact_unique");
    await queryInterface.removeIndex("employees", "employees_email_unique");
    await queryInterface.addIndex("employees", ["organizationId", "email"], {
      unique: true,
      name: "employees_organization_id_email_unique",
    });
    await queryInterface.addIndex("employees", ["organizationId", "countryCode", "contactNumber"], {
      unique: true,
      name: "employees_organization_id_contact_unique",
    });
    await queryInterface.addColumn("employees", "userId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
