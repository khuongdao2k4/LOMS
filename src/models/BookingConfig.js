"use strict";

module.exports = (sequelize, DataTypes) => {
  const BookingConfig = sequelize.define(
    "BookingConfig",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      channel_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
      },

      public_token: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },

      min_duration_minutes: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 15,
      },

      max_duration_minutes: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 240,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
    },
    {
      tableName: "booking_configs",
      modelName: "BookingConfig",
      underscored: true,
      timestamps: true,
    }
  );

  BookingConfig.associate = (models) => {
    BookingConfig.belongsTo(models.Channel, {
      foreignKey: "channel_id",
      as: "channel",
    });
    BookingConfig.hasMany(models.BookingConfigSlot, {
      foreignKey: "booking_config_id",
      as: "slots",
    });
    BookingConfig.hasMany(models.Booking, {
      foreignKey: "booking_config_id",
      as: "bookings",
    });
  };

  return BookingConfig;
};
