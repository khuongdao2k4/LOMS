'use strict';

module.exports = {
  async up(queryInterface) {
    // UNIQUE INDEX cho employee_id (mỗi nhân viên chỉ có 1 cấu hình)
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'uk_sal_cfg_emp'
        ) THEN
          CREATE UNIQUE INDEX uk_sal_cfg_emp ON salary_configs (employee_id);
        END IF;
      END$$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uk_sal_cfg_emp;
    `);
  }
};
