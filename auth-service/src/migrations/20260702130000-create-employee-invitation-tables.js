"use strict";

const SEED_AIRLINES = [
  "Air India",
  "IndiGo",
  "SpiceJet",
  "Vistara",
  "Emirates",
  "Qatar Airways",
  "Singapore Airlines",
  "British Airways",
  "Lufthansa",
  "American Airlines",
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("employees", {
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
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      countryCode: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contactNumber: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      dob: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      employeeCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "active",
      },
      invitationStatus: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("employees", ["organizationId", "email"], {
      unique: true,
      name: "employees_organization_id_email_unique",
    });
    await queryInterface.addIndex("employees", ["organizationId", "countryCode", "contactNumber"], {
      unique: true,
      name: "employees_organization_id_contact_unique",
    });

    await queryInterface.createTable("employee_company_access", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      roleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "roles", key: "id" },
      },
      departmentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
      },
      gradeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "grades", key: "id" },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("employee_company_access", ["employeeId"], {
      unique: true,
      name: "employee_company_access_employee_id_unique",
    });

    await queryInterface.createTable("projects", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      departmentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: Sequelize.STRING, allowNull: false },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("projects", ["departmentId", "name"], {
      unique: true,
      name: "projects_department_id_name_unique",
    });

    await queryInterface.createTable("employee_projects", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "projects", key: "id" },
        onDelete: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("employee_projects", ["employeeId", "projectId"], {
      unique: true,
      name: "employee_projects_employee_id_project_id_unique",
    });

    await queryInterface.createTable("airlines", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },
    });
    await queryInterface.bulkInsert(
      "airlines",
      SEED_AIRLINES.map((name) => ({ name }))
    );

    await queryInterface.createTable("employee_ff_numbers", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      airlineId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "airlines", key: "id" },
      },
      ffNumber: { type: Sequelize.STRING, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("employee_ff_numbers", ["employeeId", "airlineId"], {
      unique: true,
      name: "employee_ff_numbers_employee_id_airline_id_unique",
    });

    await queryInterface.createTable("approval_levels", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      module: { type: Sequelize.STRING, allowNull: false },
      level: { type: Sequelize.INTEGER, allowNull: false },
      approverEmployeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("approval_levels", ["employeeId", "module", "level"], {
      unique: true,
      name: "approval_levels_employee_id_module_level_unique",
    });

    await queryInterface.createTable("employee_invites", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      sentAt: { type: Sequelize.DATE, allowNull: false },
      sentBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
    });
    await queryInterface.addIndex("employee_invites", ["employeeId", "sentAt"], {
      name: "employee_invites_employee_id_sent_at",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("employee_invites");
    await queryInterface.dropTable("approval_levels");
    await queryInterface.dropTable("employee_ff_numbers");
    await queryInterface.dropTable("airlines");
    await queryInterface.dropTable("employee_projects");
    await queryInterface.dropTable("projects");
    await queryInterface.dropTable("employee_company_access");
    await queryInterface.dropTable("employees");
  },
};
