"use strict";

module.exports = (sequelize, DataTypes) => {
  const BookingStatusLog = sequelize.define(
    "BookingStatusLog",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      booking_id: { type: DataTypes.BIGINT, allowNull: false },

      status: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "CANCELLED"),
        allowNull: false,
      },

      note: { type: DataTypes.TEXT, allowNull: true },

      created_by: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      tableName: "booking_status_logs",
      modelName: "BookingStatusLog",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );

  BookingStatusLog.associate = (models) => {
    BookingStatusLog.belongsTo(models.Booking, {
      foreignKey: "booking_id",
      as: "booking",
    });

    BookingStatusLog.belongsTo(models.Account, {
      foreignKey: "created_by",
      as: "creator",
    });
  };

  return BookingStatusLog;
};
