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

    // ai_extraction_logs does NOT get created here anymore — per
    // docs/PLANS/microservices-plan.md's Phase 4, AiExtractionLog moved
    // sideways into ai-service's own MySQL database (see that project's own
    // migrations), not into claim-service's Postgres alongside
    // claim_invoice_files. Its two FKs (claimInvoiceFileId, expenseId) would
    // have been cross-service anyway once that move happened, so the table
    // was never going to belong here long-term.

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
    await queryInterface.dropTable("claim_invoice_files");
  },
};
