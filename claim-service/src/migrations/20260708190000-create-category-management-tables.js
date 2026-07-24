"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("categories", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      // organizationId/createdBy/updatedBy point at auth-service's own
      // Organization/Employee tables now — a real FK constraint can't span
      // two separate Postgres databases, so these are plain, unenforced
      // integer columns (see claim-service/CLAUDE.md's "Cross-service
      // reads" for how names are resolved when needed).
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "draft" },
      isEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      enableProjectPolicies: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("categories", ["organizationId", "name"], {
      unique: true,
      name: "categories_organization_id_name_unique",
    });

    await queryInterface.createTable("category_ziptrrip_mappings", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "categories", key: "id" },
        onDelete: "CASCADE",
      },
      ziptrripCategoryKey: { type: Sequelize.STRING, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("category_ziptrrip_mappings", ["categoryId", "ziptrripCategoryKey"], {
      unique: true,
      name: "category_ziptrrip_mappings_category_id_key_unique",
    });

    await queryInterface.createTable("category_fields", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "categories", key: "id" },
        onDelete: "CASCADE",
      },
      fieldType: { type: Sequelize.STRING, allowNull: false },
      fieldName: { type: Sequelize.STRING, allowNull: false },
      tooltip: { type: Sequelize.STRING, allowNull: true },
      isRequired: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      addToPolicyRules: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      config: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      conditionalVisibility: { type: Sequelize.JSONB, allowNull: true },
      redFlagMode: { type: Sequelize.STRING, allowNull: true },
      redFlagValue: { type: Sequelize.TEXT, allowNull: true },
      redFlagAction: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("category_fields", ["categoryId", "fieldName"], {
      unique: true,
      name: "category_fields_category_id_field_name_unique",
    });

    await queryInterface.createTable("category_policies", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "categories", key: "id" },
        onDelete: "CASCADE",
      },
      policyType: { type: Sequelize.STRING, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("category_policies", ["categoryId", "policyType"], {
      name: "category_policies_category_id_policy_type",
    });

    await queryInterface.createTable("category_policy_eligibilities", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      policyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "category_policies", key: "id" },
        onDelete: "CASCADE",
      },
      eligibilityType: { type: Sequelize.STRING, allowNull: false },
      entityId: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("category_policy_eligibilities", ["policyId"], {
      name: "category_policy_eligibilities_policy_id",
    });

    await queryInterface.createTable("category_policy_rules", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      policyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "category_policies", key: "id" },
        onDelete: "CASCADE",
      },
      level: { type: Sequelize.INTEGER, allowNull: false },
      ruleType: { type: Sequelize.STRING, allowNull: false },
      fieldId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "category_fields", key: "id" },
        onDelete: "CASCADE",
      },
      operator: { type: Sequelize.STRING, allowNull: true },
      value: { type: Sequelize.STRING, allowNull: true },
      comparisonFieldId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "category_fields", key: "id" },
        onDelete: "CASCADE",
      },
      comparisonValue: { type: Sequelize.STRING, allowNull: true },
      amountFieldId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "category_fields", key: "id" },
        onDelete: "CASCADE",
      },
      amountOperator: { type: Sequelize.STRING, allowNull: true },
      amountValue: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("category_policy_rules", ["policyId", "level"], {
      name: "category_policy_rules_policy_id_level",
    });

    await queryInterface.createTable("category_approval_levels", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      policyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "category_policies", key: "id" },
        onDelete: "CASCADE",
      },
      level: { type: Sequelize.INTEGER, allowNull: true },
      isDefaultFlow: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      autoApprove: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("category_approval_levels", ["policyId", "level"], {
      unique: true,
      name: "category_approval_levels_policy_id_level_unique",
    });

    await queryInterface.createTable("category_approval_stages", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      approvalLevelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "category_approval_levels", key: "id" },
        onDelete: "CASCADE",
      },
      stageNumber: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("category_approval_stages", ["approvalLevelId", "stageNumber"], {
      unique: true,
      name: "category_approval_stages_level_id_stage_number_unique",
    });

    await queryInterface.createTable("category_approval_stage_approvers", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      stageId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "category_approval_stages", key: "id" },
        onDelete: "CASCADE",
      },
      // employeeId — auth-service's Employee, cross-service, no FK (see note above).
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      logicGroup: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("category_approval_stage_approvers", ["stageId"], {
      name: "category_approval_stage_approvers_stage_id",
    });

    await queryInterface.createTable("category_versions", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "categories", key: "id" },
        onDelete: "CASCADE",
      },
      majorVersion: { type: Sequelize.INTEGER, allowNull: false },
      minorVersion: { type: Sequelize.INTEGER, allowNull: false },
      isMajor: { type: Sequelize.BOOLEAN, allowNull: false },
      snapshot: { type: Sequelize.JSONB, allowNull: false },
      modifiedSteps: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      // createdBy — auth-service's Employee, cross-service, no FK (see note above).
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("category_versions", ["categoryId", "majorVersion", "minorVersion"], {
      unique: true,
      name: "category_versions_category_id_version_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("category_versions");
    await queryInterface.dropTable("category_approval_stage_approvers");
    await queryInterface.dropTable("category_approval_stages");
    await queryInterface.dropTable("category_approval_levels");
    await queryInterface.dropTable("category_policy_rules");
    await queryInterface.dropTable("category_policy_eligibilities");
    await queryInterface.dropTable("category_policies");
    await queryInterface.dropTable("category_fields");
    await queryInterface.dropTable("category_ziptrrip_mappings");
    await queryInterface.dropTable("categories");
  },
};
