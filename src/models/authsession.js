'use strict';
module.exports = (sequelize, DataTypes) => {
  const AuthSession = sequelize.define('AuthSession', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    account_id: { type: DataTypes.BIGINT, allowNull: false },
    refresh_token_hash: { type: DataTypes.STRING(255), allowNull: false },
    user_agent: { type: DataTypes.STRING(500) },
    ip_address: { type: DataTypes.STRING(100) },
    is_revoked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    revoked_at: { type: DataTypes.DATE },
    replaced_by: { type: DataTypes.BIGINT },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('NOW()') },

    // NEW:
    jti_access: { type: DataTypes.STRING(64) },
    jti_refresh:{ type: DataTypes.STRING(64) },
  }, {
    tableName: 'auth_sessions',
    modelName: 'AuthSession',
    timestamps: false,
    underscored: true
  });

  AuthSession.associate = (models) => {
    AuthSession.belongsTo(models.Account, { foreignKey: 'account_id', as: 'account' });
    AuthSession.belongsTo(models.AuthSession, { foreignKey: 'replaced_by', as: 'replacedBy' });
  };

  return AuthSession;
};
