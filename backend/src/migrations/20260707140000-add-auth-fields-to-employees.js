"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("employees", "passwordHash", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("employees", "emailVerifiedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("employees", "mobileVerifiedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("employees", "isOwner", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Self-registration (see registration.controller.ts) collects far less than
    // the admin-invite wizard does — no title/gender/contact number upfront, and
    // there's no inviting admin to record as createdBy/updatedBy. These columns
    // stay required for admin-created rows (enforced in application code, same
    // as today), but the DB constraint has to allow null for self-registered ones.
    await queryInterface.changeColumn("employees", "title", { type: Sequelize.STRING, allowNull: true });
    await queryInterface.changeColumn("employees", "gender", { type: Sequelize.STRING, allowNull: true });
    await queryInterface.changeColumn("employees", "countryCode", { type: Sequelize.STRING, allowNull: true });
    await queryInterface.changeColumn("employees", "contactNumber", { type: Sequelize.STRING, allowNull: true });
    await queryInterface.changeColumn("employees", "createdBy", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.changeColumn("employees", "updatedBy", { type: Sequelize.INTEGER, allowNull: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("employees", "updatedBy", { type: Sequelize.INTEGER, allowNull: false });
    await queryInterface.changeColumn("employees", "createdBy", { type: Sequelize.INTEGER, allowNull: false });
    await queryInterface.changeColumn("employees", "contactNumber", { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn("employees", "countryCode", { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn("employees", "gender", { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn("employees", "title", { type: Sequelize.STRING, allowNull: false });

    await queryInterface.removeColumn("employees", "isOwner");
    await queryInterface.removeColumn("employees", "mobileVerifiedAt");
    await queryInterface.removeColumn("employees", "emailVerifiedAt");
    await queryInterface.removeColumn("employees", "passwordHash");
  },
};
