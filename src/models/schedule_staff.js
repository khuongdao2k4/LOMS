"use strict";

module.exports = (sequelize, DataTypes) => {
  const ScheduleStaff = sequelize.define(
    "ScheduleStaff",
    {
      schedule_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
      },
      employee_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("LIVE", "SUPPORT"),
        allowNull: false,
      },
      priority: {
        type: DataTypes.TINYINT,
        allowNull: true,
      },
      is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "schedule_staff",
      timestamps: false,
      underscored: true,
    }
  );

  ScheduleStaff.associate = function (models) {
    ScheduleStaff.belongsTo(models.Schedule, {
      foreignKey: "schedule_id",
      as: "schedule",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    ScheduleStaff.belongsTo(models.Employee, {
      foreignKey: "employee_id",
      as: "employee",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return ScheduleStaff;
};
