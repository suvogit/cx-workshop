require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const pool    = require('../db/pool');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── Auto-initialise DB tables on startup ──────────────────────────────────────
async function initDB() {
  const schema = `
    CREATE TABLE IF NOT EXISTS roadmap_items (
      id          SERIAL PRIMARY KEY,
      ws          TEXT NOT NULL,
      phase       INTEGER NOT NULL CHECK (phase BETWEEN 0 AND 5),
      text        TEXT NOT NULL,
      pillar      TEXT NOT NULL,
      dri         TEXT DEFAULT '',
      people      TEXT DEFAULT '',
      due_date    DATE,
      comments    TEXT DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS dri TEXT DEFAULT '';
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
      dri         TEXT DEFAULT '',
      question    TEXT DEFAULT '',
      formula     TEXT DEFAULT '',
      type        TEXT DEFAULT 'Leading' CHECK (type IN ('Leading','Lagging')),
      l1          TEXT DEFAULT '',
      l2          TEXT DEFAULT '',
      l3          TEXT DEFAULT '',
      l4          TEXT DEFAULT '',
      l5          TEXT DEFAULT '',
      l6          TEXT DEFAULT '',
      h2_target   TEXT DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE metrics ADD COLUMN IF NOT EXISTS dri TEXT DEFAULT '';
    ALTER TABLE metrics ADD COLUMN IF NOT EXISTS l1  TEXT DEFAULT '';
    ALTER TABLE metrics ADD COLUMN IF NOT EXISTS l5  TEXT DEFAULT '';
    ALTER TABLE metrics ADD COLUMN IF NOT EXISTS l6  TEXT DEFAULT '';
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
      ('day1',''),('day2',''),('day3',''),('parking','')
    ON CONFLICT (section) DO NOTHING;
    INSERT INTO dri_assignments (pillar, dri) VALUES
      ('Onboarding','Jidesh M'),('Adoption','Deepak V'),('Success','Deepak V'),
      ('Retention','Deepak V'),('Advocacy','Suvo'),('Support','Anirban M'),
      ('Intelligence','Subhajit D'),('Technology','Subhajit D'),
      ('Escalation','Suvo'),('People','Divyatha')
    ON CONFLICT (pillar) DO NOTHING;
  `;
  try {
    await pool.query(schema);
    console.log('✓ Database tables ready');
  } catch (err) {
    console.error('✗ DB init error:', err.message);
  }
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── Roadmap Items ─────────────────────────────────────────────────────────────
app.get('/api/roadmap', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM roadmap_items ORDER BY phase, id'
    );
    res.json(rows.map(dbToRoadmap));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/roadmap', async (req, res) => {
  const { ws, phase, text, pillar, dri, people, due, comments } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO roadmap_items (ws, phase, text, pillar, dri, people, due_date, comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [ws, phase, text, pillar, dri||'', people||'', due||null, comments||'']
    );
    res.status(201).json(dbToRoadmap(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/roadmap/:id', async (req, res) => {
  const { ws, phase, text, pillar, dri, people, due, comments } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE roadmap_items
       SET ws=$1, phase=$2, text=$3, pillar=$4, dri=$5, people=$6,
           due_date=$7, comments=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [ws, phase, text, pillar, dri||'', people||'', due||null, comments||'', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(dbToRoadmap(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/roadmap/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM roadmap_items WHERE id=$1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function dbToRoadmap(r) {
  return {
    id:       r.id,
    ws:       r.ws,
    phase:    r.phase,
    text:     r.text,
    pillar:   r.pillar,
    dri:      r.dri || '',
    people:   r.people || '',
    due:      r.due_date ? r.due_date.toISOString().slice(0,10) : '',
    comments: r.comments || '',
  };
}

// ── Action Items ──────────────────────────────────────────────────────────────
app.get('/api/actions', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM action_items ORDER BY id'
    );
    res.json(rows.map(dbToAction));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/actions', async (req, res) => {
  const { detail, owner, due, status, comments } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO action_items (detail, owner, due_date, status, comments)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [detail, owner||'', due||null, status||'open', comments||'']
    );
    res.status(201).json(dbToAction(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/actions/:id', async (req, res) => {
  const { detail, owner, due, status, comments } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE action_items
       SET detail=$1, owner=$2, due_date=$3, status=$4, comments=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [detail, owner||'', due||null, status||'open', comments||'', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(dbToAction(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/actions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM action_items WHERE id=$1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function dbToAction(r) {
  return {
    id:       r.id,
    detail:   r.detail,
    owner:    r.owner || '',
    due:      r.due_date ? r.due_date.toISOString().slice(0,10) : '',
    status:   r.status,
    comments: r.comments || '',
  };
}

// ── Metrics ───────────────────────────────────────────────────────────────────
app.get('/api/metrics', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM metrics ORDER BY pillar, id'
    );
    res.json(rows.map(dbToMetric));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/metrics', async (req, res) => {
  const { pillar, name, dri, question, formula, type, l1, l2, l3, l4, l5, l6, h2_target } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO metrics (pillar, name, dri, question, formula, type, l1, l2, l3, l4, l5, l6, h2_target)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [pillar, name, dri||'', question||'', formula||'', type||'Leading',
       l1||'', l2||'', l3||'', l4||'', l5||'', l6||'', h2_target||'']
    );
    res.status(201).json(dbToMetric(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/metrics/:id', async (req, res) => {
  const { pillar, name, dri, question, formula, type, l1, l2, l3, l4, l5, l6, h2_target } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE metrics
       SET pillar=$1, name=$2, dri=$3, question=$4, formula=$5, type=$6,
           l1=$7, l2=$8, l3=$9, l4=$10, l5=$11, l6=$12, h2_target=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [pillar, name, dri||'', question||'', formula||'', type||'Leading',
       l1||'', l2||'', l3||'', l4||'', l5||'', l6||'', h2_target||'', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(dbToMetric(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/metrics/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM metrics WHERE id=$1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function dbToMetric(r) {
  return {
    id:        r.id,
    pillar:    r.pillar,
    name:      r.name,
    dri:       r.dri       || '',
    question:  r.question  || '',
    formula:   r.formula   || '',
    type:      r.type,
    l1:        r.l1        || '',
    l2:        r.l2        || '',
    l3:        r.l3        || '',
    l4:        r.l4        || '',
    l5:        r.l5        || '',
    l6:        r.l6        || '',
    h2_target: r.h2_target || '',
  };
}

// ── DRI Assignments ───────────────────────────────────────────────────────────
app.get('/api/dri', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM dri_assignments ORDER BY pillar'
    );
    const result = {};
    rows.forEach(r => { result[r.pillar] = r.dri; });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/dri/:pillar', async (req, res) => {
  const { dri } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO dri_assignments (pillar, dri, updated_at)
       VALUES ($1,$2,NOW())
       ON CONFLICT (pillar) DO UPDATE SET dri=$2, updated_at=NOW()
       RETURNING *`,
      [req.params.pillar, dri]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Workshop Notes ─────────────────────────────────────────────────────────────
app.get('/api/notes', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM workshop_notes ORDER BY section'
    );
    const result = {};
    rows.forEach(r => { result[r.section] = r.content; });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notes/:section', async (req, res) => {
  const { content } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO workshop_notes (section, content, updated_at)
       VALUES ($1,$2,NOW())
       ON CONFLICT (section) DO UPDATE SET content=$2, updated_at=NOW()
       RETURNING *`,
      [req.params.section, content]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ── Bulk insert: Metrics ──────────────────────────────────────────────────────
app.post('/api/metrics/bulk', async (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ error: 'Expected array of metrics' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const m of rows) {
      const { rows: r } = await client.query(
        `INSERT INTO metrics (pillar, name, dri, question, formula, type, l1, l2, l3, l4, l5, l6, h2_target)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [m.pillar||'', m.name||'', m.dri||'', m.question||'', m.formula||'',
         m.type||'Leading', m.l1||'', m.l2||'', m.l3||'', m.l4||'', m.l5||'', m.l6||'', m.h2_target||'']
      );
      created.push(dbToMetric(r[0]));
    }
    await client.query('COMMIT');
    res.status(201).json({ inserted: created.length, items: created });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── Bulk insert: Roadmap Items ────────────────────────────────────────────────
app.post('/api/roadmap/bulk', async (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ error: 'Expected array of roadmap items' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const it of rows) {
      const { rows: r } = await client.query(
        `INSERT INTO roadmap_items (ws, phase, text, pillar, dri, people, due_date, comments)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [it.ws||'lifecycle', parseInt(it.phase)||0, it.text||'',
         it.pillar||'Onboarding', it.dri||'', it.people||'', it.due||null, it.comments||'']
      );
      created.push(dbToRoadmap(r[0]));
    }
    await client.query('COMMIT');
    res.status(201).json({ inserted: created.length, items: created });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── Catch-all: serve frontend ─────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`CX Workshop server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
});
