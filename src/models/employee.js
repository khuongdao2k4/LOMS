'use strict';

module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define('Employee', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    full_name: { type: DataTypes.STRING(255), allowNull: false },
    gender: { type: DataTypes.ENUM('MALE','FEMALE','OTHER'), allowNull: false },
    date_of_birth: { type: DataTypes.DATEONLY, allowNull: false },
    hometown: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    cccd: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    portrait_url: { type: DataTypes.TEXT, allowNull: false },
    join_date: { type: DataTypes.DATEONLY, allowNull: false },
    telegram_id: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    account_id: { type: DataTypes.BIGINT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    // các trường bạn đã thêm
    experience: { type: DataTypes.STRING, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'employees',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Employee.associate = (models) => {
    // 1-1: Employee -> SalaryConfig
    // alias phải là 'salaryConfig' để match include trong service
    if (models.SalaryConfig) {
      Employee.hasOne(models.SalaryConfig, {
        as: 'salaryConfig',
        foreignKey: 'employee_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  };

  return Employee;
};
