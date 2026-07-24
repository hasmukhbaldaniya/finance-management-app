"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("otps", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      purpose: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      identifier: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      otpHash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      consumedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex("otps", ["purpose", "identifier"]);

    await queryInterface.sequelize.query(`
      INSERT INTO "otps" ("purpose", "identifier", "otpHash", "expiresAt", "verifiedAt", "consumedAt", "attempts", "createdAt", "updatedAt")
      SELECT 'password_reset', "email", "otpHash", "expiresAt", "verifiedAt", "consumedAt", "attempts", "createdAt", "updatedAt"
      FROM "password_reset_otps"
    `);

    await queryInterface.dropTable("password_reset_otps");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable("password_reset_otps", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      otpHash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      consumedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex("password_reset_otps", ["email"]);

    await queryInterface.sequelize.query(`
      INSERT INTO "password_reset_otps" ("email", "otpHash", "expiresAt", "verifiedAt", "consumedAt", "attempts", "createdAt", "updatedAt")
      SELECT "identifier", "otpHash", "expiresAt", "verifiedAt", "consumedAt", "attempts", "createdAt", "updatedAt"
      FROM "otps"
      WHERE "purpose" = 'password_reset'
    `);

    await queryInterface.dropTable("otps");
  },
};
