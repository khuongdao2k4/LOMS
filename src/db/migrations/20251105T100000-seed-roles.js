'use strict';

module.exports = {
  async up(queryInterface) {
    // INSERT idempotent: nếu code đã tồn tại thì bỏ qua
    await queryInterface.sequelize.query(`
      INSERT INTO roles (code, name)
      VALUES ('ADMIN', 'Administrator'), ('EMPLOYEE', 'Employee')
      ON CONFLICT (code) DO NOTHING;
    `);
  },

  async down(queryInterface) {
    // Có thể không xóa để tránh mất role hệ thống
    await queryInterface.sequelize.query(`
      DELETE FROM roles WHERE code IN ('ADMIN', 'EMPLOYEE');
    `);
  }
};
