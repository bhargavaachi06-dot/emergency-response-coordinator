-- Emergency Response Coordinator Database

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergencies (
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
);

CREATE TABLE IF NOT EXISTS responders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    phone VARCHAR(30),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    status VARCHAR(30) DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
    responder_id INTEGER REFERENCES responders(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'DISPATCHED',
    dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS helpers (
    id SERIAL PRIMARY KEY,
    helper_code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS helper_responses (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
    helper_id INTEGER REFERENCES helpers(id) ON DELETE CASCADE,
    response VARCHAR(30) NOT NULL,
    status VARCHAR(30),
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incident_events (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);