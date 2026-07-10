"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("claim_invoice_files", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      claimId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "claims", key: "id" },
        onDelete: "CASCADE",
      },
      originalFileName: { type: Sequelize.STRING, allowNull: false },
      storedPath: { type: Sequelize.STRING, allowNull: false },
      fileType: { type: Sequelize.STRING, allowNull: false },
      fileSizeBytes: { type: Sequelize.INTEGER, allowNull: false },
      // Nullable — only set for PDFs; an image source has exactly one page.
      pageCount: { type: Sequelize.INTEGER, allowNull: true },
      uploadedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("ai_extraction_logs", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      claimInvoiceFileId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "claim_invoice_files", key: "id" },
        onDelete: "CASCADE",
      },
      // Nullable — a single-image source has no page concept; a merged
      // multi-page extraction logs the first page number of the group.
      pageNumber: { type: Sequelize.INTEGER, allowNull: true },
      // Nullable until an expense actually results (e.g. extraction failed
      // outright, or the source was a duplicate/corrupted file).
      expenseId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "expenses", key: "id" },
        onDelete: "SET NULL",
      },
      requestedAt: { type: Sequelize.DATE, allowNull: false },
      respondedAt: { type: Sequelize.DATE, allowNull: true },
      // What was sent, for audit — not the raw file bytes themselves.
      rawRequestSummary: { type: Sequelize.JSONB, allowNull: true },
      rawModelResponse: { type: Sequelize.JSONB, allowNull: true },
      suggestedCategoryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "categories", key: "id" },
        onDelete: "SET NULL",
      },
      confidence: { type: Sequelize.DECIMAL(5, 4), allowNull: true },
      redFlagEvaluations: { type: Sequelize.JSONB, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "pending" },
      errorMessage: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addColumn("expenses", "sourceInvoiceFileId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "claim_invoice_files", key: "id" },
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("expenses", "sourcePageNumber", { type: Sequelize.INTEGER, allowNull: true });
    // Array of the original per-page expense ids a Merge folded into this
    // row — Unmerge (023) reads this to know what to split back into.
    await queryInterface.addColumn("expenses", "mergedFromExpenseIds", { type: Sequelize.JSONB, allowNull: true });
    await queryInterface.addColumn("expenses", "isRedFlagged", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn("expenses", "redFlagReason", { type: Sequelize.TEXT, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("expenses", "redFlagReason");
    await queryInterface.removeColumn("expenses", "isRedFlagged");
    await queryInterface.removeColumn("expenses", "mergedFromExpenseIds");
    await queryInterface.removeColumn("expenses", "sourcePageNumber");
    await queryInterface.removeColumn("expenses", "sourceInvoiceFileId");
    await queryInterface.dropTable("ai_extraction_logs");
    await queryInterface.dropTable("claim_invoice_files");
  },
};
