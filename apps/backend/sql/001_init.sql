-- 001_init.sql: Schema và bảng cho Bastion Nexus (PostgreSQL)

-- Tạo schema
CREATE SCHEMA IF NOT EXISTS account;
CREATE SCHEMA IF NOT EXISTS note;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS notification;

-- account.statuses
CREATE TABLE IF NOT EXISTS account.statuses (
  code VARCHAR(20) PRIMARY KEY,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);


CREATE TABLE IF NOT EXISTS account.users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON account.users(email);
CREATE INDEX IF NOT EXISTS idx_account_users_email ON account.users(email);
CREATE INDEX IF NOT EXISTS idx_account_users_created_at ON account.users(created_at);
ALTER TABLE account.users DROP CONSTRAINT IF EXISTS users_status_fkey;
ALTER TABLE account.users ADD CONSTRAINT users_status_fkey FOREIGN KEY (status) REFERENCES account.statuses(code) ON UPDATE NO ACTION ON DELETE NO ACTION;


CREATE TABLE IF NOT EXISTS account.devices (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
  name TEXT DEFAULT NULL,
  fingerprint TEXT DEFAULT NULL,
  trusted BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_devices_account ON account.devices(account_id);
CREATE INDEX IF NOT EXISTS idx_account_devices_account_id ON account.devices(account_id);
ALTER TABLE account.devices DROP CONSTRAINT IF EXISTS devices_account_id_fkey;
ALTER TABLE account.devices ADD CONSTRAINT devices_account_id_fkey FOREIGN KEY (account_id) REFERENCES account.users(id) ON UPDATE NO ACTION ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS account.profiles (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  birthday DATE DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE account.profiles DROP CONSTRAINT IF EXISTS profiles_account_id_fkey;
ALTER TABLE account.profiles ADD CONSTRAINT profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES account.users(id) ON UPDATE NO ACTION ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_account_id_key ON account.profiles(account_id);


CREATE TABLE IF NOT EXISTS account.security (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL UNIQUE,
  security_level SMALLINT NOT NULL DEFAULT 0,
  otp_enabled BOOLEAN NOT NULL DEFAULT false,
  otp_secret BYTEA DEFAULT NULL,
  otp_verified_at TIMESTAMPTZ DEFAULT NULL,
  require_trusted_device BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE account.security DROP CONSTRAINT IF EXISTS security_account_id_fkey;
ALTER TABLE account.security ADD CONSTRAINT security_account_id_fkey FOREIGN KEY (account_id) REFERENCES account.users(id) ON UPDATE NO ACTION ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS security_account_id_key ON account.security(account_id);


CREATE TABLE IF NOT EXISTS account.sessions (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON account.sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_sessions_account_id ON account.sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_sessions_revoked ON account.sessions(account_id, revoked_at);
ALTER TABLE account.sessions DROP CONSTRAINT IF EXISTS sessions_account_id_fkey;
ALTER TABLE account.sessions ADD CONSTRAINT sessions_account_id_fkey FOREIGN KEY (account_id) REFERENCES account.users(id) ON UPDATE NO ACTION ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS account.settings (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, key)
);
CREATE INDEX IF NOT EXISTS idx_settings_account ON account.settings(account_id);
CREATE INDEX IF NOT EXISTS idx_account_settings_account_id ON account.settings(account_id);
ALTER TABLE account.settings DROP CONSTRAINT IF EXISTS settings_account_id_fkey;
ALTER TABLE account.settings ADD CONSTRAINT settings_account_id_fkey FOREIGN KEY (account_id) REFERENCES account.users(id) ON UPDATE NO ACTION ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS note.item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id SERIAL NOT NULL,
  title VARCHAR(200) DEFAULT NULL,
  content TEXT NOT NULL,
  is_encrypted BOOLEAN NOT NULL DEFAULT false,
  password BYTEA DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  color TEXT DEFAULT NULL,
  CONSTRAINT fk_note_item_account FOREIGN KEY (account_id) REFERENCES account.users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS note.share (
  id SERIAL PRIMARY KEY,
  note_id UUID NOT NULL,
  share_token UUID NOT NULL DEFAULT gen_random_uuid(),
  password_hash TEXT DEFAULT NULL,
  expired_at TIMESTAMPTZ DEFAULT NULL,
  max_views INTEGER DEFAULT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ DEFAULT NULL,
  CONSTRAINT share_note_id_fkey FOREIGN KEY (note_id) REFERENCES note.item(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- vault.items
CREATE TABLE IF NOT EXISTS vault.items (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  username TEXT,
  email TEXT,
  password TEXT,
  otp_secret TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- vault.tags
CREATE TABLE IF NOT EXISTS vault.tags (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES account.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7)
);

-- vault.item_tags
CREATE TABLE IF NOT EXISTS vault.item_tags (
  item_id INTEGER NOT NULL REFERENCES vault.items(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES vault.tags(id) ON DELETE CASCADE,
  PRIMARY KEY(item_id, tag_id)
);


CREATE TABLE IF NOT EXISTS audit.logs (
  id SERIAL PRIMARY KEY,
  account_id BIGINT DEFAULT NULL,
  action TEXT NOT NULL,
  resource_type TEXT DEFAULT NULL,
  resource_id TEXT DEFAULT NULL,
  details JSONB DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES account.users(id) ON UPDATE NO ACTION ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS notification.items (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  content TEXT DEFAULT NULL,
  resource_type TEXT DEFAULT NULL,
  resource_id TEXT DEFAULT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT items_account_id_fkey FOREIGN KEY (account_id) REFERENCES account.users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Breach Monitor Schema
CREATE SCHEMA IF NOT EXISTS breach;

CREATE TABLE IF NOT EXISTS breach.monitor (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  monitor_type TEXT NOT NULL,
  monitor_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_breach_monitor_user FOREIGN KEY (user_id) REFERENCES account.users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS breach.result (
  id SERIAL PRIMARY KEY,
  monitor_id INT NOT NULL,
  breached BOOLEAN NOT NULL,
  breach_source TEXT DEFAULT NULL,
  breach_date TIMESTAMPTZ DEFAULT NULL,
  raw_data JSONB DEFAULT NULL,
  checked_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_breach_result_monitor FOREIGN KEY (monitor_id) REFERENCES breach.monitor(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Wallet Schema
CREATE SCHEMA IF NOT EXISTS wallet;

CREATE TABLE IF NOT EXISTS wallet.items (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
  wallet_type TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT DEFAULT NULL,
  encrypted_secret BYTEA NOT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT items_account_id_fkey FOREIGN KEY (account_id) REFERENCES account.users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallet.metadata (
  id SERIAL PRIMARY KEY,
  wallet_id INT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  CONSTRAINT metadata_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES wallet.items(id) ON UPDATE NO ACTION ON DELETE CASCADE
);
