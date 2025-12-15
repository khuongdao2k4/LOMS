// src/db/migrations/20251110024718-create-channels.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Skip if table already exists (migrate idempotent khi schema da tao truoc)
    const [{ exists }] = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.channels') IS NOT NULL AS "exists";`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (exists) return;

    await queryInterface.createTable('channels', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      tiktok_channel_id: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },
  // Down intentionally no-op to tranh drop table khi co FK tu cac bang khac.
  async down() {}
};
