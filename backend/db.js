const { Pool } = require("pg");
require("dotenv").config();

const isCloudDb =
  process.env.DATABASE_SSL === "true" ||
  (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("sslmode=require") || !process.env.DATABASE_URL.includes("localhost")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err.message);
});

module.exports = pool;