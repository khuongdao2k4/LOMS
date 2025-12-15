"use strict";

module.exports = (sequelize, DataTypes) => {
  const BookingConfigSlot = sequelize.define(
    "BookingConfigSlot",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      booking_config_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      weekday: {
        type: DataTypes.SMALLINT,
        allowNull: false,
      },

      start_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },

      end_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
    },
    {
      tableName: "booking_config_slots",
      modelName: "BookingConfigSlot",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );

  BookingConfigSlot.associate = (models) => {
    BookingConfigSlot.belongsTo(models.BookingConfig, {
      foreignKey: "booking_config_id",
      as: "config",
    });
  };

  return BookingConfigSlot;
};
