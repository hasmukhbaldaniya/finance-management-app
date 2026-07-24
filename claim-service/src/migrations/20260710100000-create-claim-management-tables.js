"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("claims", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      // organizationId/employeeId — auth-service's Organization/Employee,
      // cross-service, no FK (see claim-service/CLAUDE.md's "Cross-service
      // reads"). Losing the CASCADE here is a real, accepted consequence.
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      // Nullable — only set for standalone claims; a trip-linked claim's
      // identity is the trip's own name (022's Open Questions).
      name: { type: Sequelize.STRING, allowNull: true },
      claimType: { type: Sequelize.STRING, allowNull: false },
      tripId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "trips", key: "id" },
        onDelete: "SET NULL",
      },
      // Informational only, per 022 — doesn't change behavior after creation.
      creationMethod: { type: Sequelize.STRING, allowNull: false, defaultValue: "manual" },
      // This epic only ever writes "draft" or one generic "submitted" value;
      // the fuller display-only set (pending_for_approval etc.) mirrors
      // Trip.status's own precedent — see 022's Overview.
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "draft" },
      totalAmount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      // Set only when this claim was produced by another claim's Split Claim
      // action — 024's Split Request tab filters on this being non-null.
      splitFromClaimId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "claims", key: "id" },
        onDelete: "SET NULL",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("expenses", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      claimId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "claims", key: "id" },
        onDelete: "CASCADE",
      },
      // Denormalized from the owning claim at creation time so the
      // organization-wide duplicate check (023) is a single indexed lookup,
      // not a join through claims for every expense checked.
      // organizationId — auth-service's Organization, cross-service, no FK.
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      // Nullable — an AI-created expense (023) can arrive with no
      // confidently-suggested category and sit blank until the employee
      // picks one during Review; a manually-created expense always has this
      // set by the time saveExpenses persists it.
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "categories", key: "id" },
      },
      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      paidBy: { type: Sequelize.STRING, allowNull: false },
      // Per-CategoryField-id map of submitted values — the dynamic form's
      // entire payload lives here; fieldType-specific shape is validated at
      // the controller layer, not enforced by the column.
      fieldValues: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      // Denormalized from whichever field is marked useAsClaimAmount.
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      // Denormalized from whichever field is marked useAsExpenseDate —
      // nullable since Save as Draft is lenient (013/022's "half-filled is a
      // valid draft" posture).
      expenseDate: { type: Sequelize.DATEONLY, allowNull: true },
      // Denormalized from whichever field is marked useAsInvoiceNumber (022's
      // new, optional CategoryField flag) — the third leg of the duplicate
      // check alongside expenseDate/amount above.
      invoiceNumber: { type: Sequelize.STRING, allowNull: true },
      // Tracks a Split Expense's lineage back to its original row.
      splitFromExpenseId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "expenses", key: "id" },
        onDelete: "SET NULL",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // Backs the organization-wide duplicate-bill check (023) without a
    // full-table scan — categories with no useAsInvoiceNumber field simply
    // never populate invoiceNumber, so those rows are never matched here.
    await queryInterface.addIndex("expenses", ["organizationId", "invoiceNumber", "expenseDate", "amount"], {
      name: "expenses_org_invoice_date_amount_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("expenses");
    await queryInterface.dropTable("claims");
  },
};
