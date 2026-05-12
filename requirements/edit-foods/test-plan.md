# Test Plan — Edit Saved Foods

**Feature:** Food library management
**App:** NutriLog (https://feedmyass.netlify.app)
**BRD:** `requirements/edit-foods/brd.md`

## Scenarios

### TC-01 — Access food library
Navigate to Settings → Food library → "Manage saved foods". Verify the full-screen overlay opens, shows a list of foods sorted alphabetically, and displays a total count in the header.

### TC-02 — Real-time search
With the library open, type a partial name into the search field. Verify the list filters in real time to show only matching results. Clear the search and verify the full list returns.

### TC-03 — Edit a food's macros
Open a food item, change one or more macro fields (e.g. kcal/100g), and save. Verify the updated values are reflected in the list view.

### TC-04 — Edit a food's serving info
Open a food item, change the serving size and serving label, and save. Verify the changes persist.

### TC-05 — Validation: name required
Open a food item, clear the Name field, and attempt to save. Verify the save is blocked and an error or indication is shown.

### TC-06 — Delete with two-step confirmation
Open a food item and tap Delete. Verify a confirmation step appears. Confirm the deletion. Verify the food no longer appears in the list.

### TC-07 — Delete cancellation
Open a food item and tap Delete. At the confirmation step, cancel. Verify the food remains in the list.
