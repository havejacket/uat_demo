const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;
const REPO = path.resolve(__dirname, '..');

let CLAUDE_BIN = 'claude';
try { CLAUDE_BIN = execSync('which claude').toString().trim(); } catch {}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Config ────────────────────────────────────────────────────────────────────

app.get('/api/config', (req, res) => {
  try { res.json({ content: fs.readFileSync(path.join(REPO, 'app-config.md'), 'utf8') }); }
  catch { res.json({ content: '' }); }
});

app.put('/api/config', (req, res) => {
  fs.writeFileSync(path.join(REPO, 'app-config.md'), req.body.content);
  res.json({ ok: true });
});

// ── Features ──────────────────────────────────────────────────────────────────

function runStatus(reportPath) {
  if (!fs.existsSync(reportPath)) return null;
  const txt = fs.readFileSync(reportPath, 'utf8');
  return {
    passes:  (txt.match(/✅ PASS/g)    || []).length,
    fails:   (txt.match(/❌ FAIL/g)    || []).length,
    pending: (txt.match(/⏳ PENDING/g) || []).length,
  };
}

function listRuns(feature) {
  const dir = path.join(REPO, 'requirements', feature, 'results');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(r => fs.statSync(path.join(dir, r)).isDirectory())
    .sort().reverse()
    .map(run => ({ run, status: runStatus(path.join(dir, run, 'report.md')) }));
}

app.get('/api/features', (req, res) => {
  const reqDir = path.join(REPO, 'requirements');
  if (!fs.existsSync(reqDir)) return res.json([]);
  const features = fs.readdirSync(reqDir)
    .filter(f => !f.startsWith('.') && fs.statSync(path.join(reqDir, f)).isDirectory())
    .map(name => {
      const runs = listRuns(name);
      return { name, latestRun: runs[0]?.run ?? null, lastStatus: runs[0]?.status ?? null };
    });
  res.json(features);
});

app.post('/api/features', (req, res) => {
  const { name, brd } = req.body;
  if (!name || !/^[a-z0-9-]+$/.test(name))
    return res.status(400).json({ error: 'Name must be lowercase letters, numbers and hyphens' });
  const dir = path.join(REPO, 'requirements', name);
  fs.mkdirSync(dir, { recursive: true });
  if (brd) fs.writeFileSync(path.join(dir, 'brd.md'), brd);
  res.json({ ok: true });
});

app.get('/api/features/:feature', (req, res) => {
  const dir = path.join(REPO, 'requirements', req.params.feature);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Not found' });
  const brdPath  = path.join(dir, 'brd.md');
  const planPath = path.join(dir, 'test-plan.md');
  res.json({
    brd:      fs.existsSync(brdPath)  ? fs.readFileSync(brdPath,  'utf8') : '',
    testPlan: fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf8') : null,
    runs:     listRuns(req.params.feature),
  });
});

app.put('/api/features/:feature/brd', (req, res) => {
  fs.writeFileSync(path.join(REPO, 'requirements', req.params.feature, 'brd.md'), req.body.content);
  res.json({ ok: true });
});

// ── Reports ───────────────────────────────────────────────────────────────────

app.get('/api/features/:feature/reports/:run', (req, res) => {
  const { feature, run } = req.params;
  const reportPath = path.join(REPO, 'requirements', feature, 'results', run, 'report.md');
  if (!fs.existsSync(reportPath)) return res.status(404).json({ error: 'Not found' });
  const md = fs.readFileSync(reportPath, 'utf8')
    .replace(/!\[([^\]]*)\]\(([^)]+\.png)\)/g,
      (_, alt, src) => `![${alt}](/images/${encodeURIComponent(feature)}/${encodeURIComponent(run)}/${src})`);
  res.json({ html: marked(md) });
});

app.get('/images/:feature/:run/:file', (req, res) => {
  const p = path.join(REPO, 'requirements', req.params.feature, 'results', req.params.run, req.params.file);
  if (!fs.existsSync(p)) return res.status(404).end();
  res.sendFile(p);
});

// ── Run (SSE) ─────────────────────────────────────────────────────────────────

app.get('/api/run/:feature', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const { feature } = req.params;
  const action = req.query.action || 'run';

  const prompt = action === 'plan'
    ? `Read requirements/${feature}/brd.md and generate a test plan at requirements/${feature}/test-plan.md. Do not run any tests yet — only create the test plan file and stop.`
    : `Run UAT on the ${feature} requirement`;

  const send = (type, text) => res.write(`data: ${JSON.stringify({ type, text })}\n\n`);

  send('start', `$ claude "${prompt}"\n\n`);

  const child = spawn(CLAUDE_BIN, ['--print', '--dangerously-skip-permissions', prompt], {
    cwd: REPO,
    env: process.env,
  });

  const heartbeat = setInterval(() => res.write(': hb\n\n'), 10000);

  child.stdout.on('data', d => send('output', d.toString()));
  child.stderr.on('data', d => send('output', d.toString()));
  child.on('close', code => {
    clearInterval(heartbeat);
    send('done', code === 0 ? 'success' : 'error');
    res.end();
  });
  child.on('error', err => {
    clearInterval(heartbeat);
    send('output', `\nError: ${err.message}\nIs 'claude' installed and in your PATH?\n`);
    send('done', 'error');
    res.end();
  });

  req.on('close', () => { clearInterval(heartbeat); child.kill(); });
});

app.listen(PORT, () => {
  console.log(`\nUAT Console → http://localhost:${PORT}`);
  console.log(`Repo: ${REPO}\n`);
});
