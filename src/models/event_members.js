"use strict";

module.exports = (sequelize, DataTypes) => {
  const EventMember = sequelize.define(
    "EventMember",
    {
      event_id: {
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
      tableName: "event_members",
      timestamps: false,
      underscored: true,
    }
  );

  EventMember.associate = function (models) {
    EventMember.belongsTo(models.Event, {
      foreignKey: "event_id",
      as: "event",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Relationship với Employee
    EventMember.belongsTo(models.Employee, {
      foreignKey: "employee_id",
      as: "employee",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return EventMember;
};
