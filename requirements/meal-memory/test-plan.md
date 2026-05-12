# Meal Memory — Test Plan

Generated from `brd.md`. Covers the full feedback → curation → memory → suggestion cycle.

---

## Test approach

**State management:** Each scenario that modifies memory first uses Settings → Edit meal preferences → clear the textarea → Save preferences to establish a known empty state. This avoids inter-test pollution without needing DB access.

**Async curation:** After "Try another set" with feedback, the new suggestion set loads (~10s). Memory is checked *after* that load completes — by that point the background curation call has had time to write. A short poll/retry on the memory editor content handles any residual lag.

**User:** All tests run as the **Test** profile (password: `test`).

---

## Scenarios

### MM-01 — Hard dislike is stored in memory

**Covers:** BRD step 2–4; checklist item "Submit feedback with a hard dislike → appears in memory on next load"

**Pre-condition:** Memory is empty (cleared via Settings before test).

**Steps:**
1. Log in as Test
2. Open Settings → Edit meal preferences → clear content → Save preferences
3. Return to Day view → click "Suggest meals for the rest of today"
4. Wait for suggestions to load
5. In the feedback field type: `I won't eat mushrooms — strong dislike`
6. Click "Try another set"
7. Wait for new suggestions to load
8. Close the suggestions panel (× button)
9. Open Settings → Edit meal preferences

**Expected:** The memory textarea contains a bullet referencing mushrooms (e.g. `No mushrooms` or `mushroom dislike`). It does **not** contain anything that looks like a one-off steer.

---

### MM-02 — One-off steer is NOT stored

**Covers:** BRD step 3 (curation discards one-off steers); checklist item "Submit a one-off steer → memory unchanged"

**Pre-condition:** Memory is empty (cleared via Settings before test).

**Steps:**
1. Log in as Test
2. Open Settings → Edit meal preferences → clear content → Save preferences
3. Return to Day view → click "Suggest meals for the rest of today"
4. Wait for suggestions to load
5. In the feedback field type: `lighter tonight please`
6. Click "Try another set"
7. Wait for new suggestions to load
8. Close panel → Settings → Edit meal preferences

**Expected:** The memory textarea is still empty (or unchanged from pre-condition). The phrase "lighter" does not appear.

---

### MM-03 — Allergy is stored and respected by subsequent suggestions

**Covers:** BRD "Allergies / intolerances" category; checklist "Submit an allergy → never appears in subsequent suggestions"

**Pre-condition:** Memory is empty.

**Steps:**
1. Log in as Test, clear memory
2. Click "Suggest meals for the rest of today" → wait for load
3. Type feedback: `I'm allergic to peanuts`
4. Click "Try another set" → wait for load
5. Check memory editor: expect a peanut allergy entry
6. Close panel → click "Suggest meals for the rest of today" again (no feedback this time)
7. Wait for fresh suggestions

**Expected:**
- Memory contains a peanut allergy entry (step 5)
- New suggestions contain no peanuts, peanut butter, satay, or peanut-based sauces (step 7) — checked via page text

---

### MM-04 — Contradicting feedback updates the existing entry

**Covers:** BRD step 3 ("updates it"); checklist "Submit feedback that contradicts existing memory → old entry updated/replaced"

**Pre-condition:** Memory is pre-seeded via Settings with:
```
## Dislikes
– No salmon
```

**Steps:**
1. Log in as Test
2. Open Settings → set memory to `## Dislikes\n– No salmon` → Save preferences
3. Click "Suggest meals for the rest of today" → wait for load
4. Type feedback: `Actually I love salmon now, please include it`
5. Click "Try another set" → wait for load
6. Open Settings → Edit meal preferences

**Expected:** Memory no longer contains "no salmon" as a dislike. It may contain a positive salmon preference or simply omit the old entry.

---

### MM-05 — Memory is applied to the next suggestion request

**Covers:** BRD step 5 (client passes memory in request body); checklist "Suggestion with memory loaded respects all stored constraints"

**Pre-condition:** Memory is pre-seeded via Settings with:
```
## Dislikes
– No chicken
```

**Steps:**
1. Log in as Test
2. Open Settings → set memory as above → Save preferences
3. Click "Suggest meals for the rest of today" → wait for load
4. Read all suggestion card titles and descriptions

**Expected:** No suggestion card contains the word "chicken" (case-insensitive) in its title or description.

---

### MM-06 — New user with no memory gets suggestions without error

**Covers:** BRD step 5 (graceful absent memory); checklist "Suggestion without a memory file (new user) works fine"

**Pre-condition:** Memory is empty.

**Steps:**
1. Log in as Test
2. Clear memory via Settings → Edit meal preferences → Save preferences
3. Click "Suggest meals for the rest of today"
4. Wait for suggestions to load

**Expected:** Suggestions panel loads successfully (no error state, no spinner stuck). At least one meal card is visible.

---

### MM-07 — Memory stays bounded after many feedback rounds

**Covers:** Checklist "Memory file stays ≤ 25 bullets after many feedback rounds (curation prunes)"

**Pre-condition:** Memory is empty.

**Steps:**
1. Log in as Test, clear memory
2. Repeat 6 times:
   a. Click "Suggest meals for the rest of today" → wait
   b. Enter a distinct durable-preference feedback (see list below)
   c. Click "Try another set" → wait for new suggestions
3. Close panel → Settings → Edit meal preferences → count bullet points (`–` characters)

**Feedback strings to use (all durable — should be stored):**
1. `I'm vegetarian, no meat at all`
2. `I love Thai food`
3. `No dairy — lactose intolerant`
4. `Weeknight meals must be under 30 minutes`
5. `I enjoy Japanese cuisine`
6. `No nuts of any kind — tree nut allergy`

**Expected:** The memory textarea contains ≤ 25 bullet points. All 6 distinct preferences are represented (none silently dropped). No duplicates.

---

## Out of scope for this test plan

- Direct DB verification of `calorie_meal_feedback` (append-only log) — verified implicitly via the memory outcome
- Concurrent multi-user isolation — not covered by the Test account setup
- Memory behaviour across different devices/sessions — not in scope for POC
