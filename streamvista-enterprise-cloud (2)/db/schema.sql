-- Core Identity
CREATE TABLE users (
    id VARCHAR2(36) PRIMARY KEY,
    email VARCHAR2(255) UNIQUE NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organizations (
    id VARCHAR2(36) PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organization_members (
    id VARCHAR2(36) PRIMARY KEY,
    org_id VARCHAR2(36) REFERENCES organizations(id),
    user_id VARCHAR2(36) REFERENCES users(id),
    role VARCHAR2(50) NOT NULL, -- e.g., 'ADMIN', 'USER'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions & Billing
CREATE TABLE subscriptions (
    id VARCHAR2(36) PRIMARY KEY,
    org_id VARCHAR2(36) REFERENCES organizations(id),
    plan_id VARCHAR2(100),
    status VARCHAR2(50), -- e.g., 'ACTIVE', 'CANCELED', 'PAST_DUE'
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE storage_allocations (
    id VARCHAR2(36) PRIMARY KEY,
    org_id VARCHAR2(36) REFERENCES organizations(id),
    purchased_gb NUMBER(10,2) NOT NULL,
    used_gb NUMBER(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id VARCHAR2(36) PRIMARY KEY,
    org_id VARCHAR2(36) REFERENCES organizations(id),
    base_amount NUMBER(10,2) NOT NULL,
    gst_amount NUMBER(10,2) NOT NULL,
    total_amount NUMBER(10,2) NOT NULL,
    status VARCHAR2(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vault Structure & Recycle Bin
CREATE TABLE folders (
    id VARCHAR2(36) PRIMARY KEY,
    org_id VARCHAR2(36) REFERENCES organizations(id),
    parent_folder_id VARCHAR2(36) REFERENCES folders(id),
    name VARCHAR2(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR2(36)
);

CREATE TABLE files (
    id VARCHAR2(36) PRIMARY KEY,
    folder_id VARCHAR2(36) REFERENCES folders(id),
    name VARCHAR2(255) NOT NULL,
    path VARCHAR2(1000) NOT NULL, -- Path in Object Storage
    size NUMBER(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR2(36),
    restore_until TIMESTAMP
);

-- Audit & Session
CREATE TABLE audit_logs (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) REFERENCES users(id),
    action VARCHAR2(100) NOT NULL,
    target_id VARCHAR2(36),
    ip_address VARCHAR2(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) REFERENCES users(id),
    token VARCHAR2(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE email_events (
    id VARCHAR2(36) PRIMARY KEY,
    event_type VARCHAR2(100) NOT NULL,
    email VARCHAR2(255) NOT NULL,
    status VARCHAR2(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
