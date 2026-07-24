require("dotenv").config();

const base = {
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "claim_service",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5434,
  dialect: "postgres",
};

module.exports = {
  development: base,
  test: { ...base, database: `${base.database}_test` },
  production: base,
};
