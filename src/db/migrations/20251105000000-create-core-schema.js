'use strict';

/**
 * Tao toan bo schema nen tang cho backend (Postgres) theo dac ta (chuyen doi tu script MySQL).
 * Dung CREATE TABLE IF NOT EXISTS de an toan khi migrate tren DB da co mot phan bang.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    // Function chung: auto-update updated_at (thay cho ON UPDATE CURRENT_TIMESTAMP trong MySQL)
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 1. accounts
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id              BIGSERIAL PRIMARY KEY,
        username        VARCHAR(100) NOT NULL UNIQUE,
        password_hash   VARCHAR(255) NOT NULL,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_accounts_updated_at') THEN
          CREATE TRIGGER trg_accounts_updated_at
          BEFORE UPDATE ON accounts
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END$$;
    `);

    // 2. roles
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id     SERIAL PRIMARY KEY,
        code   VARCHAR(50) NOT NULL UNIQUE,
        name   VARCHAR(100) NOT NULL
      );
    `);

    // 3. account_roles (n-n)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS account_roles (
        account_id  BIGINT NOT NULL,
        role_id     INT NOT NULL,
        PRIMARY KEY (account_id, role_id),
        CONSTRAINT fk_acc_roles_acc  FOREIGN KEY (account_id) REFERENCES accounts(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_acc_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // 4. employees
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id               BIGSERIAL PRIMARY KEY,
        full_name        VARCHAR(150) NOT NULL,
        gender           VARCHAR(10) NOT NULL CHECK (gender IN ('MALE','FEMALE','OTHER')),
        date_of_birth    DATE NOT NULL,
        hometown         VARCHAR(255) NOT NULL,
        address          VARCHAR(255) NOT NULL,
        cccd             VARCHAR(20) NOT NULL UNIQUE,
        portrait_url     VARCHAR(500) NOT NULL,
        join_date        DATE NOT NULL,
        telegram_id      VARCHAR(100) NOT NULL UNIQUE,
        experience       VARCHAR(255) NULL,
        note             TEXT NULL,
        account_id       BIGINT NULL,
        is_active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_employees_account FOREIGN KEY (account_id) REFERENCES accounts(id)
          ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);`);
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_employees_updated_at') THEN
          CREATE TRIGGER trg_employees_updated_at
          BEFORE UPDATE ON employees
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END$$;
    `);

    // 5. channels (da co migration truoc do, nhung dam bao ton tai cho cac FK ke tiep)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id                BIGSERIAL PRIMARY KEY,
        tiktok_channel_id VARCHAR(100) NOT NULL UNIQUE,
        name              VARCHAR(150) NOT NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6. schedules
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id              BIGSERIAL PRIMARY KEY,
        channel_id      BIGINT NOT NULL,
        weekdays_mask   SMALLINT NOT NULL,
        start_at        TIME NOT NULL,
        end_at          TIME NOT NULL,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_by      BIGINT NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_sched_time CHECK (start_at < end_at),
        CONSTRAINT fk_sched_channel FOREIGN KEY (channel_id) REFERENCES channels(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_sched_created_by FOREIGN KEY (created_by) REFERENCES accounts(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sched_channel ON schedules(channel_id, is_active);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sched_mask ON schedules(weekdays_mask);`);
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_schedules_updated_at') THEN
          CREATE TRIGGER trg_schedules_updated_at
          BEFORE UPDATE ON schedules
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END$$;
    `);

    // 7. events (ca theo ngay)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS events (
        id              BIGSERIAL PRIMARY KEY,
        schedule_id     BIGINT NULL,
        channel_id      BIGINT NOT NULL,
        start_at        TIMESTAMPTZ NOT NULL,
        end_at          TIMESTAMPTZ NOT NULL,
        revenue_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_event_time CHECK (start_at < end_at),
        CONSTRAINT fk_event_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_event_channel FOREIGN KEY (channel_id) REFERENCES channels(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_event_channel ON events(channel_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_event_time ON events(start_at, end_at);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_event_active ON events(is_active);`);
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_events_updated_at') THEN
          CREATE TRIGGER trg_events_updated_at
          BEFORE UPDATE ON events
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END$$;
    `);

    // 8. event_members (phan cong nhan su cho ca)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS event_members (
        event_id     BIGINT NOT NULL,
        employee_id  BIGINT NOT NULL,
        role         VARCHAR(10) NOT NULL CHECK (role IN ('LIVE','SUPPORT')),
        priority     SMALLINT NULL,
        is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (event_id, employee_id, role),
        CONSTRAINT fk_ev_mem_event FOREIGN KEY (event_id) REFERENCES events(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_ev_mem_emp FOREIGN KEY (employee_id) REFERENCES employees(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ev_mem_role ON event_members(role);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ev_mem_event ON event_members(event_id);`);

    // 9. sessions (phien thuc te)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id                   BIGSERIAL PRIMARY KEY,
        event_id             BIGINT NULL,
        schedule_id          BIGINT NULL,
        channel_id           BIGINT NOT NULL,
        start_at             TIMESTAMPTZ NOT NULL,
        end_at               TIMESTAMPTZ NOT NULL,
        revenue_enabled_snap BOOLEAN NOT NULL DEFAULT TRUE,
        is_active            BOOLEAN NOT NULL DEFAULT TRUE,
        actual_start_at      TIMESTAMPTZ NULL,
        actual_end_at        TIMESTAMPTZ NULL,
        total_seconds        INT GENERATED ALWAYS AS (
          CASE WHEN actual_end_at IS NULL OR actual_start_at IS NULL THEN NULL
               ELSE CAST(EXTRACT(EPOCH FROM (actual_end_at - actual_start_at)) AS INT)
          END
        ) STORED,
        total_hours          DECIMAL(10,2) GENERATED ALWAYS AS (
          CASE WHEN actual_end_at IS NULL OR actual_start_at IS NULL THEN NULL
               ELSE ROUND(EXTRACT(EPOCH FROM (actual_end_at - actual_start_at)) / 3600.0, 2)
          END
        ) STORED,
        revenue_start        DECIMAL(16,2) NULL,
        revenue_end          DECIMAL(16,2) NULL,
        revenue_total        DECIMAL(16,2) GENERATED ALWAYS AS (
          CASE WHEN revenue_start IS NULL OR revenue_end IS NULL THEN NULL
               ELSE (revenue_end - revenue_start)
          END
        ) STORED,
        screenshot_url       VARCHAR(700) NULL,
        late_flag            BOOLEAN NOT NULL DEFAULT FALSE,
        status               VARCHAR(15) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ENDED','FORCE_CLOSED')),
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_sess_event     FOREIGN KEY (event_id)    REFERENCES events(id)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_sess_schedule  FOREIGN KEY (schedule_id) REFERENCES schedules(id)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_sess_channel   FOREIGN KEY (channel_id)  REFERENCES channels(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sess_channel_time ON sessions(channel_id, start_at);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sess_status ON sessions(status);`);
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sessions_updated_at') THEN
          CREATE TRIGGER trg_sessions_updated_at
          BEFORE UPDATE ON sessions
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END$$;
    `);

    // 10. session_staff (snapshot nhan su phien)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS session_staff (
        session_id  BIGINT NOT NULL,
        employee_id BIGINT NOT NULL,
        role        VARCHAR(10) NOT NULL CHECK (role IN ('LIVE','SUPPORT')),
        PRIMARY KEY (session_id, employee_id, role),
        CONSTRAINT fk_ss_session FOREIGN KEY (session_id)
          REFERENCES sessions(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_ss_emp FOREIGN KEY (employee_id)
          REFERENCES employees(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ss_session_role ON session_staff(session_id, role);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ss_emp_role ON session_staff(employee_id, role);`);

    // 11. salary_configs
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS salary_configs (
        id                   BIGSERIAL PRIMARY KEY,
        employee_id          BIGINT NOT NULL,
        base_salary          DECIMAL(15,2) NOT NULL DEFAULT 0,
        hourly_rate_live     DECIMAL(15,2) NOT NULL DEFAULT 0,
        hourly_rate_support  DECIMAL(15,2) NOT NULL DEFAULT 0,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_sal_cfg_emp FOREIGN KEY (employee_id) REFERENCES employees(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS uk_sal_cfg_emp ON salary_configs(employee_id);`);

    // 12. salary_reports
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS salary_reports (
        id                   BIGSERIAL PRIMARY KEY,
        employee_id          BIGINT NOT NULL,
        month                INT NOT NULL,
        year                 INT NOT NULL,
        total_hours_live     DECIMAL(10,2) NULL,
        total_hours_support  DECIMAL(10,2) NULL,
        total_revenue        DECIMAL(15,2) NULL,
        total_salary         DECIMAL(15,2) NULL,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_sal_rpt_emp FOREIGN KEY (employee_id) REFERENCES employees(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT chk_sal_rpt_month CHECK (month BETWEEN 1 AND 12),
        CONSTRAINT uk_sal_rpt_emp_month UNIQUE (employee_id, year, month)
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sal_rpt_period ON salary_reports(year, month);`);

    // 13. revenue_reports
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS revenue_reports (
        id              BIGSERIAL PRIMARY KEY,
        total_revenue   DECIMAL(16,2) NOT NULL DEFAULT 0,
        total_hours     DECIMAL(10,2) NOT NULL DEFAULT 0,
        type            VARCHAR(20) NOT NULL CHECK (type IN ('EMPLOYEE','CHANNEL','NETWORK')), 
        section         VARCHAR(20) NOT NULL CHECK (section IN ('DAILY','MONTHLY','YEARLY')),
        value_id        BIGINT NULL,
        date_value      DATE NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_rev_report_channel 
          FOREIGN KEY (value_id) REFERENCES channels(id)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT chk_rev_value CHECK (
            (type = 'NETWORK'  AND value_id IS NULL)
         OR (type IN ('EMPLOYEE','CHANNEL') AND value_id IS NOT NULL)
        )
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_rev_type_section ON revenue_reports(type, section);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_rev_value_date ON revenue_reports(value_id, date_value);`);
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS uk_rev_unique ON revenue_reports(type, section, value_id, date_value);`);

    // 14. automation_settings (singleton)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS automation_settings (
        id                       SMALLINT PRIMARY KEY DEFAULT 1,
        reminder_before_min      INT NOT NULL DEFAULT 10,
        late_after_min           INT NOT NULL DEFAULT 5,
        screenshot_interval_min  INT NOT NULL DEFAULT 5,
        updated_by               BIGINT NULL,
        created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_automation_nonneg CHECK (
          reminder_before_min >= 0 AND late_after_min >= 0 AND screenshot_interval_min >= 0
        ),
        CONSTRAINT fk_automation_updated_by FOREIGN KEY (updated_by) REFERENCES accounts(id)
          ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Trigger ep id = 1
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_automation_settings_bi_fn') THEN
          CREATE OR REPLACE FUNCTION trg_automation_settings_bi_fn()
          RETURNS trigger AS $BODY$
          BEGIN
            NEW.id := 1;
            RETURN NEW;
          END;
          $BODY$ LANGUAGE plpgsql;
        END IF;
      END$$;
    `);

    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_automation_settings_bi'
        ) THEN
          CREATE TRIGGER trg_automation_settings_bi
          BEFORE INSERT ON automation_settings
          FOR EACH ROW EXECUTE FUNCTION trg_automation_settings_bi_fn();
        END IF;
      END$$;
    `);
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_automation_settings_updated_at') THEN
          CREATE TRIGGER trg_automation_settings_updated_at
          BEFORE UPDATE ON automation_settings
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END$$;
    `);

    // Seed gia tri mac dinh cho automation_settings (idempotent)
    await sequelize.query(`
      INSERT INTO automation_settings (id, reminder_before_min, late_after_min, screenshot_interval_min)
      VALUES (1, 10, 5, 5)
      ON CONFLICT (id) DO UPDATE
      SET reminder_before_min     = EXCLUDED.reminder_before_min,
          late_after_min          = EXCLUDED.late_after_min,
          screenshot_interval_min = EXCLUDED.screenshot_interval_min,
          updated_at              = NOW();
    `);
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    // Ha bang theo thu tu nguoc phu thuoc
    await sequelize.query(`DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;`);
    await sequelize.query(`DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;`);
    await sequelize.query(`DROP TRIGGER IF EXISTS trg_schedules_updated_at ON schedules;`);
    await sequelize.query(`DROP TRIGGER IF EXISTS trg_events_updated_at ON events;`);
    await sequelize.query(`DROP TRIGGER IF EXISTS trg_sessions_updated_at ON sessions;`);
    await sequelize.query(`DROP TRIGGER IF EXISTS trg_automation_settings_updated_at ON automation_settings;`);
    await sequelize.query(`DROP FUNCTION IF EXISTS set_updated_at;`);
    await sequelize.query(`DROP TRIGGER IF EXISTS trg_automation_settings_bi ON automation_settings;`);
    await sequelize.query(`DROP FUNCTION IF EXISTS trg_automation_settings_bi_fn;`);
    await sequelize.query(`DROP TABLE IF EXISTS automation_settings;`);
    await sequelize.query(`DROP TABLE IF EXISTS revenue_reports;`);
    await sequelize.query(`DROP TABLE IF EXISTS salary_reports;`);
    await sequelize.query(`DROP TABLE IF EXISTS salary_configs;`);
    await sequelize.query(`DROP TABLE IF EXISTS session_staff;`);
    await sequelize.query(`DROP TABLE IF EXISTS sessions;`);
    await sequelize.query(`DROP TABLE IF EXISTS event_members;`);
    await sequelize.query(`DROP TABLE IF EXISTS events;`);
    await sequelize.query(`DROP TABLE IF EXISTS schedules;`);
    await sequelize.query(`DROP TABLE IF EXISTS channels;`);
    await sequelize.query(`DROP TABLE IF EXISTS employees;`);
    await sequelize.query(`DROP TABLE IF EXISTS account_roles;`);
    await sequelize.query(`DROP TABLE IF EXISTS roles;`);
    await sequelize.query(`DROP TABLE IF EXISTS accounts;`);
  },
};
