const pool = require("../db");

/**
 * Production database schema & seed initialization service.
 * Automatically runs on backend startup to ensure all required tables
 * and baseline responders/helpers exist in the connected PostgreSQL instance.
 *
 * Safe for existing production data:
 * - Uses CREATE TABLE IF NOT EXISTS for all required tables
 * - Checks for existing responders by name before inserting
 * - Uses ON CONFLICT (helper_code) DO NOTHING for helpers
 * - Never drops or truncates any table
 * - Never overwrites or resets existing records
 */

const SCHEMA_QUERIES = [
  // 1. Users table
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT,
    role VARCHAR(30) DEFAULT 'citizen',
    mobile VARCHAR(30),
    mobile_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    profile_photo TEXT,
    auth_provider VARCHAR(50) DEFAULT 'local',
    google_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // 2. Emergencies table
  `CREATE TABLE IF NOT EXISTS emergencies (
    id SERIAL PRIMARY KEY,
    emergency_code VARCHAR(30) UNIQUE NOT NULL,
    type VARCHAR(50),
    description TEXT NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    location_text VARCHAR(255),
    severity VARCHAR(30),
    priority VARCHAR(30),
    status VARCHAR(50) DEFAULT 'REPORTED',
    ai_analysis JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // 3. Responders table
  `CREATE TABLE IF NOT EXISTS responders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    phone VARCHAR(30),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    status VARCHAR(30) DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // 4. Assignments table
  `CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
    responder_id INTEGER REFERENCES responders(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'DISPATCHED',
    dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // 5. Helpers table
  `CREATE TABLE IF NOT EXISTS helpers (
    id SERIAL PRIMARY KEY,
    helper_code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // 6. Helper responses table
  `CREATE TABLE IF NOT EXISTS helper_responses (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
    helper_id INTEGER REFERENCES helpers(id) ON DELETE CASCADE,
    response VARCHAR(30) NOT NULL,
    status VARCHAR(30),
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // 7. Incident events table
  `CREATE TABLE IF NOT EXISTS incident_events (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // 8. Emergency media / evidence table
  `CREATE TABLE IF NOT EXISTS emergency_media (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL, -- 'image' or 'video'
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INTEGER,
    data_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // 9. OTPs table (for cryptographically secure, hashed OTP verification)
  `CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(150) NOT NULL,
    type VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_otps_identifier ON otps(identifier, type);`
];

const MIGRATION_QUERIES = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(30);`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN DEFAULT FALSE;`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT;`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100);`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
  `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`,
  `ALTER TABLE emergency_media ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);`,
  `ALTER TABLE emergency_media ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);`,
  `ALTER TABLE emergency_media ADD COLUMN IF NOT EXISTS accuracy DECIMAL(10, 2);`,
  `ALTER TABLE emergency_media ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP;`,
  `ALTER TABLE emergency_media ADD COLUMN IF NOT EXISTS distance_from_incident DECIMAL(10, 2);`,
  `ALTER TABLE emergency_media ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT FALSE;`,
  `ALTER TABLE emergency_media ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'UNVERIFIED';`,
  `ALTER TABLE emergency_media ADD COLUMN IF NOT EXISTS verification_details JSONB;`
];

const DEFAULT_RESPONDERS = [
  {
    name: "Hyderabad Ambulance Unit 01",
    type: "AMBULANCE",
    phone: "108",
    latitude: 17.3850,
    longitude: 78.4867,
    status: "AVAILABLE",
  },
  {
    name: "Hyderabad Police Unit 01",
    type: "POLICE",
    phone: "100",
    latitude: 17.3900,
    longitude: 78.4800,
    status: "AVAILABLE",
  },
  {
    name: "Fire & Rescue Unit 01",
    type: "FIRE",
    phone: "101",
    latitude: 17.3750,
    longitude: 78.4900,
    status: "AVAILABLE",
  },
];

const DEFAULT_HELPERS = [
  {
    helper_code: "H-001",
    name: "Rahul",
    phone: "demo",
    latitude: 17.3855,
    longitude: 78.4872,
    available: true,
  },
  {
    helper_code: "H-002",
    name: "Priya",
    phone: "demo",
    latitude: 17.3880,
    longitude: 78.4840,
    available: true,
  },
  {
    helper_code: "H-003",
    name: "Arjun",
    phone: "demo",
    latitude: 17.3820,
    longitude: 78.4890,
    available: true,
  },
];

async function initDatabase(dbPool = pool) {
  try {
    // 1. Create all required tables if they don't already exist
    for (const query of SCHEMA_QUERIES) {
      await dbPool.query(query);
    }

    // 1b. Run safe migration queries to add new auth columns if missing
    for (const migQuery of MIGRATION_QUERIES) {
      try {
        await dbPool.query(migQuery);
      } catch (migErr) {
        console.warn("Migration notice:", migErr.message);
      }
    }

    // 2. Seed baseline responders safely (only if not already present by name)
    for (const r of DEFAULT_RESPONDERS) {
      const existing = await dbPool.query(
        "SELECT 1 FROM responders WHERE name = $1 LIMIT 1",
        [r.name]
      );
      if (existing.rows.length === 0) {
        await dbPool.query(
          `INSERT INTO responders (name, type, phone, latitude, longitude, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [r.name, r.type, r.phone, r.latitude, r.longitude, r.status]
        );
      }
    }

    // 3. Seed baseline helpers safely (unique by helper_code)
    for (const h of DEFAULT_HELPERS) {
      await dbPool.query(
        `INSERT INTO helpers (helper_code, name, phone, latitude, longitude, available)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (helper_code) DO NOTHING`,
        [h.helper_code, h.name, h.phone, h.latitude, h.longitude, h.available]
      );
    }

    console.log("✅ Database initialized");
    console.log("✅ Production database ready");
    return true;
  } catch (error) {
    // Log safe error message without printing credentials
    console.error("⚠️ Database initialization warning:", error.message);
    return false;
  }
}

module.exports = initDatabase;
