// models/salaryReport.model.js
module.exports = (sequelize, DataTypes) => {
    const SalaryReport = sequelize.define(
      "SalaryReport",
      {
        id: {
          type: DataTypes.BIGINT,
          primaryKey: true,
          autoIncrement: true,
        },
        employee_id: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        month: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: { min: 1, max: 12 }, // tương ứng CHECK constraint
        },
        year: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        total_hours_live: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
        },
        total_hours_support: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
        },
        total_revenue: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true,
        },
        total_salary: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        tableName: "salary_reports",
        timestamps: false,
        indexes: [
          {
            unique: true,
            fields: ["employee_id", "year", "month"],
            name: "uk_sal_rpt_emp_month",
          },
          {
            fields: ["year", "month"],
            name: "idx_sal_rpt_period",
          },
        ],
      }
    );
  
    SalaryReport.associate = (models) => {
      SalaryReport.belongsTo(models.Employee, {
        foreignKey: "employee_id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    };
  
    return SalaryReport;
  };
  