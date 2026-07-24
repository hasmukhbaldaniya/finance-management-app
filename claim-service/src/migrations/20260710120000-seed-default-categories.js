"use strict";

// Sample, ready-to-use categories for every existing organization, so Claim
// Management (022/023) has something real to categorize expenses against
// out of the box — added at explicit request after testing the AI-Powered
// flow surfaced an org with zero categories (nothing for the AI to match,
// nothing in the Category dropdown either). Each one deliberately exercises
// a different part of the dynamic form mechanic: Meals demonstrates the AI
// red flag check (013's own "non-veg or alcohol" example); Travel/Flight
// demonstrates the `list` (Airlines) and `city_list` field types;
// Domestic Hotel demonstrates a formula-computed Amount ("Number of
// Nights" * "Rate Per Night", matching 022's own reference screenshot);
// Fuel/Local Conveyance deliberately has no `useAsInvoiceNumber` field, so
// duplicate detection correctly skips it (023's own documented behavior for
// mileage/per-diem-style categories).
const CATEGORY_DEFINITIONS = [
  {
    name: "Meals",
    description: "Food and beverage expenses incurred during business activity.",
    fields: [
      { fieldType: "amount", fieldName: "Amount", isRequired: true, addToPolicyRules: true, config: { minValue: 0, useAsClaimAmount: true } },
      { fieldType: "date", fieldName: "Expense Date", isRequired: true, addToPolicyRules: true, config: { useAsExpenseDate: true } },
      { fieldType: "small_text", fieldName: "Restaurant Name", isRequired: false, addToPolicyRules: false, config: { minLength: 2, maxLength: 100 } },
      {
        fieldType: "small_text",
        fieldName: "Invoice Number",
        isRequired: false,
        addToPolicyRules: false,
        config: { minLength: 1, maxLength: 50, useAsInvoiceNumber: true },
      },
      {
        fieldType: "small_text",
        fieldName: "Food Type Notes",
        isRequired: false,
        addToPolicyRules: false,
        config: { minLength: 0, maxLength: 200 },
        redFlagMode: "ai",
        redFlagValue: "Flag if the bill includes alcohol or non-vegetarian items.",
        redFlagAction: "highlight",
      },
    ],
  },
  {
    name: "Travel/Flight",
    description: "Domestic and international flight bookings.",
    fields: [
      { fieldType: "amount", fieldName: "Amount", isRequired: true, addToPolicyRules: true, config: { minValue: 0, useAsClaimAmount: true } },
      { fieldType: "date", fieldName: "Journey Date", isRequired: true, addToPolicyRules: true, config: { useAsExpenseDate: true } },
      {
        fieldType: "small_text",
        fieldName: "Ticket/Invoice Number",
        isRequired: false,
        addToPolicyRules: false,
        config: { minLength: 1, maxLength: 50, useAsInvoiceNumber: true },
      },
      { fieldType: "list", fieldName: "Airline", isRequired: false, addToPolicyRules: false, config: { valuesListKey: "airlines" } },
      { fieldType: "city_list", fieldName: "Destination City", isRequired: false, addToPolicyRules: false, config: { allowMultiSelect: false } },
    ],
  },
  {
    name: "Domestic Hotel",
    description: "Hotel stays within the country.",
    fields: [
      { fieldType: "number", fieldName: "Number of Nights", isRequired: true, addToPolicyRules: false, config: { minValue: 1 } },
      { fieldType: "number", fieldName: "Rate Per Night", isRequired: true, addToPolicyRules: false, config: { minValue: 0 } },
      {
        fieldType: "amount",
        fieldName: "Amount",
        isRequired: true,
        addToPolicyRules: true,
        config: { formula: "{{Number of Nights}} * {{Rate Per Night}}", useAsClaimAmount: true },
      },
      { fieldType: "date", fieldName: "Check-In Date", isRequired: true, addToPolicyRules: true, config: { useAsExpenseDate: true } },
      {
        fieldType: "small_text",
        fieldName: "Invoice Number",
        isRequired: false,
        addToPolicyRules: false,
        config: { minLength: 1, maxLength: 50, useAsInvoiceNumber: true },
      },
      { fieldType: "small_text", fieldName: "Hotel Name", isRequired: false, addToPolicyRules: false, config: { minLength: 2, maxLength: 100 } },
      { fieldType: "city_list", fieldName: "City", isRequired: false, addToPolicyRules: false, config: { allowMultiSelect: false } },
    ],
  },
  {
    name: "Fuel/Local Conveyance",
    description: "Fuel, mileage, and local travel — no invoice/bill number concept, so duplicate detection doesn't run for this category.",
    fields: [
      { fieldType: "amount", fieldName: "Amount", isRequired: true, addToPolicyRules: true, config: { minValue: 0, useAsClaimAmount: true } },
      { fieldType: "date", fieldName: "Expense Date", isRequired: true, addToPolicyRules: true, config: { useAsExpenseDate: true } },
      { fieldType: "small_text", fieldName: "Purpose/Route", isRequired: false, addToPolicyRules: false, config: { minLength: 2, maxLength: 200 } },
    ],
  },
];

// This backfill needs the full list of Organization ids, but `Organization`
// moved to auth-service's own database in Phase 3 (docs/PLANS/microservices-plan.md)
// — a real cross-service dependency baked into what's otherwise a one-time
// migration. Rather than skip the backfill or hardcode ids, this opens a
// second, throwaway `pg` connection directly to auth-service's database
// (env-configurable, defaulting to the local docker-compose `postgres-auth`
// service) just to read organization ids, then writes to claim-service's own
// `categories`/`category_fields` tables via the normal `queryInterface`
// exactly as before. This is a one-off migration-time read, not a runtime
// dependency — nothing else in claim-service opens a direct DB connection to
// another service.
const { Client } = require("pg");

async function fetchOrganizationIds() {
  const client = new Client({
    host: process.env.AUTH_DB_HOST || "localhost",
    port: Number(process.env.AUTH_DB_PORT || 5433),
    database: process.env.AUTH_DB_NAME || "auth_service",
    user: process.env.AUTH_DB_USER || "postgres",
    password: process.env.AUTH_DB_PASSWORD || "postgres",
  });
  await client.connect();
  try {
    const result = await client.query('SELECT id FROM "organizations"');
    return result.rows;
  } finally {
    await client.end();
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const organizations = await fetchOrganizationIds();
    const now = new Date();

    for (const organization of organizations) {
      for (const definition of CATEGORY_DEFINITIONS) {
        const existing = await queryInterface.sequelize.query(
          'SELECT id FROM "categories" WHERE "organizationId" = :organizationId AND LOWER(name) = LOWER(:name)',
          { replacements: { organizationId: organization.id, name: definition.name }, type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        if (existing.length > 0) continue;

        const [category] = await queryInterface.bulkInsert(
          "categories",
          [
            {
              organizationId: organization.id,
              name: definition.name,
              description: definition.description,
              status: "active",
              isEnabled: true,
              enableProjectPolicies: false,
              createdBy: null,
              updatedBy: null,
              createdAt: now,
              updatedAt: now,
            },
          ],
          { returning: true }
        );

        await queryInterface.bulkInsert(
          "category_fields",
          definition.fields.map((field, position) => ({
            categoryId: category.id,
            fieldType: field.fieldType,
            fieldName: field.fieldName,
            tooltip: null,
            isRequired: field.isRequired,
            addToPolicyRules: field.addToPolicyRules,
            position,
            config: JSON.stringify(field.config ?? {}),
            conditionalVisibility: null,
            redFlagMode: field.redFlagMode ?? null,
            redFlagValue: field.redFlagValue ?? null,
            redFlagAction: field.redFlagAction ?? null,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }
    }
  },

  async down(queryInterface) {
    const names = CATEGORY_DEFINITIONS.map((definition) => definition.name);
    const categories = await queryInterface.sequelize.query('SELECT id FROM "categories" WHERE name IN (:names)', {
      replacements: { names },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });
    const categoryIds = categories.map((category) => category.id);
    if (categoryIds.length === 0) return;
    await queryInterface.bulkDelete("category_fields", { categoryId: categoryIds });
    await queryInterface.bulkDelete("categories", { id: categoryIds });
  },
};
