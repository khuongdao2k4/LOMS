"use strict";

module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define(
    "Event",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      schedule_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: "Liên kết schedule cha (nếu là bản sao từ weekly)",
      },
      channel_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      start_at: {
        type: DataTypes.DATE, // ✅ Giữ nguyên DataTypes.DATE
        allowNull: false,
        comment: "Thời gian bắt đầu thật (1 ngày cụ thể)",
      },
      end_at: {
        type: DataTypes.DATE, // ✅ Giữ nguyên DataTypes.DATE
        allowNull: false,
      },
      revenue_enabled: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      is_active: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "events",
      timestamps: false,
      underscored: true,
      timezone: "+00:00", // ✅ QUAN TRỌNG: Force UTC
      indexes: [
        {
          name: "idx_event_channel",
          fields: ["channel_id"],
        },
        {
          name: "idx_event_time",
          fields: ["start_at", "end_at"],
        },
        {
          name: "idx_event_active",
          fields: ["is_active"],
        },
      ],
    }
  );

  Event.associate = function (models) {
    Event.belongsTo(models.Schedule, {
      foreignKey: "schedule_id",
      as: "schedule",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    Event.belongsTo(models.Channel, {
      foreignKey: "channel_id",
      as: "channel",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Event.belongsToMany(models.Employee, {
      through: models.EventMember,
      foreignKey: "event_id",
      otherKey: "employee_id",
      as: "employees",
    });
    Event.hasMany(models.EventMember, {
      foreignKey: "event_id",
      as: "members",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Event.hasMany(models.Session, {
      foreignKey: "event_id",
      as: "sessions",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  };

  return Event;
};
