"use strict";

module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define(
    "Session",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      event_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      schedule_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      channel_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      start_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revenue_enabled_snap: {
        type: DataTypes.SMALLINT, // ✅ SỬA: TINYINT → SMALLINT
        allowNull: false,
        defaultValue: 1,
      },
      is_active: {
        type: DataTypes.SMALLINT, // ✅ SỬA: TINYINT → SMALLINT
        allowNull: false,
        defaultValue: 1,
      },
      actual_start_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      actual_end_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      total_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      total_hours: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      revenue_start: {
        type: DataTypes.DECIMAL(16, 2),
        allowNull: true,
      },
      revenue_end: {
        type: DataTypes.DECIMAL(16, 2),
        allowNull: true,
      },
      revenue_total: {
        type: DataTypes.DECIMAL(16, 2),
        allowNull: true,
      },
      screenshot_url: {
        type: DataTypes.STRING(700),
        allowNull: true,
      },
      screenshot_start_url: {
        type: DataTypes.STRING(700),
        allowNull: true,
      },
      screenshot_end_url: {
        type: DataTypes.STRING(700),
        allowNull: true,
      },
      late_flag: {
        type: DataTypes.SMALLINT, // ✅ SỬA: BOOLEAN → SMALLINT (nếu DB là SMALLINT)
        allowNull: true,
        defaultValue: 0, // ✅ SỬA: false → 0
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "ENDED", "FORCE_CLOSED"),
        defaultValue: "ACTIVE",
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
      tableName: "sessions",
      timestamps: false,
      underscored: true,
    }
  );

  Session.associate = function (models) {
    Session.belongsTo(models.Channel, {
      foreignKey: "channel_id",
      as: "channel",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Session.belongsTo(models.Event, {
      foreignKey: "event_id",
      as: "event",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    Session.belongsTo(models.Schedule, {
      foreignKey: "schedule_id",
      as: "schedule",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    Session.hasMany(models.SessionStaff, {
      foreignKey: "session_id",
      as: "staff",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Session;
};
