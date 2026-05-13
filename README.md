# UAT with Claude + Playwright MCP

> **This is a proof of concept.** It demonstrates the human-in-the-loop approach to AI-assisted UAT. The CI/CD integration shown below is an aspirational goal — not implemented here.

A lightweight approach to user acceptance testing using Claude as the tester and Playwright MCP as the browser. Claude navigates a live app, works through test scenarios, and produces a pass/fail report with screenshot evidence. No spec files or test framework required.

---

## How it works

### This POC: human-in-the-loop mode

Claude runs inside your IDE. You provide the BRD, review the generated test plan before any testing starts, then watch the report update live as each scenario completes. You can intervene at any point.

**This is what the repo implements.** Follow the setup steps below to get it working.

![UAT workflow — Claude + Playwright MCP](UAT%20workflow.png)

### Aspirational goal: CI/CD integration

The same UAT loop could run automatically after every deploy to staging. Claude reads the BRD and approved test plan, drives the app via Playwright MCP, and either approves the release or captures evidence and files a defect for engineering.

**This is not implemented in this repo** — it's the direction this approach is heading.

![UAT in the CI/CD loop](UAT%20with%20CICD.png)

### Interactive workflow guide

[`uat-workflow.html`](uat-workflow.html) is a standalone HTML page that walks through the full testing workflow step by step. Open it in a browser — no server needed.

---

## What this is (and isn't)

**Is:** Exploratory validation by an AI tester against a live environment. Fast to set up, requires no code, and produces human-readable reports.

**Is not:** A CI regression suite. For automated regression, take the scenarios that fail or that you want to protect, and have an engineer write proper Playwright test files. These are complementary, not competing.

---

## Playwright MCP setup

This is the most critical prerequisite. Claude drives the browser through the Playwright MCP server — if it isn't connected, nothing works.

### Install (one-time, requires Claude Code restart)

```bash
npm install -g @playwright/mcp
npx playwright install chromium
claude mcp add --transport stdio --scope user playwright -- $(which playwright-mcp) --headless
```

Then **restart Claude Code**. After restarting, tools like `browser_navigate`, `browser_snapshot`, `browser_click` etc. are available natively in every session.

### Verify it's working

```bash
claude mcp list
# Should show: playwright  ✓ connected
```

### Gotchas

| Problem | Fix |
|---------|-----|
| `✗ Failed to connect` in `claude mcp list` | Chromium not installed — run `npx playwright install chromium` |
| Startup timeout | `npx` is too slow for the MCP timeout; use the direct binary (`which playwright-mcp`) not `npx @playwright/mcp` |
| "Browser is already in use" on every call | A stale Chrome profile lock from a previous session — run `pkill -f "mcp-chrome"` and retry |
| MCP server not loading | Don't edit `~/.claude/settings.json` directly — `mcpServers` belongs in `~/.claude.json`. Use `claude mcp add` |
| Project `.mcp.json` conflicts | Project-level config takes precedence over user-scope. Keep both in sync or remove `.mcp.json` |
| `playwright-mcp` opens a visible browser | It defaults to headed mode — always pass `--headless` when registering the server |

### Session cleanup (mandatory)

At the end of every session — or at the start if you suspect a stale lock — kill the process:

```bash
pkill -f "mcp-chrome"
```

The MCP server holds a Chrome profile lock. If it isn't released, the next session can't start a browser. Run the kill, wait a second, then verify the first tool call works before proceeding.

---

## Repo structure

```
requirements/
  [feature]/
    brd.md          ← business requirements (human-authored)
    test-plan.md    ← test scenarios (Claude-generated, human-approved)
    results/
      [YYYY-MM-DD HH:mm]/
        report.md   ← pass/fail per scenario, updated live during the run
        tc-01-*.png ← screenshot evidence, one per scenario
app-config.md       ← URL, credentials, login flow (human-maintained)
app-memory.md       ← accumulated knowledge about the app (Claude-maintained)
uat-workflow.html   ← standalone interactive workflow guide (open in browser)
ui/                 ← optional local web UI — simple CRUD over the repo config files
                       (app-config.md, BRDs, test plans); run with `npm start` inside ui/
```

---

## Testing workflow

### 1. Orient

Claude reads `app-config.md` (how to log in) and `app-memory.md` (what it already knows about the app's navigation, quirks, and selectors). Starting from memory means each session is faster than the last.

### 2. Generate a test plan

Claude reads `requirements/[feature]/brd.md` and generates `test-plan.md` if it doesn't exist yet. The test plan is a numbered list of plain-English scenarios — no code, no framework.

**Get the test plan approved before testing begins.** This is the alignment checkpoint. Changing scope mid-run is expensive.

### 3. Pre-create the report

Before opening the browser, Claude creates the results folder and a `report.md` with every scenario marked `⏳ PENDING`. This gives a live view of progress during the run.

```markdown
# UAT Report — [Feature Name]
**Date:** YYYY-MM-DD
**Tester:** Claude (Playwright MCP, headless Chromium)
**Profile:** [test profile]

## Results

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| TC-01 | [name] | ⏳ PENDING | |
| TC-02 | [name] | ⏳ PENDING | |

## Evidence
<!-- Screenshots added here as each scenario completes -->
```

### 4. Run each scenario

For each scenario in order:

1. Navigate and interact using `browser_snapshot` for DOM inspection and element targeting
2. At the key moment, capture evidence with `browser_take_screenshot` — saved as `tc-[nn]-[short-description].png`
3. On failure, take an additional `tc-[nn]-[short-description]-fail.png`
4. **Immediately update `report.md`** — change `⏳ PENDING` to `✅ PASS` or `❌ FAIL` with a one-line observation, and add the screenshot to the Evidence section

Updating after each scenario (not at the end) means the report is useful even if the session is interrupted.

### 5. Finish and clean up

Add a summary line to the report, then kill the browser:

```bash
pkill -f "mcp-chrome"
```

### 6. Update app memory

Claude updates `app-memory.md` with anything new learned: navigation paths that weren't obvious, timing issues, selectors that are reliable vs. fragile, areas of the app that behaved unexpectedly. This knowledge carries forward to every future session.

---

## Key techniques

### DOM snapshots over screenshots for interaction

`browser_snapshot` returns the accessibility tree — roles, element refs, visible text. This is how Claude targets elements for clicks and form fills. It's faster and more reliable than visual matching.

`browser_take_screenshot` is only for report evidence. Never use it to decide what to click.

### Element refs expire between snapshots

Ref IDs (e.g. `e42`, `e163`) are assigned fresh on each snapshot. Always re-snapshot before using a ref that was captured earlier in the session — stale refs will silently target the wrong element or fail.

### Shared data needs care

If the app uses a live shared database, edits and deletes during testing are permanent and affect all users. Mitigations:
- When testing delete flows, rename the target first (e.g. append "UAT Delete Me") so it's clearly a test artefact
- Prefer reversible edits (change a value, verify, restore it)
- Note any data changes in the report so the next run knows the starting state

---

## App memory

`app-memory.md` is Claude's persistent knowledge base about the app. It covers:

- Navigation structure (how to reach each area)
- Login flow and session behaviour
- Reliable selectors for common elements
- Known fragile areas or timing quirks
- What changed between sessions (food counts, test artefacts left behind, etc.)

Claude appends to this file after every session — never rewrites from scratch. Over time it becomes a fast-start guide that makes each run cheaper and more reliable.

---

## Files to maintain

| File | Who maintains it | Purpose |
|------|-----------------|---------|
| `app-config.md` | Human | URL, credentials, login steps |
| `app-memory.md` | Claude | Accumulated app knowledge |
| `requirements/[feature]/brd.md` | Human | Business requirements |
| `requirements/[feature]/test-plan.md` | Claude (human-approved) | Test scenarios |
| `requirements/[feature]/results/*/report.md` | Claude | Pass/fail evidence |
