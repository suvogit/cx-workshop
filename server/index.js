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
  const { ws, phase, text, pillar, people, due, comments } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO roadmap_items (ws, phase, text, pillar, people, due_date, comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [ws, phase, text, pillar, people||'', due||null, comments||'']
    );
    res.status(201).json(dbToRoadmap(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/roadmap/:id', async (req, res) => {
  const { ws, phase, text, pillar, people, due, comments } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE roadmap_items
       SET ws=$1, phase=$2, text=$3, pillar=$4, people=$5,
           due_date=$6, comments=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [ws, phase, text, pillar, people||'', due||null, comments||'', req.params.id]
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
  const { pillar, name, question, formula, type, l2, l3, l4, h2_target } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO metrics (pillar, name, question, formula, type, l2, l3, l4, h2_target)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [pillar, name, question||'', formula||'', type||'Leading', l2||'', l3||'', l4||'', h2_target||'']
    );
    res.status(201).json(dbToMetric(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/metrics/:id', async (req, res) => {
  const { pillar, name, question, formula, type, l2, l3, l4, h2_target } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE metrics
       SET pillar=$1, name=$2, question=$3, formula=$4, type=$5,
           l2=$6, l3=$7, l4=$8, h2_target=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [pillar, name, question||'', formula||'', type||'Leading', l2||'', l3||'', l4||'', h2_target||'', req.params.id]
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
    question:  r.question || '',
    formula:   r.formula  || '',
    type:      r.type,
    l2:        r.l2       || '',
    l3:        r.l3       || '',
    l4:        r.l4       || '',
    h2_target: r.h2_target|| '',
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

// ── Catch-all: serve frontend ─────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`CX Workshop server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
