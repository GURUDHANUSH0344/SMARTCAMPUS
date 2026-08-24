const { Sequelize } = require("sequelize");
const mysql2 = require("mysql2");
const pg = require("pg");

let sequelize;

if (process.env.DATABASE_URL) {
  // Option 1: Full Connection URI (e.g., Supabase Postgres or Cloud DB)
  const isPostgres = process.env.DATABASE_URL.startsWith("postgres");
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: isPostgres ? "postgres" : "mysql",
    dialectModule: isPostgres ? pg : mysql2,
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  // Option 2: Individual variables
  const dialect = process.env.DB_DIALECT || (process.env.DB_HOST && process.env.DB_HOST.includes("supabase") ? "postgres" : "mysql");
  const isPostgres = dialect === "postgres";
  const useSsl = process.env.DB_SSL === "true" || isPostgres;

  sequelize = new Sequelize(
    process.env.DB_NAME || "erp_db",
    process.env.DB_USER || "root",
    process.env.DB_PASS || "password",
    {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : (isPostgres ? 5432 : 3306),
      dialect: dialect,
      dialectModule: isPostgres ? pg : mysql2,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: useSsl
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : {},
    }
  );
}

module.exports = sequelize;


