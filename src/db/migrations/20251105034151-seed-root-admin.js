'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const username = process.env.ADMIN_USERNAME || 'admin1';
    const rawPass  = process.env.ADMIN_PASSWORD || 'admin123';

    // đảm bảo 2 role tồn tại
    await queryInterface.sequelize.query(`
      INSERT INTO roles(code, name)
      VALUES ('ADMIN','Administrator'), ('EMPLOYEE','Employee')
      ON CONFLICT (code) DO NOTHING;
    `);

    // tạo hoặc cập nhật account admin
    const hash = await bcrypt.hash(rawPass, 10);
    const [adminRow] = await queryInterface.sequelize.query(
      `
      INSERT INTO accounts(username, password_hash, is_active, created_at, updated_at)
      VALUES ($1, $2, true, NOW(), NOW())
      ON CONFLICT (username)
      DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true, updated_at = NOW()
      RETURNING id;
      `,
      { bind: [username, hash], type: queryInterface.sequelize.QueryTypes.INSERT }
    );

    // Lấy id account vừa (tạo/cập nhật)
    // Trên Postgres, với RETURNING id, adminRow[0].id là id.
    const adminId = adminRow && adminRow[0] ? adminRow[0].id : adminRow.id || adminRow[0]?.id;

    // gán vai trò ADMIN cho account
    await queryInterface.sequelize.query(
      `
      INSERT INTO account_roles(account_id, role_id)
      SELECT $1, r.id FROM roles r WHERE r.code = 'ADMIN'
      ON CONFLICT (account_id, role_id) DO NOTHING;
      `,
      { bind: [adminId] }
    );
  },

  async down(queryInterface) {
    // Không xóa admin để an toàn; nếu thật sự cần:
    // await queryInterface.sequelize.query(`DELETE FROM account_roles ar USING accounts a, roles r
    //   WHERE ar.account_id=a.id AND ar.role_id=r.id AND a.username=$1 AND r.code='ADMIN'`, { bind: [process.env.ADMIN_USERNAME || 'admin1'] });
    // await queryInterface.sequelize.query(`DELETE FROM accounts WHERE username=$1`, { bind: [process.env.ADMIN_USERNAME || 'admin1'] });
  }
};
