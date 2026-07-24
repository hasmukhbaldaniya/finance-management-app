"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // A newly self-registered organization's creator gets a Company Admin
    // EmployeeCompanyAccess row immediately (see registration.controller.ts),
    // but there's no Department/Grade to assign yet — those get picked later,
    // same as any other employee going through Step 2 of the invite wizard.
    await queryInterface.changeColumn("employee_company_access", "departmentId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.changeColumn("employee_company_access", "gradeId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("employee_company_access", "gradeId", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn("employee_company_access", "departmentId", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
