# UAT — Claude + Playwright MCP

## What this repo is

UAT for a web application. Claude navigates the live app using Playwright MCP, works through test scenarios, and produces a pass/fail report with evidence. No spec files required — the goal is validation, not automation.

If a test suite for CI regression is also needed, that is a separate concern for the engineering team.

**App config:** see [`app-config.md`](app-config.md) for the URL, credentials, and login flow.
**App knowledge:** see [`app-memory.md`](app-memory.md) for accumulated insights about how the app works.

## Repo structure

```
requirements/
  [feature]/
    brd.md                  ← business requirements (human-authored)
    test-plan.md            ← test scenarios (generate from brd.md, get approved before testing)
    results/
      [YYYY-MM-DD]/
        report.md           ← pass/fail per scenario with observations
        [scenario].png      ← screenshot at key moment for each scenario
app-config.md               ← URL, credentials, login flow (human-maintained)
app-memory.md               ← accumulated app knowledge across sessions (Claude-maintained)
```

## Testing workflow

For each feature:

1. Read `app-config.md` and `app-memory.md`
2. Read `requirements/[feature]/brd.md`
3. Generate `requirements/[feature]/test-plan.md` from the BRD if it doesn't exist — get it approved before proceeding
4. Create the results folder and **pre-create `report.md`** with all scenarios listed as `⏳ PENDING` before any testing begins:
   ```
   requirements/[feature]/results/[YYYY-MM-DD HH:mm]/
     report.md   ← created now, updated after each scenario
   ```
   Report template:
   ```markdown
   # UAT Report — [Feature Name]
   **Date:** YYYY-MM-DD HH:mm:ss
   **Tester:** Claude (Playwright MCP, headless Chromium)
   **Profile:** [test profile name from app-config.md]
   **Test duration:** [time taken for whole test cycle]

   ## Results

   | # | Scenario | Result | Notes |
   |---|----------|--------|-------|
   | TC-01 | [scenario name] | ⏳ PENDING | |
   | TC-02 | [scenario name] | ⏳ PENDING | |

   ## Evidence
   <!-- Inline screenshots added here as each scenario completes -->
   ```
5. Use Playwright MCP to work through each scenario in the test plan. After each scenario:
   - Use `browser_snapshot` (DOM) for navigation and interaction — do not use screenshots for this
   - Take a screenshot at the key moment using `browser_take_screenshot` — name it `tc-[nn]-[short-description].png` (e.g. `tc-01-food-library-open.png`)
   - On failure, take an additional screenshot named `tc-[nn]-[short-description]-fail.png`
   - **Immediately update `report.md`**: change that scenario from `⏳ PENDING` to `✅ PASS` or `❌ FAIL` with observations, and add an inline image reference to the Evidence section:
     ```markdown
     ### TC-01 — [Scenario name]
     ![TC-01](tc-01-short-description.png)
     ```
     Failure screenshots go on a second line directly below the pass screenshot.
6. When all scenarios are done, add a summary line and any overall observations to `report.md`
7. **Clean up** — kill the browser process so the next session starts clean (see below)

**⚠️ Shared data warning:** The app uses a live shared database. Edits and deletes during testing are permanent and affect all users. When testing delete flows, rename the item first (e.g. append "UAT Delete Me") so it's clearly a test artefact. Data may differ between runs if previous sessions modified it.

## App memory — mandatory

After every session, update `app-memory.md` with anything learned: navigation structure, timing quirks, auth behaviour, reliable selectors, fragile areas. Append and refine — do not rewrite from scratch. The next session should start faster because of this one.

## Session cleanup — mandatory

At the end of every session (or at the start if the browser is already locked), kill the Playwright MCP Chrome process:

```bash
pkill -f "mcp-chrome"
```

The MCP server holds a Chrome profile lock (`mcp-chrome-*` in the Playwright cache). If it isn't released, the next session will get "Browser is already in use" on every tool call and be unable to proceed. Run the kill command, wait a second, then verify the first tool call works before reporting the session clean.

## Playwright MCP — setup

### Proper installation (requires restart, then tools available natively)

Install `@playwright/mcp` globally and register it as a user-scoped MCP server:

```bash
npm install -g @playwright/mcp
npx playwright install chromium
claude mcp add --transport stdio --scope user playwright -- $(which playwright-mcp) --headless
```

After restarting Claude Code, `mcp__playwright__browser_navigate`, `browser_snapshot`, `browser_click` etc. are available as first-class tools.

**Gotchas:**
- `playwright-mcp` defaults to **headed** (visible browser window) unlike vanilla Playwright — always pass `--headless` for background UAT work
- The server must be registered via `claude mcp add`, not by manually editing `~/.claude.json` or `~/.claude/settings.json` (`mcpServers` is not a valid field in `settings.json`; it lives in `~/.claude.json` under the correct schema)
- If the server shows `✗ Failed to connect` in `claude mcp list`, the likely cause is: browsers not installed (run `npx playwright install chromium`), or `npx` startup latency timing out — use the direct binary path from `which playwright-mcp` instead of `npx @playwright/mcp`
- Project-level `.mcp.json` takes precedence over the user-scope config — keep both in sync or remove `.mcp.json` if using user-scope only
- If the Playwright MCP tools are not available, stop and tell the user. Do not fall back to computer use or any visual approach.

### Mid-session / fallback approach (no restart needed)

If the MCP server isn't loaded in the current session, drive it directly over stdio using the helper at `/tmp/mcp_session.js`:

```bash
# Write the helper once per session if needed
cat << 'EOF' > /tmp/mcp_session.js
#!/usr/bin/env node
const { spawn } = require('child_process');
const calls = JSON.parse(process.argv[2]);
const server = spawn(process.env.PLAYWRIGHT_MCP_BIN || 'playwright-mcp', [], { stdio: ['pipe', 'pipe', 'inherit'] });
let buf = '', id = 1, callIndex = 0;
const results = [];
function sendNext() {
  if (callIndex >= calls.length) { console.log(JSON.stringify(results, null, 2)); server.kill(); process.exit(0); }
  const { tool, args } = calls[callIndex++];
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name: tool, arguments: args || {} } }) + '\n');
}
server.stdout.on('data', d => {
  buf += d.toString();
  const lines = buf.split('\n'); buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    if (msg.id === 1) { sendNext(); }
    else if (msg.result) { results.push({ tool: calls[callIndex-1]?.tool, result: msg.result }); sendNext(); }
  }
});
server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'claude', version: '1' } } }) + '\n');
setTimeout(() => { server.kill(); process.exit(1); }, 30000);
EOF

# Then call it with a JSON array of {tool, args} steps — state is preserved across steps
node /tmp/mcp_session.js '[
  {"tool":"browser_navigate","args":{"url":"[app URL from app-config.md]"}},
  {"tool":"browser_snapshot","args":{}}
]'
```

Available tools mirror the native MCP tools: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_wait_for`, `browser_take_screenshot`, etc.

### DOM vs screenshots

Always prefer `browser_snapshot` over `browser_take_screenshot`. Snapshot returns the accessibility tree (structured DOM — roles, refs, text), which is faster, token-efficient, and lets you target elements by `ref=` for clicks and interactions. Only use `browser_take_screenshot` when you need to capture visual evidence for a report.
