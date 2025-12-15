"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Thêm cột lưu ảnh bắt đầu và kết thúc ca
    await queryInterface.addColumn("sessions", "screenshot_start_url", {
      type: Sequelize.STRING(700),
      allowNull: true,
    });

    await queryInterface.addColumn("sessions", "screenshot_end_url", {
      type: Sequelize.STRING(700),
      allowNull: true,
    });

    // Backfill: copy ảnh cũ (screenshot_url) sang ảnh bắt đầu nếu đang có dữ liệu
    await queryInterface.sequelize.query(`
      UPDATE sessions
      SET screenshot_start_url = screenshot_url
      WHERE screenshot_start_url IS NULL AND screenshot_url IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("sessions", "screenshot_start_url");
    await queryInterface.removeColumn("sessions", "screenshot_end_url");
  },
};
