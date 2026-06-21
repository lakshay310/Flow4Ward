/**
 * Flow4Ward — Smart startup script
 * 1. Force-kills anything on ports 5000 and 5173
 * 2. Starts backend + frontend dev server
 * 3. Auto-opens browser when servers are ready
 */
const { execSync, spawn } = require('child_process');
const path = require('path');

const ROOT     = __dirname;
const BACKEND  = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const B_PORT   = 5000;
const F_PORT   = 5173;

const cyan    = (s) => `\x1b[36m${s}\x1b[0m`;
const magenta = (s) => `\x1b[35m${s}\x1b[0m`;
const green   = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow  = (s) => `\x1b[33m${s}\x1b[0m`;
const bold    = (s) => `\x1b[1m${s}\x1b[0m`;
const red     = (s) => `\x1b[31m${s}\x1b[0m`;

function log(tag, msg, col) {
  console.log(`${(col || green)(`[${tag}]`)} ${msg}`);
}

// ── Kill any process currently holding a given port (Windows) ────────────────
function killPort(port) {
  try {
    const out = execSync(
      `netstat -ano | findstr LISTENING | findstr :${port}`,
      { shell: true, encoding: 'utf8' }
    );
    const pids = new Set();
    out.trim().split('\n').forEach((line) => {
      const parts = line.trim().split(/\s+/);
      const localAddr = parts[1] || '';
      const pid = parts[parts.length - 1];
      if (localAddr.endsWith(`:${port}`) && /^\d+$/.test(pid) && pid !== '0') {
        pids.add(pid);
      }
    });
    if (pids.size === 0) return;
    pids.forEach((pid) => {
      try {
        execSync(`taskkill /PID ${pid} /F`, { shell: true, stdio: 'ignore' });
        log('KILL', `Freed port ${port} (killed PID ${pid})`, yellow);
      } catch (_) {}
    });
  } catch (_) {
    // Nothing running on this port — that's fine
  }
}

// ── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Open browser (Windows) ───────────────────────────────────────────────────
function openBrowser(url) {
  try {
    execSync(`start "" "${url}"`, { shell: true, stdio: 'ignore' });
    log('BROWSER', `Opened ${url}`, green);
  } catch (_) {}
}

// ── Spawn a server process ───────────────────────────────────────────────────
function startProcess(cmd, cwd, label, col, env = {}) {
  const proc = spawn(cmd, [], {
    cwd,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });
  proc.stdout.on('data', (d) =>
    d.toString().split('\n').filter(Boolean)
      .forEach((l) => process.stdout.write(`${col(`[${label}]`)} ${l}\n`))
  );
  proc.stderr.on('data', (d) =>
    d.toString().split('\n').filter(Boolean)
      .forEach((l) => process.stderr.write(`${col(`[${label}]`)} ${l}\n`))
  );
  proc.on('exit', (code) => {
    if (code !== 0 && code !== null)
      console.error(red(`[${label}] process exited with code ${code}`));
  });
  return proc;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + bold('🚦 Flow4Ward — Starting up...\n'));

  // Step 1: Free ports
  log('SETUP', `Killing any process on ports ${B_PORT} and ${F_PORT}...`, yellow);
  killPort(B_PORT);
  killPort(F_PORT);
  await sleep(1000); // give OS time to release sockets

  // Step 2: Start backend
  log('SETUP', 'Starting backend server (Neon PostgreSQL)...', cyan);
  const backend = startProcess(
    'node server.js',
    BACKEND,
    'BACKEND',
    cyan,
    { PORT: String(B_PORT) }
  );

  // Step 3: Wait for backend to be ready, then start frontend
  await sleep(2500);
  log('SETUP', 'Starting frontend dev server...', magenta);
  const frontend = startProcess(
    `npm run dev -- --port ${F_PORT} --strictPort false`,
    FRONTEND,
    'FRONTEND',
    magenta,
    {
      VITE_BACKEND_PORT: String(B_PORT),
      VITE_BACKEND_URL: `http://localhost:${B_PORT}`,
    }
  );

  // Step 4: Open browser after giving Vite ~3s to compile
  await sleep(3000);
  const url = `http://localhost:${F_PORT}`;
  console.log('\n' + bold('━'.repeat(50)));
  console.log(bold(`  🌐  Website  → ${green(url)}`));
  console.log(bold(`  🔌  API      → ${cyan(`http://localhost:${B_PORT}/api/health`)}`));
  console.log(bold('━'.repeat(50)) + '\n');
  openBrowser(url);

  // ── Keep process alive so child servers don't die when main() resolves ──────
  process.stdin.resume();

  // Graceful Ctrl+C
  const shutdown = () => {
    log('SHUTDOWN', 'Stopping all servers...', yellow);
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
    setTimeout(() => process.exit(0), 500);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
