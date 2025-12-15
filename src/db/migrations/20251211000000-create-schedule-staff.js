 "use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("schedule_staff", {
      schedule_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "schedules",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      employee_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "employees",
          key: "id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      role: {
        type: Sequelize.ENUM("LIVE", "SUPPORT"),
        allowNull: false,
      },
      priority: {
        type: Sequelize.SMALLINT,
        allowNull: true,
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("schedule_staff");
  },
};
