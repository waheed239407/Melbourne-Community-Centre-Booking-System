-- Melbourne Community Centre Booking System
-- Portfolio Task 2 initial PostgreSQL schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE roles (
    role_id SMALLSERIAL PRIMARY KEY,
    role_name VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id SMALLINT NOT NULL REFERENCES roles(role_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE community_centres (
    centre_id BIGSERIAL PRIMARY KEY,
    centre_name VARCHAR(120) NOT NULL UNIQUE,
    address_line VARCHAR(180) NOT NULL,
    suburb VARCHAR(80) NOT NULL,
    postcode CHAR(4) NOT NULL CHECK (postcode ~ '^[0-9]{4}$'),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE rooms (
    room_id BIGSERIAL PRIMARY KEY,
    centre_id BIGINT NOT NULL REFERENCES community_centres(centre_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    room_name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (centre_id, room_name)
);

CREATE TABLE facilities (
    facility_id SMALLSERIAL PRIMARY KEY,
    facility_name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE room_facilities (
    room_id BIGINT NOT NULL REFERENCES rooms(room_id) ON UPDATE CASCADE ON DELETE CASCADE,
    facility_id SMALLINT NOT NULL REFERENCES facilities(facility_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (room_id, facility_id)
);

CREATE TABLE bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    room_id BIGINT NOT NULL REFERENCES rooms(room_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    purpose VARCHAR(250) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMPTZ,
    decided_by UUID REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason VARCHAR(300),
    CHECK (end_time > start_time),
    CHECK ((status <> 'APPROVED') OR (decided_by IS NOT NULL AND decided_at IS NOT NULL)),
    CONSTRAINT no_overlapping_approved_bookings
        EXCLUDE USING gist (
            room_id WITH =,
            tstzrange(start_time, end_time, '[)') WITH &&
        ) WHERE (status = 'APPROVED')
);

CREATE TABLE room_blocks (
    block_id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES rooms(room_id) ON UPDATE CASCADE ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason VARCHAR(250) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);

CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(booking_id) ON UPDATE CASCADE ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    notification_type VARCHAR(40) NOT NULL
        CHECK (notification_type IN ('REQUEST_RECEIVED', 'APPROVED', 'REJECTED', 'CANCELLED')),
    channel VARCHAR(20) NOT NULL DEFAULT 'EMAIL' CHECK (channel = 'EMAIL'),
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
        CHECK (delivery_status IN ('QUEUED', 'SENT', 'FAILED')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id VARCHAR(80) NOT NULL,
    action VARCHAR(80) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_rooms_centre_active ON rooms(centre_id, is_active);
CREATE INDEX idx_bookings_user_requested ON bookings(user_id, requested_at DESC);
CREATE INDEX idx_bookings_room_status_time ON bookings(room_id, status, start_time, end_time);
CREATE INDEX idx_room_blocks_room_time ON room_blocks(room_id, start_time, end_time);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_audit_actor_created ON audit_logs(actor_user_id, created_at DESC);

INSERT INTO roles (role_name) VALUES
    ('COMMUNITY_USER'),
    ('BOOKING_STAFF'),
    ('CENTRE_MANAGER'),
    ('SYSTEM_ADMIN')
ON CONFLICT (role_name) DO NOTHING;
