CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  nombre_usuario VARCHAR(32) NOT NULL,
  email_key CHAR(64) NOT NULL UNIQUE,
  email_encrypted TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (lower(nombre_usuario));
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  email_key CHAR(64) NOT NULL,
  data_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS memberships (
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador', 'editor')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, user_id)
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS email_confirmations (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  email_key CHAR(64) NOT NULL,
  email_encrypted TEXT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador', 'editor')),
  created_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  data_encrypted TEXT NOT NULL,
  nombre_tokens TEXT[] NOT NULL DEFAULT '{}',
  empresa_tokens TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  UNIQUE (id, company_id)
);
CREATE INDEX IF NOT EXISTS clients_company_idx ON clients(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS clients_nombre_search_idx ON clients USING GIN(nombre_tokens);
CREATE INDEX IF NOT EXISTS clients_empresa_search_idx ON clients USING GIN(empresa_tokens);
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  client_id UUID NOT NULL,
  data_encrypted TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CHECK (fecha_fin >= fecha_inicio),
  FOREIGN KEY (client_id, company_id) REFERENCES clients(id, company_id),
  UNIQUE (id, company_id)
);
CREATE INDEX IF NOT EXISTS contracts_client_idx ON contracts(company_id, client_id) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  contract_id UUID NOT NULL UNIQUE,
  storage_key TEXT NOT NULL UNIQUE,
  metadata_encrypted TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id, company_id) REFERENCES contracts(id, company_id),
  UNIQUE (id, company_id)
);
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  document_id UUID NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  token_encrypted TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id, company_id) REFERENCES documents(id, company_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  actor_id UUID REFERENCES users(id),
  accion VARCHAR(64) NOT NULL,
  recurso VARCHAR(32) NOT NULL,
  recurso_id UUID,
  detalle JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS audit_company_time_idx ON audit_events(company_id, created_at DESC);
CREATE TABLE IF NOT EXISTS lab_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
