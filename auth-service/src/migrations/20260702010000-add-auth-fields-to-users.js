"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "phone", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn("users", "passwordHash", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    });
    await queryInterface.changeColumn("users", "passwordHash", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "passwordHash");
    await queryInterface.removeColumn("users", "phone");
  },
};
