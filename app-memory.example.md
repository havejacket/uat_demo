# [Your App Name] App Memory

Accumulated knowledge from UAT sessions. Append and refine — do not rewrite from scratch.

Copy this file to `app-memory.md` to start a new project. `app-memory.md` is gitignored.

## Navigation structure

- Describe top-level navigation (e.g. header tabs, sidebar links)
- Note any overlays or dialogs that open on top of the main view
- Document the path to key areas (e.g. Settings → "Manage X" → opens overlay)

## [Key screen / feature 1]

- Describe the layout and key elements
- Note any tabs, CTAs, or states worth remembering

## [Key screen / feature 2]

- Describe the layout and key elements

## Selectors

Document stable element selectors so future sessions can target them reliably:

- Primary CTA: `button "Submit"`
- Search input: `textbox "Search…"`
- Confirmation: `button "Yes, confirm"` / `button "Cancel"`

## Known fragile areas

- List timing issues, flaky selectors, or interactions that need extra care
- Note any workarounds discovered (e.g. re-snapshot before using a ref)

## Sessions

- YYYY-MM-DD: [Feature] UAT — [summary of results and any data changes]
