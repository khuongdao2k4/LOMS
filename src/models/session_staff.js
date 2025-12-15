// models/session_staff.model.js
"use strict";
module.exports = (sequelize, DataTypes) => {
  const SessionStaff = sequelize.define(
    "SessionStaff",
    {
      session_id: { type: DataTypes.BIGINT, primaryKey: true },
      employee_id: { type: DataTypes.BIGINT, primaryKey: true },
      role: { type: DataTypes.ENUM("LIVE", "SUPPORT"), primaryKey: true },
    },
    { tableName: "session_staff", timestamps: false, underscored: true }
  );
`     
`
  SessionStaff.associate = function (models) {
    SessionStaff.belongsTo(models.Session, { foreignKey: "session_id" });
    SessionStaff.belongsTo(models.Employee, { foreignKey: "employee_id" });
  };

  return SessionStaff;
};
