'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auth_sessions', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      account_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      refresh_token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      is_revoked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      replaced_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'auth_sessions', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('auth_sessions', ['account_id']);
    await queryInterface.addIndex('auth_sessions', ['is_revoked']);
    await queryInterface.addIndex('auth_sessions', ['expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auth_sessions');
  }
};
