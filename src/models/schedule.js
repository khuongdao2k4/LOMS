"use strict";
module.exports = (sequelize, DataTypes) => {
  const Schedule = sequelize.define(
    "Schedule",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      channel_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      weekdays_mask: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
      },
      start_at: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      end_at: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      is_active: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      created_by: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },
    {
      tableName: "schedules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Schedule.associate = function (models) {
    Schedule.belongsTo(models.Channel, {
      foreignKey: "channel_id",
      as: "channel",
    });
    Schedule.belongsTo(models.Account, {
      foreignKey: "created_by",
      as: "creator",
    });
    Schedule.hasMany(models.ScheduleStaff, {
      foreignKey: "schedule_id",
      as: "staff",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Schedule;
};
