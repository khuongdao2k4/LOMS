'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AccountRole extends Model {
    static associate() {}
  }

  AccountRole.init(
    {
      account_id: { type: DataTypes.BIGINT, primaryKey: true },
      role_id: { type: DataTypes.INTEGER, primaryKey: true },
    },
    {
      sequelize,
      modelName: 'AccountRole',
      tableName: 'account_roles',
      timestamps: false,
    }
  );

  return AccountRole;
};
