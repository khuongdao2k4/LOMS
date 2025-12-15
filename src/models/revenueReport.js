// src/models/revenue_report.model.js
module.exports = (sequelize, DataTypes) => {
  const RevenueReport = sequelize.define(
    "RevenueReport",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      total_revenue: {
        type: DataTypes.DECIMAL(16, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_hours: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      type: {
        type: DataTypes.ENUM("EMPLOYEE", "CHANNEL", "NETWORK"),
        allowNull: false,
        comment: "NETWORK = system-wide, CHANNEL = per channel",
      },
      section: {
        type: DataTypes.ENUM("DAILY", "MONTHLY", "YEARLY"),
        allowNull: false,
      },
      value_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment:
          "channel_id when type=CHANNEL, employee_id when type=EMPLOYEE, null when type=NETWORK",
      },
      date_value: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: "Date of the report (YYYY-MM-DD)",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "revenue_reports",
      timestamps: false,
      indexes: [
        {
          fields: ["type", "section"],
          name: "idx_rev_type_section",
        },
        {
          fields: ["value_id", "date_value"],
          name: "idx_rev_value_date",
        },
        {
          unique: true,
          fields: ["type", "section", "value_id", "date_value"],
          name: "uk_rev_unique",
        },
      ],
    }
  );

  RevenueReport.associate = (models) => {
    // Association with Channel (khong scope theo type vi bang channels khong co cot type)
    RevenueReport.belongsTo(models.Channel, {
      foreignKey: "value_id",
      as: "channel",
      constraints: false,
    });
  };

  return RevenueReport;
};
