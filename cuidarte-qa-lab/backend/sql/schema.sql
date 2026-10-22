CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  nombre_usuario VARCHAR(32) NOT NULL,
  email_key CHAR(64) NOT NULL UNIQUE,
  email_encrypted TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'paciente' CHECK (rol IN ('administrador','medico','paciente')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  confirmed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(lower(nombre_usuario));
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
  user_id UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
  data_encrypted TEXT NOT NULL,
  nombre_tokens TEXT[] NOT NULL DEFAULT '{}',
  rut_tokens TEXT[] NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS patients_nombre_idx ON patients USING GIN(nombre_tokens);
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id),
  data_encrypted TEXT NOT NULL,
  fecha DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS exams_patient_idx ON exams(patient_id,fecha DESC) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id),
  storage_key TEXT NOT NULL UNIQUE,
  metadata_encrypted TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS document_active_unique ON documents(exam_id) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  actor_id UUID REFERENCES users(id),
  accion VARCHAR(60) NOT NULL,
  recurso VARCHAR(60) NOT NULL,
  recurso_id UUID,
  detalle JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_events(created_at DESC);
CREATE TABLE IF NOT EXISTS lab_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
