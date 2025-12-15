"use strict";

module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define(
    "Booking",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      channel_id: { type: DataTypes.BIGINT, allowNull: false },

      booking_config_id: { type: DataTypes.BIGINT, allowNull: true },

      start_at: { type: DataTypes.DATE, allowNull: false },

      end_at: { type: DataTypes.DATE, allowNull: false },

      status: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING",
      },

      full_name: { type: DataTypes.STRING(150), allowNull: false },

      phone: { type: DataTypes.STRING(30), allowNull: false },

      note: { type: DataTypes.TEXT, allowNull: true },

      booking_token: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      tableName: "bookings",
      modelName: "Booking",
      underscored: true,
      timestamps: true,
    }
  );

  Booking.associate = (models) => {
    Booking.belongsTo(models.Channel, {
      foreignKey: "channel_id",
      as: "channel",
    });

    Booking.belongsTo(models.BookingConfig, {
      foreignKey: "booking_config_id",
      as: "config",
    });

    Booking.hasMany(models.BookingStatusLog, {
      foreignKey: "booking_id",
      as: "statusLogs",
    });
  };

  return Booking;
};
