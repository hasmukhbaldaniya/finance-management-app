"use strict";

const ALL_PRIVILEGE_KEYS = [
  "employee_management",
  "basic_features",
  "category_management",
  "create_claims_trips",
  "claim_trip_approvals",
  "reports",
  "finance_view",
  "consumption_billing",
];

const MEMBERS_PRIVILEGE_KEYS = ["employee_management", "basic_features", "category_management", "create_claims_trips"];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("roles", {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      privileges: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
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

    await queryInterface.addIndex("roles", ["organizationId", "name"], {
      unique: true,
      name: "roles_organization_id_name_unique",
    });

    await queryInterface.addColumn("organization_members", "roleId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "roles", key: "id" },
      onDelete: "SET NULL",
    });

    // Seed Company Admin (all privileges) and Members (a fixed subset) for
    // every organization that already exists — see
    // user-stories/006-roles-and-privileges-management.md's Data Model.
    const allPrivilegesLiteral = `ARRAY[${ALL_PRIVILEGE_KEYS.map((key) => `'${key}'`).join(",")}]::varchar[]`;
    const membersPrivilegesLiteral = `ARRAY[${MEMBERS_PRIVILEGE_KEYS.map((key) => `'${key}'`).join(",")}]::varchar[]`;

    await queryInterface.sequelize.query(`
      INSERT INTO "roles" ("organizationId", "name", "isDefault", "isActive", "privileges", "createdAt", "updatedAt")
      SELECT o.id, 'Company Admin', true, true, ${allPrivilegesLiteral}, NOW(), NOW()
      FROM "organizations" o
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO "roles" ("organizationId", "name", "isDefault", "isActive", "privileges", "createdAt", "updatedAt")
      SELECT o.id, 'Members', true, true, ${membersPrivilegesLiteral}, NOW(), NOW()
      FROM "organizations" o
    `);

    // Backfill: the legacy OrganizationMember.role string ("owner"/"member")
    // seeds a real roleId against the two rows just created above — a one-time
    // migration, not an ongoing sync between the two columns (see this story's
    // Open Questions for why they otherwise stay independent going forward).
    await queryInterface.sequelize.query(`
      UPDATE "organization_members" om
      SET "roleId" = r.id
      FROM "roles" r
      WHERE r."organizationId" = om."organizationId"
        AND r."isDefault" = true
        AND r."name" = CASE WHEN om."role" = 'owner' THEN 'Company Admin' ELSE 'Members' END
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("organization_members", "roleId");
    await queryInterface.dropTable("roles");
  },
};
