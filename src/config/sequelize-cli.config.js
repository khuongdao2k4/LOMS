require('dotenv').config();

module.exports = {
    development: {
        username: process.env.DB_USER,
        password: process.env.DB_PASS ? String(process.env.DB_PASS) : "", 
        database: process.env.DB_NAME,
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        dialect: 'postgres',
        pool: {
          max: 5,       // giới hạn số kết nối đồng thời từ app
          min: 0,
          idle: 10000,  // ms: nhàn rỗi bao lâu thì trả kết nối
          acquire: 30000,
        },
        logging: false,
      },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    dialect: 'postgres',
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
      acquire: 30000,
    },
    logging: false,
  },
};
