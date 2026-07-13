"use strict";

// 025's "Split Claim" — sharing one expense's cost across colleagues in the
// same organization, each accepting/rejecting their own share independently.
// Simplified versus that story doc's own data model: one request = one
// original expense (not a bundle of several), matching every reference
// screenshot exactly (each only ever shows a single expense per request) —
// a deliberate scope reduction made at implementation time, not an
// oversight; see that doc's own Open Questions for the bundling question
// this sidesteps.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("expense_split_requests", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      expenseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "expenses", key: "id" },
        onDelete: "CASCADE",
      },
      requestedByEmployeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      splitType: { type: Sequelize.STRING, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("expense_split_request_members", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      splitRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "expense_split_requests", key: "id" },
        onDelete: "CASCADE",
      },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      // The requester's own retained-share row — included as a member like
      // everyone else (so the Member/Percentage/Amount table always shows
      // every party to the split, matching the reference screenshot's own
      // "(You)" row), but never needs a response of its own.
      isRequester: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "pending" },
      respondedAt: { type: Sequelize.DATE, allowNull: true },
      // Set once accepted — the brand-new Expense created on the accepting
      // employee's own claim for their share.
      resultingExpenseId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "expenses", key: "id" },
        onDelete: "SET NULL",
      },
    });

    await queryInterface.addIndex("expense_split_request_members", ["employeeId", "status"], {
      name: "expense_split_request_members_employee_status_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("expense_split_request_members");
    await queryInterface.dropTable("expense_split_requests");
  },
};
