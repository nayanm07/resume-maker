# 03 — SQL Query Question Bank (PostgreSQL)

> Easy English. **One schema for every question** — a clinic system, which is your real domain.
> Read the schema once, then the questions feel natural. Back to [the coding round guide](README.md).

| Level | What | Questions | For 2 years? |
|---|---|---|---|
| **L1** | Basics — filter, sort, NULL, CASE | S1–S8 | ✅ Must |
| **L2** | Joins and aggregation | S9–S18 | ✅ Must |
| **L3** | Subqueries, CTEs, duplicates | S19–S27 | ✅ Must |
| **L4** | ⭐ Window functions | S28–S37 | ✅ Very often asked |
| **L5** | Advanced — recursive, streaks, overlaps, upsert, JSONB | S38–S45 | 🔸 Good to know |
| **Theory** | The spoken SQL questions | T1–T12 | ✅ Must |

**How to answer:** say what the query must do in one line, write it, then name **one trap** (NULLs,
duplicates, timezones, or performance).

---

## The schema

```sql
CREATE TABLE clinics (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  city       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE doctors (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clinic_id  bigint NOT NULL REFERENCES clinics(id),
  name       text NOT NULL,
  specialty  text NOT NULL,
  fee_paise  integer NOT NULL                        -- money as integer paise
);

CREATE TABLE patients (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clinic_id   bigint NOT NULL REFERENCES clinics(id),
  name        text NOT NULL,
  phone       text,                                  -- can be NULL
  referred_by bigint REFERENCES patients(id),        -- who referred this patient
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE appointments (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clinic_id  bigint NOT NULL REFERENCES clinics(id),
  doctor_id  bigint NOT NULL REFERENCES doctors(id),
  patient_id bigint NOT NULL REFERENCES patients(id),
  starts_at  timestamptz NOT NULL,
  ends_at    timestamptz NOT NULL,
  status     text NOT NULL CHECK (status IN ('booked', 'completed', 'cancelled', 'no_show')),
  metadata   jsonb NOT NULL DEFAULT '{}',            -- e.g. {"source": "whatsapp"}
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id bigint NOT NULL REFERENCES appointments(id),
  amount_paise   integer NOT NULL,
  status         text NOT NULL CHECK (status IN ('paid', 'failed', 'refunded')),
  paid_at        timestamptz
);

-- the classic interview table — salaries and a manager hierarchy
CREATE TABLE employees (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  department text NOT NULL,
  salary     integer NOT NULL,
  manager_id bigint REFERENCES employees(id)
);
```

---
---

# L1 — BASICS

---

### S1. All doctors in clinic 9, sorted by name — Easy
```sql
SELECT id, name, specialty
FROM doctors
WHERE clinic_id = 9
ORDER BY name;
```
**Trap:** without `ORDER BY`, the row order is **not guaranteed** — even if it looks sorted today.

### S2. ⭐ Today's appointments (India time) — Medium
```sql
SELECT id, doctor_id, patient_id, starts_at
FROM appointments
WHERE starts_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')) AT TIME ZONE 'Asia/Kolkata'
  AND starts_at <  (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata'
ORDER BY starts_at;
```
**Idea:** find **midnight in India** and the next midnight, then use a range.
**Two traps:**
1. **Timezone** — the server runs in UTC, so "today" in UTC is wrong for Indian clinics.
2. **Index use** — `WHERE starts_at::date = current_date` wraps the column in a function, so a normal
   index on `starts_at` cannot be used. A **range** on the raw column can.

### S3. Count appointments by status — Easy
```sql
SELECT status, COUNT(*) AS total
FROM appointments
GROUP BY status
ORDER BY total DESC;
```

### S4. Patients whose name starts with "ra" (any case) — Easy
```sql
SELECT id, name
FROM patients
WHERE name ILIKE 'ra%';
```
`LIKE` is case-sensitive; `ILIKE` is not (Postgres). `'ra%'` can use an index; `'%ra%'` (wildcard at
the start) **cannot** — it scans the whole table.

### S5. Cities and how many clinics each has — Easy
```sql
SELECT city, COUNT(*) AS clinics
FROM clinics
GROUP BY city
ORDER BY clinics DESC, city;
```
Just the list of cities: `SELECT DISTINCT city FROM clinics;`

### S6. The 5 most expensive doctors — including ties — Easy
```sql
SELECT name, specialty, fee_paise
FROM doctors
ORDER BY fee_paise DESC
FETCH FIRST 5 ROWS WITH TIES;
```
**Why `WITH TIES`:** with `LIMIT 5`, if the 5th and 6th doctors have the same fee, one is dropped at
random. `WITH TIES` keeps both.

### S7. ⭐ NULL handling — Easy
```sql
SELECT id, name FROM patients WHERE phone IS NULL;        -- ✅
SELECT id, name FROM patients WHERE phone = NULL;         -- ❌ always returns nothing

SELECT name, COALESCE(phone, 'not given') AS phone FROM patients;
```
**Why:** `NULL` means "unknown". `NULL = NULL` is not true — it is **unknown**. Use `IS NULL`.
`COALESCE` returns the first value that is not NULL.

### S8. Label doctors by fee band (CASE) — Easy
```sql
SELECT name,
       fee_paise / 100 AS fee_rupees,
       CASE
         WHEN fee_paise >= 100000 THEN 'premium'
         WHEN fee_paise >= 50000  THEN 'standard'
         ELSE 'basic'
       END AS band
FROM doctors;
```
**Trap:** `CASE` stops at the **first** true condition — order the `WHEN`s from biggest to smallest.

---
---

# L2 — JOINS AND AGGREGATION

---

### S9. Appointment list with doctor and patient names — Easy
```sql
SELECT a.id, a.starts_at, d.name AS doctor, p.name AS patient, a.status
FROM appointments a
JOIN doctors  d ON d.id = a.doctor_id
JOIN patients p ON p.id = a.patient_id
WHERE a.clinic_id = 9
ORDER BY a.starts_at;
```

### S10. ⭐ Doctors with no appointments at all — Easy
```sql
-- version 1: LEFT JOIN, keep rows with no match
SELECT d.id, d.name
FROM doctors d
LEFT JOIN appointments a ON a.doctor_id = d.id
WHERE a.id IS NULL;

-- version 2: NOT EXISTS (often clearer)
SELECT d.id, d.name
FROM doctors d
WHERE NOT EXISTS (SELECT 1 FROM appointments a WHERE a.doctor_id = d.id);
```
**Name for this:** an **anti-join** — "rows in A with no match in B".

### S11. ⭐ Revenue per clinic — including clinics with zero — Medium
```sql
SELECT c.name AS clinic,
       COALESCE(SUM(p.amount_paise), 0) / 100.0 AS revenue_rupees
FROM clinics c
LEFT JOIN appointments a ON a.clinic_id = c.id
LEFT JOIN payments p     ON p.appointment_id = a.id
                        AND p.status = 'paid'          -- ⭐ in ON, not in WHERE
GROUP BY c.id, c.name
ORDER BY revenue_rupees DESC;
```
**⭐ The trap they test:** `WHERE p.status = 'paid'` removes the rows where `p` is NULL — the LEFT JOIN
quietly becomes an INNER JOIN, and clinics with no revenue disappear.
**Filter the right-hand table in `ON`, not in `WHERE`.**

### S12. Doctors with more than 20 completed appointments last month — Medium
```sql
SELECT d.name, COUNT(*) AS completed
FROM doctors d
JOIN appointments a ON a.doctor_id = d.id
WHERE a.status = 'completed'
  AND a.starts_at >= date_trunc('month', now()) - interval '1 month'
  AND a.starts_at <  date_trunc('month', now())
GROUP BY d.id, d.name
HAVING COUNT(*) > 20
ORDER BY completed DESC;
```
**`WHERE` vs `HAVING`:** `WHERE` filters **rows before** grouping. `HAVING` filters **groups after**.
You cannot use `COUNT(*)` in `WHERE`.

### S13. Average fee per specialty — only specialties with 3+ doctors — Easy
```sql
SELECT specialty,
       ROUND(AVG(fee_paise) / 100.0, 2) AS avg_fee_rupees,
       COUNT(*) AS doctors
FROM doctors
GROUP BY specialty
HAVING COUNT(*) >= 3;
```

### S14. Patients who saw more than one doctor — Medium
```sql
SELECT p.id, p.name, COUNT(DISTINCT a.doctor_id) AS doctors_seen
FROM patients p
JOIN appointments a ON a.patient_id = p.id
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT a.doctor_id) > 1;
```
**Trap:** `COUNT(a.doctor_id)` counts **visits**; `COUNT(DISTINCT a.doctor_id)` counts **doctors**.

### S15. ⭐ Every employee with their manager's name (self-join) — Easy
```sql
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;
```
**Why LEFT:** the top boss has no manager. An inner join would drop them.

### S16. ⭐ Employees who earn more than their manager — Easy (classic)
```sql
SELECT e.name, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;
```

### S17. `UNION` vs `UNION ALL` — Easy
```sql
SELECT name, 'doctor' AS role FROM doctors WHERE clinic_id = 1
UNION ALL
SELECT name, 'patient' FROM patients WHERE clinic_id = 1;
```
`UNION` removes duplicates (an extra sort — slower). `UNION ALL` keeps everything (faster). Use
`UNION ALL` unless you really need to remove duplicates.

### S18. ⭐ No-show rate per doctor (conditional counting) — Medium
```sql
SELECT d.name,
       COUNT(*) FILTER (WHERE a.status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE a.status = 'no_show')   AS no_shows,
       ROUND(
         100.0 * COUNT(*) FILTER (WHERE a.status = 'no_show')
         / NULLIF(COUNT(*) FILTER (WHERE a.status IN ('completed', 'no_show')), 0),
         1
       ) AS no_show_pct
FROM doctors d
JOIN appointments a ON a.doctor_id = d.id
GROUP BY d.id, d.name
ORDER BY no_show_pct DESC NULLS LAST;
```
**Three tricks:** `FILTER (WHERE …)` counts only some rows (portable version:
`SUM(CASE WHEN … THEN 1 ELSE 0 END)`). `NULLIF(x, 0)` avoids **division by zero**. `100.0`, not `100` —
integer division would round everything to 0.

---
---

# L3 — SUBQUERIES, CTEs AND DUPLICATES

---

### S19. ⭐ Second highest salary — Easy (the most asked SQL question)
```sql
-- version 1: the max below the max
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- version 2: skip the first distinct salary
SELECT DISTINCT salary
FROM employees
ORDER BY salary DESC
OFFSET 1 LIMIT 1;
```
**Trap:** `DISTINCT` matters — if two people share the top salary, the second row is still the top one.
**Edge case:** only one salary → version 1 returns `NULL`, version 2 returns no rows.

### S20. ⭐ Nth highest salary — overall and per department — Medium
```sql
-- 3rd highest overall
SELECT DISTINCT salary
FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees) t
WHERE rnk = 3;

-- 2nd highest in every department
SELECT department, name, salary
FROM (
  SELECT e.*, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
  FROM employees e
) t
WHERE rnk = 2;
```
**Why `DENSE_RANK`:** ties share a rank and **no numbers are skipped** — exactly what "Nth highest"
means. (See S28 for the three ranking functions.)

### S21. Employees paid above their department's average — Medium
```sql
-- version 1: correlated subquery
SELECT e.name, e.department, e.salary
FROM employees e
WHERE e.salary > (SELECT AVG(x.salary) FROM employees x WHERE x.department = e.department);

-- version 2: window function (one pass)
SELECT name, department, salary, ROUND(dept_avg) AS dept_avg
FROM (
  SELECT e.*, AVG(salary) OVER (PARTITION BY department) AS dept_avg
  FROM employees e
) t
WHERE salary > dept_avg;
```
**Say:** "A correlated subquery depends on the outer row, so it conceptually runs once per row. The
window version computes each average once."

### S22. ⭐ Find duplicate patients (same clinic + phone) — Easy
```sql
SELECT clinic_id, phone, COUNT(*) AS copies, array_agg(id ORDER BY id) AS ids
FROM patients
WHERE phone IS NOT NULL
GROUP BY clinic_id, phone
HAVING COUNT(*) > 1;
```

### S23. ⭐ Delete duplicates, keep the oldest — Medium
```sql
-- version 1: delete every row that has a twin with a smaller id
DELETE FROM patients p
USING patients keep
WHERE p.clinic_id = keep.clinic_id
  AND p.phone     = keep.phone
  AND p.id        > keep.id;

-- version 2: number the copies, delete all but the first
DELETE FROM patients
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY clinic_id, phone ORDER BY id) AS rn
    FROM patients
    WHERE phone IS NOT NULL
  ) t
  WHERE rn > 1
);
```
**Say:** "Before deleting, I move their appointments to the kept patient — otherwise the foreign key
blocks the delete. Then I add `UNIQUE (clinic_id, phone)` so duplicates cannot come back. And I run it
inside a transaction first."

### S24. ⭐⭐ The `NOT IN` NULL trap — Medium (a favourite trick question)
**Problem:** patients who have never referred anyone.
```sql
-- ❌ returns ZERO rows if even one referred_by is NULL
SELECT name FROM patients
WHERE id NOT IN (SELECT referred_by FROM patients);

-- ✅ correct
SELECT name FROM patients p
WHERE NOT EXISTS (SELECT 1 FROM patients r WHERE r.referred_by = p.id);
```
**Why:** `x NOT IN (1, 2, NULL)` means `x <> 1 AND x <> 2 AND x <> NULL`. The last part is **unknown**,
so the whole condition is never true. **Prefer `NOT EXISTS`.**

### S25. Monthly revenue with a CTE — Easy
```sql
WITH monthly AS (
  SELECT date_trunc('month', paid_at) AS month,
         SUM(amount_paise) AS revenue
  FROM payments
  WHERE status = 'paid'
  GROUP BY 1
)
SELECT month, revenue / 100.0 AS revenue_rupees
FROM monthly
ORDER BY month;
```
**CTE (`WITH`)** = a named step that makes long queries readable top to bottom.

### S26. `EXISTS` — patients with at least one no-show — Easy
```sql
SELECT p.id, p.name
FROM patients p
WHERE EXISTS (
  SELECT 1 FROM appointments a
  WHERE a.patient_id = p.id AND a.status = 'no_show'
);
```
**Why not a JOIN:** a join returns the patient **once per no-show** (duplicates). `EXISTS` stops at the
first match and returns each patient once.

### S27. Latest appointment per patient — Postgres shortcut — Medium
```sql
SELECT DISTINCT ON (patient_id)
       patient_id, id AS appointment_id, starts_at, status
FROM appointments
ORDER BY patient_id, starts_at DESC;
```
**`DISTINCT ON`** keeps the **first row of each group** according to `ORDER BY`. Postgres-only — the
portable version uses `ROW_NUMBER()` (S29).

---
---

# L4 — ⭐ WINDOW FUNCTIONS

> **The idea:** a window function calculates across **related rows** but, unlike `GROUP BY`, **keeps
> every row**. `OVER (PARTITION BY … ORDER BY …)` says which rows are related and in what order.

---

### S28. ⭐ `ROW_NUMBER` vs `RANK` vs `DENSE_RANK` — Easy (always asked)
```sql
SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
       RANK()       OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk
FROM employees;
```

| salary | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| 900 | 1 | 1 | 1 |
| 800 | 2 | 2 | 2 |
| 800 | 3 | 2 | 2 |
| 700 | 4 | **4** | **3** |

`ROW_NUMBER` is always unique. `RANK` gives ties the same number and **skips** after. `DENSE_RANK` gives
ties the same number and **does not skip**.

### S29. ⭐ Latest appointment per patient — portable version — Medium
```sql
SELECT patient_id, id AS appointment_id, starts_at
FROM (
  SELECT a.*, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY starts_at DESC) AS rn
  FROM appointments a
) t
WHERE rn = 1;
```
**Pattern "latest / top 1 per group":** number the rows in each group, keep row 1.
**Trap:** you cannot write `WHERE rn = 1` in the same query — window functions run **after** `WHERE`.

### S30. ⭐⭐ Top 3 doctors by revenue in each clinic — Medium
```sql
WITH doctor_revenue AS (
  SELECT a.clinic_id, a.doctor_id, SUM(p.amount_paise) AS revenue
  FROM appointments a
  JOIN payments p ON p.appointment_id = a.id AND p.status = 'paid'
  GROUP BY a.clinic_id, a.doctor_id
),
ranked AS (
  SELECT dr.*, DENSE_RANK() OVER (PARTITION BY clinic_id ORDER BY revenue DESC) AS rnk
  FROM doctor_revenue dr
)
SELECT r.clinic_id, d.name, r.revenue / 100.0 AS revenue_rupees, r.rnk
FROM ranked r
JOIN doctors d ON d.id = r.doctor_id
WHERE r.rnk <= 3
ORDER BY r.clinic_id, r.rnk;
```
**Choice to say:** `ROW_NUMBER` for exactly 3 rows; `DENSE_RANK` to include ties.

### S31. ⭐ Running total of daily revenue — Easy
```sql
WITH daily AS (
  SELECT paid_at::date AS day, SUM(amount_paise) AS revenue
  FROM payments
  WHERE status = 'paid'
  GROUP BY 1
)
SELECT day, revenue,
       SUM(revenue) OVER (ORDER BY day) AS running_total
FROM daily
ORDER BY day;
```
`SUM(...) OVER (ORDER BY day)` = the sum of everything **up to this row**.

### S32. ⭐ Month-over-month growth with `LAG` — Medium
```sql
WITH monthly AS (
  SELECT date_trunc('month', paid_at) AS month, SUM(amount_paise) AS revenue
  FROM payments
  WHERE status = 'paid'
  GROUP BY 1
)
SELECT month,
       revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_month,
       ROUND(
         100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
         / NULLIF(LAG(revenue) OVER (ORDER BY month), 0),
         1
       ) AS growth_pct
FROM monthly
ORDER BY month;
```
**`LAG`** = the value from the previous row. **`LEAD`** = the next row.

### S33. 7-day moving average — Medium
```sql
WITH daily AS (
  SELECT paid_at::date AS day, SUM(amount_paise) AS revenue
  FROM payments
  WHERE status = 'paid'
  GROUP BY 1
)
SELECT day, revenue,
       ROUND(AVG(revenue) OVER (
         ORDER BY day
         RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW
       )) AS avg_7_days
FROM daily
ORDER BY day;
```
**Trap:** `ROWS BETWEEN 6 PRECEDING` counts **rows**, not days — if some days have no revenue, 6 rows
could cover two weeks. `RANGE … INTERVAL '6 days'` uses real dates.

### S34. Each doctor's share of their clinic's revenue — Medium
```sql
WITH doctor_revenue AS (
  SELECT a.clinic_id, a.doctor_id, SUM(p.amount_paise) AS revenue
  FROM appointments a
  JOIN payments p ON p.appointment_id = a.id AND p.status = 'paid'
  GROUP BY a.clinic_id, a.doctor_id
)
SELECT clinic_id, doctor_id, revenue,
       ROUND(100.0 * revenue / SUM(revenue) OVER (PARTITION BY clinic_id), 1) AS pct_of_clinic
FROM doctor_revenue
ORDER BY clinic_id, pct_of_clinic DESC;
```
`SUM() OVER (PARTITION BY clinic_id)` puts the **clinic total on every row**, so you can divide directly.

### S35. First and last visit per patient — Medium
```sql
SELECT patient_id,
       MIN(starts_at) AS first_visit,
       MAX(starts_at) AS last_visit,
       MAX(starts_at)::date - MIN(starts_at)::date AS days_between
FROM appointments
WHERE status = 'completed'
GROUP BY patient_id;

-- the first doctor each patient saw
SELECT DISTINCT patient_id,
       FIRST_VALUE(doctor_id) OVER (PARTITION BY patient_id ORDER BY starts_at) AS first_doctor
FROM appointments;
```
**Trap:** `LAST_VALUE(...) OVER (... ORDER BY ...)` does **not** give the last row — the default frame
stops at the current row. Add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, or flip the
order and use `FIRST_VALUE`.

### S36. Average time between a patient's visits — Medium
```sql
WITH visits AS (
  SELECT patient_id,
         starts_at - LAG(starts_at) OVER (PARTITION BY patient_id ORDER BY starts_at) AS gap
  FROM appointments
  WHERE status = 'completed'
)
SELECT patient_id, AVG(gap) AS avg_return_gap
FROM visits
WHERE gap IS NOT NULL               -- the first visit has no previous one
GROUP BY patient_id;
```

### S37. Rank doctors inside their specialty, with the gap to the leader — Medium
```sql
WITH counts AS (
  SELECT d.id, d.specialty, d.name, COUNT(*) AS completed
  FROM doctors d
  JOIN appointments a ON a.doctor_id = d.id AND a.status = 'completed'
  GROUP BY d.id, d.specialty, d.name
)
SELECT specialty, name, completed,
       RANK() OVER (PARTITION BY specialty ORDER BY completed DESC) AS rnk,
       MAX(completed) OVER (PARTITION BY specialty) - completed     AS behind_leader
FROM counts
ORDER BY specialty, rnk;
```

---
---

# L5 — ADVANCED (good to know)

---

### S38. Org chart with a recursive CTE — Medium
```sql
WITH RECURSIVE org AS (
  -- start: the top boss
  SELECT id, name, manager_id, 1 AS level, name::text AS path
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- repeat: everyone whose manager is already in the result
  SELECT e.id, e.name, e.manager_id, o.level + 1, o.path || ' > ' || e.name
  FROM employees e
  JOIN org o ON e.manager_id = o.id
)
SELECT level, path
FROM org
ORDER BY path;
```
**How it works:** the first part is the **start**; the second part keeps adding the next level until
nothing new is found. Works for any tree: org charts, categories, folders, comment threads.
**Trap:** bad data with a loop never ends — add a depth limit like `WHERE o.level < 20`.

### S39. ⭐ Streaks — patients who came 3+ days in a row (gaps and islands) — Hard
```sql
WITH visits AS (
  SELECT DISTINCT patient_id, (starts_at AT TIME ZONE 'Asia/Kolkata')::date AS day
  FROM appointments
  WHERE status = 'completed'
),
grouped AS (
  SELECT patient_id, day,
         day - (ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY day))::int AS island
  FROM visits
)
SELECT patient_id, MIN(day) AS from_day, MAX(day) AS to_day, COUNT(*) AS days_in_a_row
FROM grouped
GROUP BY patient_id, island
HAVING COUNT(*) >= 3;
```
**The trick:** on consecutive days, the **date** and the **row number** both go up by 1, so
`date − row_number` stays the **same** for the whole run. Group by it.

| day | row_number | day − row_number |
|---|---|---|
| Sep 1 | 1 | Aug 31 |
| Sep 2 | 2 | Aug 31 ← same run |
| Sep 3 | 3 | Aug 31 ← same run |
| Sep 7 | 4 | Sep 3 ← new run |

### S40. Days with zero appointments for a doctor — Medium
```sql
SELECT d::date AS day
FROM generate_series(date '2026-09-01', date '2026-09-30', interval '1 day') AS d
WHERE NOT EXISTS (
  SELECT 1 FROM appointments a
  WHERE a.doctor_id = 7
    AND (a.starts_at AT TIME ZONE 'Asia/Kolkata')::date = d::date
)
ORDER BY day;
```
**Idea:** you cannot find missing days in data that does not have them — **generate a calendar**, then
find days with no match.

### S41. ⭐ Find double bookings — overlapping appointments — Medium (your domain!)
```sql
SELECT a.doctor_id, a.id AS first_id, b.id AS second_id, a.starts_at, b.starts_at
FROM appointments a
JOIN appointments b
  ON  a.doctor_id = b.doctor_id
  AND a.id < b.id                       -- each pair once, never with itself
  AND a.starts_at < b.ends_at           -- ⭐ the overlap rule
  AND b.starts_at < a.ends_at
WHERE a.status <> 'cancelled'
  AND b.status <> 'cancelled';
```
**The overlap rule (memorise it):** two time ranges overlap when **each one starts before the other ends**.

**Then prevent it in the database** — a senior-level answer:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&      -- && means "ranges overlap"
  )
  WHERE (status <> 'cancelled');
```

### S42. ⭐ Free 30-minute slots for a doctor — Hard (your domain!)
```sql
WITH slots AS (
  SELECT gs AS slot_start, gs + interval '30 minutes' AS slot_end
  FROM generate_series(
         timestamptz '2026-09-22 09:00+05:30',
         timestamptz '2026-09-22 12:30+05:30',
         interval '30 minutes'
       ) AS gs
)
SELECT s.slot_start
FROM slots s
WHERE NOT EXISTS (
  SELECT 1 FROM appointments a
  WHERE a.doctor_id = 7
    AND a.status <> 'cancelled'
    AND a.starts_at < s.slot_end            -- the overlap rule again
    AND a.ends_at   > s.slot_start
)
ORDER BY s.slot_start;
```
**Idea:** generate every possible slot, then remove the ones that overlap a real appointment.

### S43. ⭐ Upsert — insert or update — Medium
```sql
-- needs a unique rule first:
-- CREATE UNIQUE INDEX patients_clinic_phone ON patients (clinic_id, phone);

INSERT INTO patients (clinic_id, name, phone)
VALUES (1, 'Asha Rao', '9876500001')
ON CONFLICT (clinic_id, phone)
DO UPDATE SET name = EXCLUDED.name          -- EXCLUDED = the row you tried to insert
RETURNING id;
```
**Why:** "check if it exists, then insert" has a **race** — two requests can both see "not there".
`ON CONFLICT` is **atomic**. `ON CONFLICT DO NOTHING` simply ignores duplicates — handy for idempotent
webhooks and imports.

### S44. Median and 90th percentile payment — Medium
```sql
SELECT d.specialty,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY p.amount_paise) / 100.0 AS median_rupees,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY p.amount_paise) / 100.0 AS p90_rupees
FROM payments p
JOIN appointments a ON a.id = p.appointment_id
JOIN doctors d      ON d.id = a.doctor_id
WHERE p.status = 'paid'
GROUP BY d.specialty;
```
**Why median, not average:** one ₹50,000 surgery makes the average useless.

### S45. JSONB — query inside JSON — Medium
```sql
SELECT id, metadata->>'source' AS source
FROM appointments
WHERE metadata->>'source' = 'whatsapp';

-- "contains" — can use a GIN index
SELECT id FROM appointments WHERE metadata @> '{"source": "whatsapp"}';
CREATE INDEX appointments_metadata_gin ON appointments USING gin (metadata);

SELECT metadata->>'source' AS source, COUNT(*) FROM appointments GROUP BY 1;
```
**`->` vs `->>`:** `->` returns JSON, `->>` returns text.
**Judgement:** "Anything I filter or join on often becomes a real column, not a JSON key."

---
---

# THEORY — the spoken SQL questions

---

### T1. ⭐ In what order does SQL run a query?
```
FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT (window functions here) → DISTINCT → ORDER BY → LIMIT
```
**This explains three classic errors:**
- You cannot use a `SELECT` alias in `WHERE` — `WHERE` runs first.
- You cannot filter a window function in `WHERE` — wrap it in a subquery (S29).
- You **can** use a `SELECT` alias in `ORDER BY` — it runs last.

### T2. `WHERE` vs `HAVING`?
`WHERE` filters **rows before** grouping; `HAVING` filters **groups after**. Put everything you can in
`WHERE` — fewer rows to group means a faster query.

### T3. `COUNT(*)` vs `COUNT(column)` vs `COUNT(DISTINCT column)`?
`COUNT(*)` counts rows. `COUNT(column)` counts rows where that column is **not NULL**.
`COUNT(DISTINCT column)` counts different non-NULL values.

### T4. ⭐ Types of JOIN
| Join | Keeps |
|---|---|
| **INNER** | Only rows that match on both sides |
| **LEFT** | All rows from the left; NULLs where the right has no match |
| **RIGHT** | The mirror of LEFT (rarely used — swap the tables instead) |
| **FULL** | All rows from both sides |
| **CROSS** | Every combination (rows × rows) — usually a mistake |
| **SELF** | A table joined to itself (S15) |

### T5. `DELETE` vs `TRUNCATE` vs `DROP`?
`DELETE` removes chosen rows (can use `WHERE`), slow on big tables. `TRUNCATE` removes **all rows** fast.
`DROP` removes the **whole table**.

### T6. Primary key vs unique key vs foreign key?
**Primary key:** one per table, unique, never NULL. **Unique key:** many allowed, can be NULL.
**Foreign key:** a column that must match a primary key in another table — keeps the data connected.

### T7. ⭐ Which index would you add for this query?
```sql
SELECT * FROM appointments
WHERE clinic_id = 9 AND status = 'booked'
ORDER BY starts_at;
```
**Answer:** `CREATE INDEX ON appointments (clinic_id, status, starts_at);`
**Rule:** columns with **equality first**, then the **range or sort** column. An index on `(a, b)` helps
`WHERE a = ?` and `WHERE a = ? AND b = ?`, but **not** `WHERE b = ?` alone.

### T8. ⭐ Why is my index not used?
| Reason | Example | Fix |
|---|---|---|
| A function on the column | `WHERE lower(email) = 'x'` | An index on `lower(email)` |
| Leading wildcard | `LIKE '%ram'` | Trigram index (`pg_trgm`) |
| Type mismatch | Text column compared with a number | Use the same types |
| Matches most of the table | `status = 'booked'` is 90% of rows | A full scan is really cheaper — fine |
| Wrong column order | Index `(a, b)`, query filters only `b` | Reorder or add an index on `b` |

### T9. How do you find out why a query is slow?
`EXPLAIN ANALYZE <query>` — it runs the query and shows the real plan: **Seq Scan** (reads the whole
table) vs **Index Scan**, estimated vs actual rows, and where the time goes.

### T10. What is the N+1 query problem?
Fetch 50 appointments (1 query), then the patient for each (50 queries) = 51 queries.
**Fix:** one JOIN, or load all patients at once with `WHERE id IN (...)` — in Prisma, `include`.

### T11. Normalisation in one line each
| Form | Rule |
|---|---|
| **1NF** | One value per cell — no lists inside a column |
| **2NF** | Every column depends on the **whole** key |
| **3NF** | Columns depend **only** on the key — no `doctor_name` stored in `appointments` |

### T12. ⭐ Transactions — ACID
**Atomic** (all or nothing) · **Consistent** (rules always hold) · **Isolated** (transactions do not see
each other's half-done work) · **Durable** (committed data survives a crash).
```sql
BEGIN;
UPDATE slots SET status = 'booked' WHERE id = 55 AND status = 'free';
INSERT INTO appointments (...) VALUES (...);
COMMIT;      -- or ROLLBACK; if anything failed
```
**Booking race answer:** a unique or exclusion constraint, or `SELECT … FOR UPDATE` on the slot row.

---

## Self-check

- [ ] Write S11 and explain why the filter goes in `ON`
- [ ] Second highest salary two ways, and the Nth with `DENSE_RANK`
- [ ] Explain the `NOT IN` NULL trap (S24)
- [ ] `ROW_NUMBER` vs `RANK` vs `DENSE_RANK` with the table
- [ ] Top-N per group (S30) from memory
- [ ] A running total and a `LAG` growth query
- [ ] The query order (T1) and the right composite index (T7)
