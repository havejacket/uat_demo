# NutriLog App Memory

Accumulated knowledge from UAT sessions. Append and refine — do not rewrite from scratch.

## Navigation structure

- Header: Switch user button (left) | Day / Week / Weight tabs | ⚙ Settings (right)
- Settings opens as a dialog overlay (not a separate page)
- Food library path: Settings → "Manage saved foods" button (two-thirds down the settings list)
- Food library opens as a second dialog layered on top of Settings

## Day view

- Tabs: **Day** | **Week** | **Weight** | ⚙ (Settings)
- Date navigator (← Today · Tue DD Mon →) — Next day disabled when on today
- Macro summary bar: Calories / Fat / Protein / Carbs vs targets
- **"✨ Suggest meals for the rest of today"** button — opens the suggestions panel
- Meal tabs: Breakfast | Lunch | Dinner | Snacks (each shows logged food + totals)
- "+ Add Food to [Meal]" sticky CTA at bottom

## Meal suggestions panel

- Full-screen overlay, title "Ideas for the rest of today", × close button
- Loading states cycle through fun copy: "Cooking up ideas...", "Plating up...", etc.
- Disabled "Generating..." button during load; becomes "Try another set" when done
- Suggestions are meal cards (label e.g. DINNER, name, description, macros)
- Only meals remaining in the day are suggested (time-aware)
- "IF YOU EAT THIS PLAN:" macro summary with progress bars
- Free-text feedback field for optional refinements
- **"Try another set"** submits feedback + regenerates

## Meal memory / preferences

- Feedback from "Try another set" is curated by a background AI call into durable preferences
- Visible and editable at: Settings → "Edit meal preferences"
- Displayed as a free-text markdown editor; "Save preferences" persists manual edits
- Curation format: `## [Category]\n– [preference]` (e.g. `## Dislikes\n– No mushrooms`)
- One-off steers ("lighter tonight") are NOT stored; only durable facts are kept

## Settings panel

- Daily calorie target (number input)
- Macro split (Fat / Protein / Carbs %) — "Adjust macro split" button
- Goal weight (kg)
- Visible macros toggles (Calories / Fat / Protein / Carbs)
- AI Models — "Manage AI models" button
- Meal preferences — "Edit meal preferences" → opens the memory editor
- Food library — "Manage saved foods" → opens the food library overlay

## Food library

- Full-screen overlay with header showing food count and search field
- Foods listed alphabetically as buttons; each shows name, brand (if set), serving label, kcal/100g
- Clicking a food opens an edit form in-place (header changes to "← Back | [Food Name]")
- Edit fields: Name (required), Brand (optional), kcal/100g, Fat/Carbs/Protein, Serving size (g), Serving label
- Save button is disabled when Name is empty — no inline error message shown
- Save returns to list; updated values reflect immediately
- Delete shows inline confirmation ("Remove [name]?" + Cancel / Yes, delete) before acting
- Edits/deletes affect the global shared `calorie_foods` table — permanent, affects all users
- Back navigation: "← Back" button in header

## Selectors

- Profile buttons: `button "T Test"` (role=button, name includes initial + name)
- Password field: `textbox "Password"`
- Sign in: `button "Sign in"` (disabled until password entered)
- Settings: `button "Settings"` in header
- Manage saved foods: `button "Manage saved foods"`
- Food items in list: role=button, name pattern "[Food name] [serving label] [kcal]/100g ›"
- Search: `textbox "Search foods…"`
- Save: `button "Save changes"`
- Delete: `button "Delete"` → confirmation shows `button "Yes, delete"` and `button "Cancel"`
- Back from edit: `button "Back"` (accessible name), text content "← Back"

## Known fragile areas

- Ref IDs (e.g. e18, e163) change between page loads — always re-snapshot before using a ref
- "← Back" button selector is more stable than ref for back navigation
- `npx playwright` startup too slow for Claude Code MCP timeout — use direct `playwright-mcp` binary
- Browser profile lock persists across sessions — run `pkill -f "mcp-chrome"` to clear at start/end

## Sessions

- 2026-05-12 (run 1): edit-foods UAT — all 7 scenarios passed
- 2026-05-12 (run 2): edit-foods UAT re-run — all 7 scenarios passed; "Protein Yogurt" deleted as test artefact (DB now has 18 foods); browser lock required `pkill -f mcp-chrome` to recover stale session
- 2026-05-12 (run 3): edit-foods UAT re-run — all 7 scenarios passed; "Yogurt (pot) UAT Delete Me" deleted as test artefact (DB now has 17 foods)
