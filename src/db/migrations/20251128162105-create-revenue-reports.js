"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tạo bảng (createTable an toàn vì nó chưa tồn tại hoặc bị lỗi)
    await queryInterface.createTable("revenue_reports", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      total_revenue: {
        type: Sequelize.DECIMAL(16, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_hours: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      type: {
        type: Sequelize.ENUM("EMPLOYEE", "CHANNEL", "NETWORK"),
        allowNull: false,
        comment: "NETWORK = system-wide, CHANNEL = per channel",
      },
      section: {
        type: Sequelize.ENUM("DAILY", "MONTHLY", "YEARLY"),
        allowNull: false,
      },
      value_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment:
          "channel_id when type=CHANNEL, employee_id when type=EMPLOYEE, null when type=NETWORK",
      },
      date_value: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: "Date of the report (YYYY-MM-DD)",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // 2. Thêm indexes (BỌC TRONG TRY/CATCH ĐỂ XỬ LÝ LỖI 'ALREADY EXISTS')
    
    // Index 1: idx_rev_type_section (Gây lỗi)
    try {
      await queryInterface.addIndex("revenue_reports", ["type", "section"], {
        name: "idx_rev_type_section",
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
      // Bỏ qua lỗi nếu index đã tồn tại
    }


    // Index 2: idx_rev_value_date
    try {
      await queryInterface.addIndex(
        "revenue_reports",
        ["value_id", "date_value"],
        {
          name: "idx_rev_value_date",
        }
      );
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('unique constraint')) throw error;
      // Bỏ qua lỗi nếu index đã tồn tại
    }


    // Index 3: uk_rev_unique (UNIQUE constraint)
    try {
      await queryInterface.addIndex(
        "revenue_reports",
        ["type", "section", "value_id", "date_value"],
        {
          unique: true,
          name: "uk_rev_unique",
        }
      );
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('unique constraint')) throw error;
      // Bỏ qua lỗi nếu unique constraint đã tồn tại
    }


    // 3. Thêm foreign key constraint cho Channel
    // Khối này đã có try/catch nên an toàn.
    try {
      await queryInterface.addConstraint("revenue_reports", {
        fields: ["value_id"],
        type: "foreign key",
        name: "fk_rev_report_channel",
        references: {
          table: "channels",
          field: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    } catch (error) {
      console.log(
        "Warning: Could not add foreign key constraint. Make sure channels table exists."
      );
    }
  },

  async down(queryInterface) {
    // Xóa constraint trước khi xóa bảng
    try {
      await queryInterface.removeConstraint(
        "revenue_reports",
        "fk_rev_report_channel"
      );
    } catch (error) {
      // Ignore if constraint doesn't exist
    }

    // Xóa bảng
    await queryInterface.dropTable("revenue_reports");
  },
};