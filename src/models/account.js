'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Account extends Model {
    static associate(models) {
      // Nhiều-nhiều qua bảng nối account_roles
      Account.belongsToMany(models.Role, {
        through: models.AccountRole,
        foreignKey: 'account_id',
        otherKey: 'role_id',
        as: 'roles',
      });

      // Nếu bạn có bảng employees(account_id) → 1-1
      if (models.Employee) {
        Account.hasOne(models.Employee, {
          foreignKey: 'account_id',
          as: 'employee',
        });
      }
    }
  }

  Account.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      username: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'Account',
      tableName: 'accounts',
      timestamps: false, // tránh yêu cầu updatedAt/createdAt nếu bảng không có
    }
  );

  return Account;
};
