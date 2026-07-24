"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 008's own Data Model requires a unique (organizationId, employeeCode)
    // index where employeeCode is not null — only ever enforced by
    // application-level check-then-insert logic (employee.controller.ts's
    // `codeTaken` check) until now, which is a real race condition between
    // two concurrent invites/edits picking the same Employee ID. Partial
    // (not full-column) since employeeCode is optional — many rows have it
    // null, and those must not collide with each other.
    await queryInterface.addIndex("employees", ["organizationId", "employeeCode"], {
      unique: true,
      where: { employeeCode: { [Sequelize.Op.ne]: null } },
      name: "employees_organization_id_employee_code_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("employees", "employees_organization_id_employee_code_unique");
  },
};
