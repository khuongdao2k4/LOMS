'use strict';

module.exports = (sequelize, DataTypes) => {
  const Channel = sequelize.define('Channel', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tiktok_channel_id: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('NOW()') },
  }, {
    tableName: 'channels',
    modelName: 'Channel',
    timestamps: false,      // bảng chỉ có created_at
    underscored: true,
  });

  Channel.associate = () => {};
  return Channel;
};
