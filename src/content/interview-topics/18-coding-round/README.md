# 13 — Coding Round Question Bank

> Easy English. Every question comes with its answer and a short explanation.
> All code is **JavaScript / TypeScript** and **PostgreSQL**.
> **Reading answers is not practice.** Cover the answer, write it yourself, *then* compare.

---

## The four parts — basic → advanced

| File | What is inside | Count |
|---|---|---|
| [01 — JS Logic Questions](01-js-logic.md) ⭐ | Strings, numbers, arrays, objects — **every question solved twice: with built-in functions and without** | 55 |
| [02 — DSA](02-dsa.md) | Problems grouped by pattern, **2-year developer level**, with a "must do first" list | 50 |
| [03 — SQL Queries](03-sql.md) | Basics → joins → subqueries → **window functions** → advanced, plus 12 theory questions | 45 + 12 |
| [04 — Basic Tasks](04-basic-tasks.md) ⭐ | **Create an API** (Express, NestJS, Prisma, auth, upload) · **Call an API** (fetch, axios, parallel, pagination, retry) · React (list, search, form, todo) · small Node tasks | 20 |

### Which order?

| If your round is… | Start with |
|---|---|
| A service company / first round | **01** Logic → **03** SQL L1–L3 → **04** tasks K1, K8, K14 |
| A product company | **02** DSA "Must do" → **03** SQL L4 → **01** |
| A take-home / machine-coding round | **04** Basic Tasks + the take-home checklist at its end |

---

## How to solve ANY coding question — 6 steps

Say these steps out loud. Interviewers score **how you think**, not only the final code.

| Step | What you do | What you say |
|---|---|---|
| **1. Understand** | Repeat the problem. Ask about empty input, duplicates, negatives. | "Can the array be empty? Can there be duplicates?" |
| **2. Example** | Work through one normal and one edge example by hand. | "For `[2, 7, 11]` and target 9, the answer is 2 and 7." |
| **3. Simple solution** | Say the easy (brute force) way and its cost. | "Checking every pair is O(n²)." |
| **4. Better solution** | Find a faster way. | "If I remember what I have seen in an object, one loop is enough — O(n)." |
| **5. Code** | Clean names, keep talking. | "This loop counts; this line checks the pair." |
| **6. Test** | Run your example through the code. Check edge cases. Say the time complexity. | "An empty array returns `[]`. Time O(n)." |

⭐ **If you are stuck, think out loud.** "I need to avoid the nested loop — maybe an object to count, or
sorting first." Silence is the only real failure.

---

## "If you see X, think Y"

| The question says… | Think… |
|---|---|
| "Count", "frequency", "duplicates", "have I seen it" | An **object / Map / Set** |
| "Sorted array", "pair", "palindrome" | **Two pointers** (one at each end) |
| "Longest / shortest continuous part" | **Sliding window** |
| "Brackets", "next greater", "undo" | **Stack** |
| "Sorted" + "find fast" | **Binary search** |
| "Top K", "K-th largest" | Sort, or a **heap** |
| "Overlapping times", "meetings", "bookings" | **Sort by start time** |
| "Tree", "levels" | **Recursion** or a **queue** (BFS) |
| "Grid", "islands", "connected" | **DFS / BFS** |
| "How many ways", "minimum cost" | **Dynamic programming** |
| "All combinations" | **Backtracking** |

---

## Big-O in one table

| Complexity | Example | 1 million items |
|---|---|---|
| O(1) | Object / Map lookup | Instant |
| O(log n) | Binary search | ~20 steps |
| O(n) | One loop | Fine |
| O(n log n) | Sorting | Fine |
| O(n²) | Loop inside a loop | ⚠️ Too slow |

---

## JavaScript traps in coding rounds

| Trap | Fix |
|---|---|
| `[10, 1, 3].sort()` sorts as **text** → `[1, 10, 3]` | `arr.sort((a, b) => a - b)` |
| `sort()` and `reverse()` **change the original** | Copy first: `[...arr].sort(...)` |
| `fetch` does **not** throw on 404 / 500 | Check `res.ok` |
| `arr.forEach(async …)` does **not** wait | Use `for...of` or `Promise.all` |
| Object keys become **strings** (`1` and `'1'` are the same key) | Use a `Map` when it matters |
| `new Array(3).fill([])` shares **one** array | `Array.from({ length: 3 }, () => [])` |
| `Math.max(...hugeArray)` can crash | Use a loop |
| `0.1 + 0.2 !== 0.3` | Keep money in paise (integers) |

---

## 3-week practice plan

| Week | Do |
|---|---|
| **1** | 01 Logic — all 55 (both versions) · 03 SQL L1–L2 · 04 tasks K1, K8, K9 |
| **2** | 02 DSA "Must do" list · 03 SQL L3–L4 · 04 tasks K2, K3, K11, K14, K16 |
| **3** | 02 DSA "Good to know" · 03 SQL L5 + theory · 04 remaining tasks · **one timed mock round** |

**Every day:** 3–5 questions, **timed** (easy 10 min, medium 20 min), **out loud**, written without
looking. Mark each ✅ done or 🔁 redo. Your redo list is where the learning happens.
