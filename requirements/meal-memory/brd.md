# **BRD: Edit Saved Foods**

Feature: Food library management  
Status: Shipped (branch `claude/edit-saved-foods-RDT0w`)  
---

## Problem

NutriLog builds a shared food library (`calorie_foods`) automatically — from label scans and AI-parsed log entries. There was no way to correct or remove an entry. A mis-read label or wrong AI estimate would silently persist and re-surface in autocomplete forever, producing systematically wrong calorie and macro totals.

## Objectives

1. Let users correct inaccurate macro data for any saved food  
2. Let users remove duplicates or irrelevant entries  
3. Keep it discoverable but out of the main logging flow

## User Stories

* As a user, I want to edit the name, brand, and per-100g macros of a saved food so future logs are accurate.  
* As a user, I want to edit the serving size and label so the portion picker shows the right defaults.  
* As a user, I want to delete a food so it stops appearing in autocomplete.  
* As a user, I want to search the library so I can find a specific item quickly.

## Functional Requirements

Access: Settings → Food library → Manage saved foods (full-screen overlay).  
List view

* All foods sorted alphabetically; total count in header  
* Search filters by name and brand in real time  
* Each row shows: name, brand, serving description, kcal/100g

Edit view

* Fields: Name (required), Brand, kcal/100g, Fat, Carbs, Protein, Serving size (g), Serving label  
* Save writes to `calorie_foods`; returns to list  
* Delete requires two-step confirmation to prevent accidents

Data behaviour

* Reads/writes the global shared `calorie_foods` table — edits affect all users  
* Add Food autocomplete picks up changes on the next open (DayView re-fetches on modal open)

## Out of Scope

* Per-user food libraries  
* Bulk edit / import / export  
* Creating foods from scratch (foods enter via scan or AI parse only)  
* Change history / audit log

## Success Metrics

* A user can correct a mis-scanned value in under 30 seconds  
* No regressions in Add Food autocomplete or the portion-pick flow
