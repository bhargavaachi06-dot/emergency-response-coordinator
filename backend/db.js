const { Pool } = require("pg");
require("dotenv").config();

let poolConfig = {};

if (process.env.DATABASE_URL) {
  const rawUrl = process.env.DATABASE_URL;
  // Handle unescaped @ in password: postgresql://user:pass@word@host:port/db
  const match = rawUrl.match(/^postgresql:\/\/([^:]+):(.*)@([^@\/]+)\/([^?]+)/);
  if (match) {
    const [, user, password, hostPort, dbName] = match;
    const [host, port] = hostPort.split(":");
    poolConfig = {
      user: decodeURIComponent(user),
      password: password,
      host: host,
      port: port ? parseInt(port, 10) : 5432,
      database: dbName,
    };
  } else {
    poolConfig = { connectionString: rawUrl };
  }
} else {
  poolConfig = {
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST || "localhost",
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
    database: process.env.PGDATABASE || "emergency_response",
  };
}

const isCloudDb =
  process.env.DATABASE_SSL === "true" ||
  (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("sslmode=require") || !process.env.DATABASE_URL.includes("localhost")));

if (isCloudDb) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err.message);
});

module.exports = pool;