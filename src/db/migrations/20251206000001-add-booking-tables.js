'use strict';

/**
 * Thêm các bảng phục vụ tính năng booking public theo kênh.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    // booking_configs: cấu hình per channel (public token, min/max, active)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS booking_configs (
        id                     BIGSERIAL PRIMARY KEY,
        channel_id             BIGINT NOT NULL UNIQUE,
        public_token           VARCHAR(120) NOT NULL UNIQUE,
        min_duration_minutes   SMALLINT NOT NULL DEFAULT 15,
        max_duration_minutes   SMALLINT NOT NULL DEFAULT 240,
        is_active              BOOLEAN NOT NULL DEFAULT TRUE,
        created_by             BIGINT NULL,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_bcfg_channel FOREIGN KEY (channel_id) REFERENCES channels(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_bcfg_created_by FOREIGN KEY (created_by) REFERENCES accounts(id)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT chk_bcfg_duration CHECK (min_duration_minutes > 0 AND max_duration_minutes >= min_duration_minutes)
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_bcfg_active ON booking_configs(is_active);`);
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_booking_configs_updated_at') THEN
          CREATE TRIGGER trg_booking_configs_updated_at
          BEFORE UPDATE ON booking_configs
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END$$;
    `);

    // booking_config_slots: các khung giờ theo weekday cho từng config
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS booking_config_slots (
        id                 BIGSERIAL PRIMARY KEY,
        booking_config_id  BIGINT NOT NULL,
        weekday            SMALLINT NOT NULL,
        start_time         TIME NOT NULL,
        end_time           TIME NOT NULL,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_bslot_config FOREIGN KEY (booking_config_id) REFERENCES booking_configs(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT chk_bslot_weekday CHECK (weekday BETWEEN 1 AND 7),
        CONSTRAINT chk_bslot_time CHECK (start_time < end_time)
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_bslot_config_day ON booking_config_slots(booking_config_id, weekday);`);

    // bookings: phiếu đặt lịch
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id                  BIGSERIAL PRIMARY KEY,
        channel_id          BIGINT NOT NULL,
        booking_config_id   BIGINT NULL,
        start_at            TIMESTAMPTZ NOT NULL,
        end_at              TIMESTAMPTZ NOT NULL,
        status              VARCHAR(15) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
        full_name           VARCHAR(150) NOT NULL,
        phone               VARCHAR(30) NOT NULL,
        note                TEXT NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_booking_time CHECK (start_at < end_at),
        CONSTRAINT fk_booking_channel FOREIGN KEY (channel_id) REFERENCES channels(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_booking_config FOREIGN KEY (booking_config_id) REFERENCES booking_configs(id)
          ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_booking_channel_time ON bookings(channel_id, start_at, end_at);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_booking_status ON bookings(status);`);
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bookings_updated_at') THEN
          CREATE TRIGGER trg_bookings_updated_at
          BEFORE UPDATE ON bookings
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END$$;
    `);

    // booking_status_logs: lịch sử duyệt/hủy (tùy chọn, hữu ích audit)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS booking_status_logs (
        id           BIGSERIAL PRIMARY KEY,
        booking_id   BIGINT NOT NULL,
        status       VARCHAR(15) NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
        note         TEXT NULL,
        created_by   BIGINT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_blog_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_blog_created_by FOREIGN KEY (created_by) REFERENCES accounts(id)
          ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_blog_booking ON booking_status_logs(booking_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_blog_status ON booking_status_logs(status);`);
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.query(`DROP TABLE IF EXISTS booking_status_logs;`);
    await sequelize.query(`DROP TABLE IF EXISTS bookings;`);
    await sequelize.query(`DROP TABLE IF EXISTS booking_config_slots;`);
    await sequelize.query(`DROP TABLE IF EXISTS booking_configs;`);
  },
};
 