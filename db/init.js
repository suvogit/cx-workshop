require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();

const schema = `

CREATE TABLE IF NOT EXISTS roadmap_items (
  id          SERIAL PRIMARY KEY,
  ws          TEXT NOT NULL,
  phase       INTEGER NOT NULL CHECK (phase BETWEEN 0 AND 5),
  text        TEXT NOT NULL,
  pillar      TEXT NOT NULL,
  people      TEXT DEFAULT '',
  due_date    DATE,
  comments    TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_items (
  id          SERIAL PRIMARY KEY,
  detail      TEXT NOT NULL,
  owner       TEXT DEFAULT '',
  due_date    DATE,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','inprogress','done','blocked')),
  comments    TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metrics (
  id          SERIAL PRIMARY KEY,
  pillar      TEXT NOT NULL,
  name        TEXT NOT NULL,
  question    TEXT DEFAULT '',
  formula     TEXT DEFAULT '',
  type        TEXT DEFAULT 'Leading' CHECK (type IN ('Leading','Lagging')),
  l2          TEXT DEFAULT '',
  l3          TEXT DEFAULT '',
  l4          TEXT DEFAULT '',
  h2_target   TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dri_assignments (
  pillar      TEXT PRIMARY KEY,
  dri         TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workshop_notes (
  section     TEXT PRIMARY KEY,
  content     TEXT DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO workshop_notes (section, content) VALUES
  ('day1', ''),
  ('day2', ''),
  ('day3', ''),
  ('parking', '')
ON CONFLICT (section) DO NOTHING;

INSERT INTO dri_assignments (pillar, dri) VALUES
  ('Onboarding',   'Jidesh M'),
  ('Adoption',     'Deepak V'),
  ('Success',      'Deepak V'),
  ('Retention',    'Deepak V'),
  ('Advocacy',     'Suvo'),
  ('Support',      'Anirban M'),
  ('Intelligence', 'Subhajit D'),
  ('Technology',   'Subhajit D'),
  ('Escalation',   'Suvo'),
  ('People',       'Divyatha')
ON CONFLICT (pillar) DO NOTHING;

`;

async function init() {
  const client = await pool.connect();
  try {
    console.log('Connecting to PostgreSQL...');
    await client.query(schema);
    console.log('✓ Database schema created successfully');
    console.log('✓ Tables: roadmap_items, action_items, metrics, dri_assignments, workshop_notes');
  } catch (err) {
    console.error('Error initialising database:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

init();
