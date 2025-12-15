"use strict";

module.exports = (sequelize, DataTypes) => {
  const SalaryConfig = sequelize.define(
    "SalaryConfig",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true, // 1 nhân viên chỉ có 1 cấu hình lương
      },

      base_salary: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },

      hourly_rate_live: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },

      hourly_rate_support: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      // KHÔNG có updated_at, KHÔNG có is_active
    },
    {
      tableName: "salary_configs",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  SalaryConfig.associate = (models) => {
    if (models.Employee) {
      SalaryConfig.belongsTo(models.Employee, {
        foreignKey: "employee_id",
        as: "employee",
      });
    }
  };

  return SalaryConfig;
};
