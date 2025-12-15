"use strict";

module.exports = (sequelize, DataTypes) => {
  const AutomationSetting = sequelize.define(
    "AutomationSetting",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      screenshot_interval_min: { type: DataTypes.INTEGER, defaultValue: 10 },
    },
    {
      tableName: "automation_settings",
      timestamps: true,
      underscored: true,
    }
  );

  return AutomationSetting;
};
