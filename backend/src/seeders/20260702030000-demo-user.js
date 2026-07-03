"use strict";

const bcrypt = require("bcryptjs");

const DEMO_PASSWORD = "Passw0rd!";

/** @type {import('sequelize-cli').Seed} */
module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const now = new Date();

    await queryInterface.bulkInsert("users", [
      {
        name: "Demo User",
        email: "demo@example.com",
        phone: "9876543210",
        passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", { email: "demo@example.com" });
  },
};
