"use strict";

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    // Bỏ GENERATED để có thể cập nhật thủ công
    await sequelize.query(`
      ALTER TABLE sessions
        ALTER COLUMN total_seconds DROP EXPRESSION,
        ALTER COLUMN total_hours DROP EXPRESSION,
        ALTER COLUMN revenue_total DROP EXPRESSION;
    `);
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    // Khôi phục GENERATED như ban đầu
    await sequelize.query(`
      ALTER TABLE sessions
        ALTER COLUMN total_seconds ADD GENERATED ALWAYS AS (
          CASE WHEN actual_end_at IS NULL OR actual_start_at IS NULL THEN NULL
               ELSE CAST(EXTRACT(EPOCH FROM (actual_end_at - actual_start_at)) AS INT)
          END
        ) STORED,
        ALTER COLUMN total_hours ADD GENERATED ALWAYS AS (
          CASE WHEN actual_end_at IS NULL OR actual_start_at IS NULL THEN NULL
               ELSE ROUND(EXTRACT(EPOCH FROM (actual_end_at - actual_start_at)) / 3600.0, 2)
          END
        ) STORED,
        ALTER COLUMN revenue_total ADD GENERATED ALWAYS AS (
          CASE WHEN revenue_start IS NULL OR revenue_end IS NULL THEN NULL
               ELSE (revenue_end - revenue_start)
          END
        ) STORED;
    `);
  },
};
