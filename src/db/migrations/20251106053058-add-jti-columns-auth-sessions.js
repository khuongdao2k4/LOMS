'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Mô tả bảng để kiểm tra tồn tại cột
    const table = await queryInterface.describeTable('auth_sessions');

    if (!table.jti_access) {
      await queryInterface.addColumn('auth_sessions', 'jti_access', {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'JTI của access token hiện hành trong phiên này',
      });
    }

    if (!table.jti_refresh) {
      await queryInterface.addColumn('auth_sessions', 'jti_refresh', {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'JTI của refresh token hiện hành trong phiên này',
      });
    }

    // Index: đặt tên tường minh để dễ remove/trace sau này
    // Lưu ý: nếu đã có thì removeIndex sẽ fail —> bọc try/catch khi down
    await queryInterface.addIndex('auth_sessions', ['account_id', 'jti_access', 'is_revoked'], {
      name: 'idx_auth_sessions_account_jti_revoked',
    });
    await queryInterface.addIndex('auth_sessions', ['expires_at'], {
      name: 'idx_auth_sessions_expires_at',
    });
  },

  async down(queryInterface) {
    // An toàn khi rollback: bọc try/catch để không vỡ nếu index/column đã bị sửa tay trước đó
    try { await queryInterface.removeIndex('auth_sessions', 'idx_auth_sessions_account_jti_revoked'); } catch {}
    try { await queryInterface.removeIndex('auth_sessions', 'idx_auth_sessions_expires_at'); } catch {}

    // describe lại để chỉ xoá nếu đang tồn tại
    const table = await queryInterface.describeTable('auth_sessions');
    if (table.jti_access)  { try { await queryInterface.removeColumn('auth_sessions', 'jti_access'); } catch {} }
    if (table.jti_refresh) { try { await queryInterface.removeColumn('auth_sessions', 'jti_refresh'); } catch {} }
  }
};
