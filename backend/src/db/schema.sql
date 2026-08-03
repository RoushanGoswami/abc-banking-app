CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Branches Table
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    branch_code VARCHAR(10) UNIQUE NOT NULL,
    branch_name VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(11) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Role-Based Access Control)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id INT REFERENCES branches(id) ON DELETE RESTRICT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('ADMIN', 'MANAGER', 'TELLER', 'AUDITOR')) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id INT REFERENCES branches(id) ON DELETE RESTRICT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    pan_number VARCHAR(10) UNIQUE,
    national_id_encrypted VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Accounts Table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    branch_id INT REFERENCES branches(id) ON DELETE RESTRICT,
    account_type VARCHAR(20) CHECK (account_type IN ('SAVINGS', 'CURRENT', 'FD')) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 4.00,
    status VARCHAR(20) CHECK (status IN ('ACTIVE', 'DORMANT', 'FROZEN')) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ACID Transaction Ledger
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_reference VARCHAR(40) UNIQUE NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    branch_id INT REFERENCES branches(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    type VARCHAR(20) CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'INTEREST_CREDIT', 'FEE_DEBIT')) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0.00),
    balance_after DECIMAL(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Immutable Audit Log
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    ip_address VARCHAR(45) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- B-Tree Performance Indexes
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
CREATE INDEX idx_accounts_branch_id ON accounts(branch_id);
CREATE INDEX idx_transactions_account_id_created ON transactions(account_id, created_at DESC);
CREATE INDEX idx_transactions_branch_date ON transactions(branch_id, created_at);

-- 1. Branches Table (3 ABC Co-operative Bank Branches)
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  branch_code VARCHAR(10) UNIQUE NOT NULL,
  branch_name VARCHAR(100) NOT NULL,
  city VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bank Employees & Access Control (RBAC)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  branch_id INT REFERENCES branches(id),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('TELLER', 'BRANCH_MANAGER', 'AUDITOR', 'ADMIN')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers Table (With Encrypted PAN / National IDs)
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  branch_id INT REFERENCES branches(id),
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  pan_encrypted VARCHAR(255) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Accounts Table (Linked to Branch & Customer)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id INT REFERENCES customers(id),
  branch_id INT REFERENCES branches(id),
  account_number VARCHAR(12) UNIQUE NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('SAVINGS', 'CURRENT', 'FD')),
  balance DECIMAL(15,2) DEFAULT 0.00,
  interest_rate DECIMAL(5,2) DEFAULT 3.50,
  status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- 5. Financial Audit & Revenue Ledger (For P&L Reports)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  transaction_id INT,
  user_id INT REFERENCES users(id),
  branch_id INT REFERENCES branches(id),
  action_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);