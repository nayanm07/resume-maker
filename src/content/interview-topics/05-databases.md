# 05 — Databases (PostgreSQL, MySQL, MongoDB)

> Easy English. Short lines. Say them out loud.
> **Time:** ~5 hours · **Pairs with:** [18/03 — SQL query bank](18-coding-round/03-sql.md) (the queries
> themselves), [15 — System Design](15-system-design.md), [10 — Multi-Tenant](10-multi-tenant-saas.md)
> ⭐ This file is about **how databases work and how to choose**. For writing queries, use the SQL bank.

---

## How this file is organised — basic → advanced

**Every topic:** explanation → deeper detail → **interview questions** → **scenarios**.

| Level | Topics | Time | You can answer… |
|---|---|---|---|
| **1. Basics** | 1 What a database is · 2 SQL vs NoSQL · 3 **Postgres vs MySQL vs Mongo** | 45 min | "Which database would you choose, and why?" |
| **2. Data modelling** | 4 Tables, keys, relationships · 5 Normalisation · 6 Data types · 7 **Mongo schema design** | 1 h | "How would you model this? Embed or reference?" |
| **3. Performance** | 8 **How an index works** · 9 Composite indexes & EXPLAIN · 10 Query problems (N+1, pagination) | 1.5 h | "The query is slow. What do you do?" |
| **4. Transactions** | 11 ACID & isolation levels · 12 **Locking, deadlocks, double booking** | 1 h | "Two users book the last slot at the same time." |
| **5. Scale & operations** | 13 Replication · 14 Partitioning & sharding · 15 Connection pooling · 16 Backups & migrations | 45 min | "How do you scale reads? What is a read replica?" |
| **Wrap-up** | 17 Your honest position · 18 Rapid-fire · 19 Self-check · 20 Traps | 30 min | "How much MongoDB have you used?" |

**If you only have 1 hour:** §0, §3, §8, §11, §12, §17.

---

## 0. The 30-second answer (memorise this)

> 💬 **"Tell me about your database experience."**
>
> "My depth is **PostgreSQL** — that is what my production systems run on, with Prisma on top. I design
> the schema, write the migrations, add the indexes, and I have handled the harder parts: preventing
> double bookings with constraints, multi-tenant isolation, and zero-downtime migrations.
>
> I choose Postgres by default because I want transactions, constraints and good SQL — the database
> should make bad data impossible, not just the application code.
>
> I would pick **MongoDB** when the data has no fixed shape and the access pattern is 'fetch one whole
> document', and **MySQL** when the team or platform already runs it — the day-to-day work is very
> similar, the differences show up in advanced features."

⭐ Be honest about depth. "Postgres deep, MySQL comfortable, Mongo working knowledge" is a strong,
credible answer. Claiming all three equally invites a question you cannot answer.

---
---

# LEVEL 1 — BASICS

---

## 1. What a database gives you

A file could store data. A database gives you five things a file cannot:

| Thing | Meaning |
|---|---|
| **Fast search** | Indexes find one row among millions without reading everything |
| **Many users at once** | Concurrency control, so two writers do not corrupt each other |
| **Rules** | Constraints — this field is required, this must be unique, this must exist |
| **Transactions** | All of it happens, or none of it |
| **Durability** | Once saved, it survives a crash |

### The families

| Family | Example | Shape | Good for |
|---|---|---|---|
| **Relational (SQL)** | Postgres, MySQL | Tables and rows | Almost every business app |
| **Document** | MongoDB | JSON-like documents | Flexible shapes, one-document reads |
| **Key–value** | Redis | Key → value | Cache, sessions, queues ([06](06-redis.md)) |
| **Search** | Elasticsearch | Inverted index | Full-text search |
| **Vector** | pgvector, Pinecone | Embeddings | AI similarity search ([13](13-ai-llm-voice.md)) |
| **Time series** | TimescaleDB | Time-stamped points | Metrics, sensors |

⭐ **Real systems use several.** Yours: Postgres for the truth, Redis for cache and queues, S3 for files,
a vector store for AI. Saying that shows you pick per job.

---

## 2. SQL vs NoSQL — the honest comparison

| | **SQL (relational)** | **NoSQL (document)** |
|---|---|---|
| Data shape | Tables with a fixed schema | Documents; each can differ |
| Relationships | **JOINs** | You embed the data, or do a second query |
| Schema changes | A migration | Just write a different shape |
| Transactions | Strong, across many tables | Supported now, but designed around single documents |
| Scaling | Scale up, then replicas, then shard | Sharding built in from the start |
| Best when | Data is related; correctness matters | Shapes vary; you read whole documents |

### How to choose — say it this way

> "I start with Postgres unless something argues against it. Business data is relational — appointments
> belong to patients, patients to clinics — and I want the database to enforce that with foreign keys
> and unique constraints.
>
> I would pick a document database when the shape genuinely varies — product catalogues, CMS content,
> event payloads from many providers — or when I almost always read one whole document at a time and do
> not need joins."

⚠️ **Never say "NoSQL is faster".** It is faster for *its* access pattern, and much slower if you end up
doing joins in application code.

### Interview questions

**Q: SQL vs NoSQL — when do you use which?** → the table + the quote.

**Q: Can MongoDB do transactions now?**
> "Yes — multi-document transactions on a replica set since version 4.0. But the design intent is that a
> single document update is already atomic, so a good Mongo schema rarely needs them. If I find myself
> needing transactions across many collections constantly, that is a sign the data was relational and
> belonged in Postgres."

---

## 3. ⭐ PostgreSQL vs MySQL vs MongoDB

| | **PostgreSQL** | **MySQL** | **MongoDB** |
|---|---|---|---|
| Type | Relational | Relational | Document |
| Reputation | Correctness, features, standards | Simple, fast, everywhere | Flexible, easy to start |
| JSON | **JSONB** — indexable, powerful | JSON type, weaker | Native — it *is* JSON |
| Advanced SQL | Window functions, CTEs, full text, arrays | Has them (8.0+), fewer extras | Aggregation pipeline instead |
| Extensions | ⭐ PostGIS, pgvector, TimescaleDB | Few | n/a |
| Concurrency | MVCC, no read locks | MVCC in InnoDB | Document-level locking |
| Constraints | Very strict, `CHECK`, exclusion constraints | Good; historically laxer | Optional schema validation |
| Scaling writes | Vertical + partitioning | Vertical + partitioning | ⭐ Sharding built in |
| Typical stack | Node, Django, Rails, modern SaaS | PHP/Laravel, WordPress, legacy | Node, MERN, fast prototypes |

### The differences worth naming

**Postgres over MySQL:**
- **Stricter by default** — it refuses bad data instead of silently changing it.
- **Better JSON** (JSONB with GIN indexes), so you can mix relational and flexible data.
- **Extensions** — pgvector for AI, PostGIS for maps.
- **Richer SQL** — window functions, CTEs, `DISTINCT ON`, exclusion constraints.

**MySQL over Postgres:**
- Simpler to operate, very widely known, excellent replication tooling.
- Often already there — Laravel, WordPress and many hosting platforms default to it.

**MongoDB over both:**
- No migration needed when the shape changes.
- One document read gives you everything for a screen.
- Horizontal sharding is built in.

⚠️ **MongoDB's real cost:** duplicated data that can go out of sync, no joins (`$lookup` exists but is
slow at scale), and a schema still exists — it just lives in your application code instead of the
database.

### Interview questions

**Q: Why Postgres over MySQL?**
> "For a new product I prefer Postgres: it is stricter about bad data, has better JSON support, richer
> SQL like window functions and CTEs, and extensions like pgvector that I actually used for AI search.
> MySQL is a fine database — if the team or platform already runs it, the day-to-day work is nearly
> identical and I would not migrate without a reason."

**Q: When would you choose MongoDB?**
> "When the shape varies a lot and reads are 'give me this one document' — a CMS, a product catalogue
> with different attributes per category, or raw webhook payloads from many providers. I would not
> choose it for money, bookings or anything where relationships and constraints matter."

### Scenarios

**S1. A new project. The team says "let's use MongoDB, it's faster".**
> "I would ask what we are optimising for. Speed depends on the access pattern, not the brand. If the
> data is relational — users, orders, payments — Mongo will push those joins into our application code,
> and we lose foreign keys and constraints that prevent bad data.
> I would suggest Postgres with JSONB for the parts that are genuinely flexible. That gives one system,
> real transactions, and still room for schema-free data where it helps."

---
---

# LEVEL 2 — DATA MODELLING

---

## 4. Tables, keys and relationships

| Word | Meaning |
|---|---|
| **Primary key** | The unique id of a row. One per table, never NULL. |
| **Foreign key** | A column pointing at another table's primary key — the database enforces it exists |
| **Unique constraint** | No two rows may share this value |
| **Check constraint** | A rule: `amount_paise > 0`, `status IN (...)` |
| **Index** | A lookup structure for speed (§8) — not a rule |

### The three relationships

```
ONE-TO-ONE      patient ── patient_medical_record        (extra columns, often optional)
                → put the foreign key on either side, make it UNIQUE

ONE-TO-MANY     clinic ──< doctors                       (the most common)
                → the "many" side holds the foreign key: doctors.clinic_id

MANY-TO-MANY    doctors >──< specialities
                → a THIRD table: doctor_specialities (doctor_id, speciality_id)
```

⭐ The join table can hold extra columns — `added_at`, `is_primary`. That is normal and useful.

### Foreign key options worth knowing

```sql
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT   -- default-ish: block the delete
                                               ON DELETE CASCADE    -- delete the children too
                                               ON DELETE SET NULL   -- keep the row, clear the link
```
⚠️ **`CASCADE` is dangerous on business data** — deleting one clinic could silently delete years of
appointments. For anything important, prefer `RESTRICT` plus a soft delete.

### Interview questions

**Q: How do you model many-to-many?** → the join table, with extra columns if needed.

**Q: Primary key — auto-increment integer or UUID?**

| | Integer | UUID |
|---|---|---|
| Size / speed | Smaller, faster indexes | Bigger, random order hurts insert performance (UUIDv7 fixes this) |
| Guessable | ⚠️ Yes — `/orders/124` invites guessing | No |
| Generated by | The database | The application, before insert |
| Merging data | Conflicts | Safe |
> "Integers internally for speed; UUIDs — or a prefixed public id — for anything exposed in a public API,
> so sequential IDs do not leak how many customers we have or invite guessing."

---

## 5. Normalisation (and when to break it)

**Normalisation = store each fact once.**

| Form | Rule | Plain meaning |
|---|---|---|
| **1NF** | One value per cell | No `"a,b,c"` lists in a column |
| **2NF** | Every column depends on the **whole** key | Matters for composite keys |
| **3NF** | Columns depend **only** on the key | Do not store `doctor_name` in `appointments` — join it |

**Why:** if the doctor's name lives in one place, renaming is one update. If it is copied into 10,000
appointment rows, some of them will be wrong forever.

### Denormalise on purpose

Sometimes you copy data **deliberately**:

| Case | Why it is right |
|---|---|
| `invoice.doctor_name` at the time of billing | ⭐ A **historical record** — the invoice must not change when the doctor renames themselves |
| `appointment_count` on a clinic row | Avoids counting millions of rows on every dashboard load |
| A summary table for reports | Reads dominate; recompute nightly |

⭐ **The sentence:** "I normalise by default, and denormalise on purpose — for historical accuracy or for
read performance — and then I say how the copy stays correct: a trigger, a job, or because it is
intentionally frozen."

### Interview questions

**Q: What is normalisation and would you always do it?** → the table + the denormalise reasons.

### Scenarios

**S2. Invoices show the doctor's current name, not the name at the time of billing.**
> "The invoice joins to the doctors table, so it always shows today's value. For an invoice that is
> wrong — it is a legal record of what happened.
> Fix: snapshot the details onto the invoice row at creation time — name, fee, tax percentage. This is
> deliberate denormalisation: the invoice is frozen history, not a live view."

---

## 6. Data types — the ones people get wrong

| Data | Use | Never |
|---|---|---|
| **Money** ⭐ | `integer` in paise/cents, or `NUMERIC(12,2)` | `float` / `double` — `0.1 + 0.2 ≠ 0.3` |
| **Timestamps** ⭐ | `timestamptz` (with time zone), stored in UTC | `timestamp` without zone, or a string |
| **Dates only** | `date` (a birthday has no timezone) | |
| **Text** | `text` in Postgres (same speed as varchar) | `CHAR(n)` — it pads with spaces |
| **Status / enum** | `text` + `CHECK`, or a real `ENUM` | Magic numbers like `status = 2` |
| **Booleans** | `boolean` | `'Y'` / `'N'` strings |
| **Flexible extras** | `jsonb` | A `notes` column with hidden structure |
| **Big ids** | `bigint` | `int` — 2.1 billion arrives sooner than you think |

**Always have:** `created_at`, `updated_at`, and — in a multi-tenant app — `tenant_id`
([10](10-multi-tenant-saas.md)).

### Interview questions

**Q: How do you store money?**
> "As an integer in the smallest unit — paise — or `NUMERIC` with fixed scale. Never a float: binary
> floating point cannot represent decimal fractions exactly, so totals drift and reconciliation fails."

**Q: How do you store time?**
> "`timestamptz`, always in UTC, converted to the user's timezone only for display. Storing local time
> without a zone makes daylight saving and multi-region users impossible to reason about."

---

## 7. ⭐ MongoDB schema design — embed or reference?

This is **the** MongoDB interview question.

```js
// EMBED — the related data lives inside the document
{ _id: 1, name: 'Ravi', address: { city: 'Pune', pin: '411001' },
  recentVisits: [ { date: '2026-09-01', doctor: 'Dr A' } ] }

// REFERENCE — store the id, fetch separately
{ _id: 1, name: 'Ravi', clinicId: ObjectId('...') }
```

| Embed when | Reference when |
|---|---|
| You almost always read them together | The data is used on its own too |
| The child does not exist without the parent | Many parents share it (a doctor, a clinic) |
| The list is **small and bounded** (a few dozen) | The list grows forever (every appointment ever) |
| The copy does not need to stay in sync | It changes often and must stay correct everywhere |

⚠️ **The two classic Mongo mistakes:**
1. **Unbounded arrays** — pushing every appointment into the patient document. Documents have a **16 MB
   limit**, and updates get slower as the array grows. Use a separate collection.
2. **Using Mongo like SQL** — many small collections joined with `$lookup` in every query. That is the
   worst of both worlds; either embed properly, or use a relational database.

**The rule to say:** ⭐ **"Model for the queries, not for the data."** In SQL you model the data
correctly and then query it any way you like. In Mongo you model around how you will read it.

### Interview questions

**Q: Embed or reference?** → the table, then "and I check the list is bounded — unbounded arrays are the
classic failure".

**Q: How is Mongo schema design different from SQL?**
> "In SQL I normalise first — each fact in one place — and rely on joins. In Mongo I design around the
> read pattern: what does one screen need, and can it come from one document? That means accepting some
> duplication, so I also decide up front how a duplicated value gets updated."

### Scenarios

**S3. A Mongo app got slow, and some patient updates started failing.**
> "Almost certainly a document that grew too big — an array that keeps getting `$push`ed, like every
> visit or every log line, heading towards the 16 MB limit. Every update rewrites the whole document, so
> writes slow down for everyone.
> Fix: move that array into its own collection with a reference back, keep only the last few entries
> embedded if a screen needs them, and add an index on the parent id."

---
---

# LEVEL 3 — PERFORMANCE

---

## 8. ⭐ How an index actually works

### The simple picture

A book about clinics. You want everything about "Pune".

- **No index:** read all 800 pages. That is a **sequential scan**.
- **Index at the back:** "Pune … pages 12, 88, 340". Jump straight there. That is an **index scan**.

An index is a **sorted copy of one or more columns**, plus a pointer to the row.

### B-tree — the default

Most indexes are **B-trees**: a tree kept sorted and balanced, so any lookup takes the same few steps.

```
                [ M ]
           /            \
     [ D  H ]          [ R  W ]
    /   |   \         /   |   \
  rows rows rows    rows rows rows      ← about 3–4 hops for millions of rows
```

**B-trees are good for:** `=`, `<`, `>`, `BETWEEN`, `ORDER BY`, and `LIKE 'abc%'` (prefix only).

### The cost of an index

| Index gives you | Index costs you |
|---|---|
| Much faster reads | **Slower writes** — every insert/update/delete must update every index |
| Faster sorting and joins | Disk space (sometimes as much as the table) |
| Unique constraints | Maintenance (bloat, rebuilds) |

⭐ **So:** index what you **filter, join and sort on** — not every column. Five well-chosen indexes beat
twenty random ones.

### Other index types (name them, know one line each)

| Type | Use |
|---|---|
| **B-tree** | The default; almost everything |
| **Hash** | Only `=` — rarely worth it |
| **GIN** | JSONB keys, arrays, full-text search |
| **GiST** | Ranges and geometry — ⭐ the exclusion constraint that blocks double bookings |
| **BRIN** | Huge tables in natural order (time-series logs); tiny index |
| **Partial** | `WHERE status = 'booked'` — index only the rows you query |
| **Expression** | `lower(email)` — so a case-insensitive search can use it |

```sql
CREATE INDEX ON appointments (clinic_id, starts_at);                       -- composite
CREATE INDEX ON patients (lower(email));                                   -- expression
CREATE INDEX ON appointments (doctor_id) WHERE status = 'booked';          -- partial
CREATE UNIQUE INDEX ON patients (clinic_id, phone);                        -- a rule, not just speed
CREATE INDEX CONCURRENTLY ...                                              -- ⭐ no write lock on a live table
```

### Interview questions

**Q: What is an index and how does it work?** → the book example + B-tree + "sorted copy with pointers".

**Q: Why not index every column?** → the cost table. "Every write pays for every index."

**Q: What is a covering index?**
> "An index that contains all the columns a query needs, so the database answers from the index alone
> and never touches the table — Postgres calls that an index-only scan. `INCLUDE (...)` adds extra
> columns just for that."

---

## 9. Composite indexes and reading EXPLAIN

### ⭐ Column order is everything

```sql
CREATE INDEX ON appointments (clinic_id, status, starts_at);
```

**Think of a phone book sorted by (last name, first name).**

| Query | Uses the index? |
|---|---|
| `WHERE clinic_id = 9` | ✅ Yes |
| `WHERE clinic_id = 9 AND status = 'booked'` | ✅ Yes |
| `WHERE clinic_id = 9 AND status = 'booked' ORDER BY starts_at` | ✅ Perfect — filter and sort |
| `WHERE status = 'booked'` (no clinic) | ❌ No — you cannot find everyone called "Ravi" in a book sorted by surname |

**The rule:** **equality columns first, then the range or sort column.** This is called the
**left-most prefix** rule, and MongoDB has the same idea (the **ESR rule**: Equality, Sort, Range).

### Reading `EXPLAIN ANALYZE`

```sql
EXPLAIN ANALYZE
SELECT * FROM appointments WHERE clinic_id = 9 AND status = 'booked' ORDER BY starts_at LIMIT 20;
```

| What you see | Means |
|---|---|
| **Seq Scan** on a big table | ⚠️ Reading everything — usually a missing index |
| **Index Scan / Index Only Scan** | ✅ Using an index |
| **Bitmap Heap Scan** | Many matches — often fine |
| **rows=10 … actual rows=90000** | ⚠️ The planner guessed badly → run `ANALYZE` |
| **Nested Loop** over many rows | ⚠️ Often an N+1 or a missing join index |
| **Sort … external merge Disk** | ⚠️ Sorting spilled to disk — index it, or raise `work_mem` |

MySQL: `EXPLAIN` / `EXPLAIN ANALYZE`. MongoDB: `db.coll.find(...).explain('executionStats')` — look for
`COLLSCAN` (bad) vs `IXSCAN` (good), and `totalDocsExamined` far above `nReturned`.

### Why an index is ignored (the classic list)

| Reason | Example | Fix |
|---|---|---|
| Function on the column | `WHERE lower(email) = …` | Expression index |
| Leading wildcard | `LIKE '%ram'` | Trigram index (`pg_trgm`) |
| Type mismatch | text column compared to a number | Same types |
| Matches most rows | `status = 'booked'` is 90% of the table | A scan really is cheaper |
| Wrong column order | index `(a, b)`, query filters `b` | Reorder or add an index |
| Stale statistics | | `ANALYZE` |

### Interview questions

**Q: An index exists but the query is still slow. Why?** → the table above, starting with "first I run
`EXPLAIN ANALYZE` to see whether it is even used".

**Q: Which index for `WHERE clinic_id = ? AND status = ? ORDER BY starts_at`?** → `(clinic_id, status,
starts_at)`, and explain the phone-book rule.

### Scenarios

**S4. A list endpoint was fast for a year, now it takes 6 seconds.**
> "Data grew past what a scan can handle. I run `EXPLAIN ANALYZE`: if it is a sequential scan, the index
> is missing or unusable; if the estimate is far from the actual rows, statistics are stale.
> Usually the fix is a composite index matching the filter and sort, plus capping the page size. If it is
> deep pagination, I move from `OFFSET` to a cursor — `OFFSET 100000` still walks 100,000 rows
> ([12 §7](12-api-design.md))."

---

## 10. The query problems that actually happen

### N+1 queries ⭐

```ts
const appointments = await prisma.appointment.findMany();            // 1 query
for (const a of appointments) {
  a.patient = await prisma.patient.findUnique({ where: { id: a.patientId } });  // +50 queries
}
```
**Fix:** one query with a join (`include` in Prisma, `selectinload` in SQLAlchemy, `$lookup`/`populate`
in Mongo), or fetch all the patients at once with `WHERE id IN (...)` and match them in memory.

**How it hides:** each query takes 2 ms, so nobody notices in development with 5 rows. With 500 rows in
production it is a second of pure latency.

### `SELECT *`

Returns columns you do not need, breaks index-only scans, and leaks new internal columns the moment
someone adds one. Select what you need.

### Deep pagination

`LIMIT 20 OFFSET 100000` reads 100,020 rows and throws away 100,000. Use a cursor:
`WHERE (starts_at, id) < (:lastStartsAt, :lastId) ORDER BY starts_at DESC, id DESC LIMIT 20`.

### Counting everything

`SELECT COUNT(*)` on a huge table is slow. Options: show "has more" instead of a total, keep an
approximate count, or cache the number.

### Doing work in a loop

Ten thousand single-row inserts take minutes. One bulk insert (`createMany`, `COPY`) takes seconds.

### Interview questions

**Q: What is the N+1 problem?** → the code + "one join, or one `IN` query".

**Q: Why avoid `SELECT *`?** → bandwidth, no index-only scan, and accidental exposure of new columns.

### Scenarios

**S5. The dashboard makes 300 database queries for one page load.**
> "N+1 — a loop fetching related rows one at a time, probably nested twice. I find it in the query log or
> an APM trace, then load the relations in one query with `include`, or batch the ids with a single `IN`
> query and map them in memory.
> After that I check whether the page even needs all that data, and cache the expensive aggregates."

---
---

# LEVEL 4 — TRANSACTIONS & CONCURRENCY

---

## 11. ACID and isolation levels

### ACID in one line each

| Letter | Meaning | Example |
|---|---|---|
| **Atomic** | All of it or none of it | Money leaves one account **and** arrives in the other |
| **Consistent** | Rules always hold | A foreign key or check constraint is never violated |
| **Isolated** | Concurrent transactions do not see each other's half-done work | Two bookings do not read the same "free" slot |
| **Durable** | Committed data survives a crash | Written to disk / the write-ahead log |

```sql
BEGIN;
  UPDATE slots SET status = 'booked' WHERE id = 55 AND status = 'free';
  INSERT INTO appointments (slot_id, patient_id) VALUES (55, 12);
COMMIT;                                   -- or ROLLBACK;
```
⭐ **Keep transactions short.** Never call an external API inside one — a slow payment provider would
hold database locks open for everyone.

### The problems isolation prevents

| Problem | What happens |
|---|---|
| **Dirty read** | You read data another transaction has not committed yet |
| **Non-repeatable read** | You read a row twice in one transaction and get different values |
| **Phantom read** | You run the same query twice and new rows appeared |
| **Lost update** ⭐ | Two people read 10, both write 11 — one update disappears |

### The levels

| Level | Stops | Note |
|---|---|---|
| Read Uncommitted | nothing | Postgres does not really have it |
| **Read Committed** | dirty reads | ⭐ Default in Postgres **and** MySQL is Repeatable Read |
| **Repeatable Read** | + non-repeatable reads | MySQL's default (InnoDB) |
| **Serializable** | everything | Safest; may **abort** transactions — you must retry |

**The practical answer:** "I stay on the default and solve the real races with constraints or row locks,
because raising the isolation level costs throughput and adds retry logic everywhere."

### Interview questions

**Q: Explain ACID.** → the table with the money example.

**Q: What is a lost update and how do you prevent it?**
> "Two transactions read the same value and both write back — the second overwrites the first. I prevent
> it with a conditional update (`WHERE status = 'free'`), a version column (optimistic locking), or
> `SELECT … FOR UPDATE` (pessimistic locking)."

**Q: What is the default isolation level?**
> "Read Committed in Postgres, Repeatable Read in MySQL InnoDB. Good to know, because the same code can
> behave differently on the two."

---

## 12. ⭐⭐ Locking, deadlocks and the double-booking problem

### Optimistic vs pessimistic locking

| | **Optimistic** | **Pessimistic** |
|---|---|---|
| Idea | Assume no clash; check at write time | Lock the row now; others wait |
| How | A `version` column, or a conditional `WHERE` | `SELECT … FOR UPDATE` |
| Good for | Low contention (most web apps) | High contention on one row |
| Cost | The loser must retry | Others wait; risk of deadlock |

```sql
-- optimistic: the update only applies if nothing changed
UPDATE appointments SET status = 'cancelled', version = version + 1
WHERE id = 55 AND version = 3;
-- 0 rows updated → someone else changed it → tell the user to reload
```
```sql
-- pessimistic: hold the row for the rest of the transaction
BEGIN;
  SELECT * FROM slots WHERE id = 55 FOR UPDATE;      -- others block here
  UPDATE slots SET status = 'booked' WHERE id = 55;
COMMIT;
```

### ⭐ The double-booking answer (your domain — rehearse this)

> "Two requests read the slot as free at the same moment, so a check-then-insert in application code is
> always a race. I make the **database** decide.
>
> First choice: a **unique constraint** — one appointment per slot — so the second insert simply fails
> and I return 409. Or a **conditional update**: `UPDATE slots SET status='booked' WHERE id=? AND
> status='free'` — zero rows affected means I lost, and I offer the next slot.
>
> For overlapping time ranges rather than fixed slots, Postgres has an **exclusion constraint** with
> `tstzrange` and `&&`, which makes any overlap for the same doctor impossible
> ([18/03 S41](18-coding-round/03-sql.md)).
>
> A Redis lock can reduce contention, but it cannot be the guarantee — only the database can."

### Deadlocks

**What:** transaction A holds row 1 and wants row 2; B holds row 2 and wants row 1. Both wait forever,
so the database kills one.

**How to avoid:**
1. ⭐ **Always lock rows in the same order** (for example, always by ascending id).
2. Keep transactions **short**.
3. Touch fewer rows; use one statement where you can.
4. **Retry** the loser — a deadlock is a normal, expected error, not a bug to panic about.

### MongoDB version

A single document update is **atomic**, so atomic operators do a lot of this work:
```js
db.slots.updateOne({ _id: slotId, status: 'free' }, { $set: { status: 'booked' } });
// matchedCount === 0 → someone else took it
```
Across collections you need a **transaction** on a replica set — which is a sign the model may be too
relational for Mongo.

### Interview questions

**Q: Two users book the last slot at the same time. What happens?** → the double-booking answer.

**Q: Optimistic or pessimistic locking?** → the table. "Optimistic for normal web traffic; pessimistic
when many requests fight over the same row, like a single stock counter."

**Q: What is a deadlock and how do you handle it?** → the definition + lock ordering + retry.

### Scenarios

**S6. Two patients got the same appointment slot.**
> "Check-then-insert in application code — both requests read 'free' before either wrote. The fix is in
> the database: a unique constraint on the slot, plus a conditional update inside a transaction, so
> exactly one wins and the other gets a clean 409.
> Then I check how many existing double bookings we have, fix them with the clinic, and add an
> integration test that fires twenty parallel bookings at the same slot and asserts exactly one succeeds
> ([16 §8](16-testing-quality.md))."

**S7. Deadlock errors appear in the logs a few times a day.**
> "Two transactions locking the same rows in a different order. I find the two statements in the
> Postgres log — it prints both — and make them lock in a consistent order, usually sorted by id. I also
> shorten the transactions and remove anything slow inside them, like an API call.
> And I add a retry for deadlock errors, because at some concurrency they are normal rather than a bug."

**S8. An update endpoint sometimes silently loses a change when two people edit together.**
> "A lost update. Both read the row, both write the whole object back, and the second overwrites the
> first.
> Fix: a `version` column checked in the `WHERE` clause — zero rows updated means someone else changed
> it, so the API returns 409 and the UI says 'this was changed, please reload'. At the API level that is
> the same as `If-Match` with an ETag ([12 §11](12-api-design.md))."

---
---

# LEVEL 5 — SCALE & OPERATIONS

---

## 13. Replication and read replicas

### The idea

**One primary takes the writes. Copies (replicas) take the reads.**

```
        writes
          │
      [ PRIMARY ] ──copies──► [ REPLICA 1 ]  ← reads (reports, dashboards)
                   ──copies──► [ REPLICA 2 ]  ← reads
```

| Word | Meaning |
|---|---|
| **Primary / master** | Accepts writes |
| **Replica / slave** | A copy, read-only |
| **Asynchronous replication** ⭐ | The copy is a little behind — the default |
| **Synchronous replication** | The write waits for the copy — safer, slower |
| **Failover** | A replica is promoted when the primary dies |
| **Replication lag** | How far behind the copy is — milliseconds normally, seconds under load |

### The trap: read-after-write

A user saves their profile, the page reloads from a **replica**, and shows the old name — because the
copy has not caught up yet.

**Fixes:** send that user's reads to the primary for a few seconds after they write, read from the
primary on that specific screen, or use the value the API just returned instead of re-fetching.

### By database

| | How |
|---|---|
| **Postgres** | Streaming replication; managed by RDS/Aurora with Multi-AZ failover |
| **MySQL** | Binlog replication — mature, easy, very common |
| **MongoDB** | A **replica set** is the normal setup: primary + secondaries, automatic election, `readPreference` controls who serves reads |

⚠️ **A replica is not a backup.** A bad `DELETE` replicates in milliseconds.

### Interview questions

**Q: How do you scale reads?**
> "Cache first — most read load is the same few queries. Then read replicas for heavy reads like reports
> and dashboards, keeping writes and anything that must be immediately consistent on the primary. The
> thing to design for is replication lag."

**Q: Multi-AZ vs read replica?**
> "Multi-AZ is a standby for **availability** — automatic failover, and you do not read from it. A read
> replica is for **scaling reads**. Different jobs ([14 §7](14-cloud-devops.md))."

### Scenarios

**S9. A user updates their profile, refreshes, and sees the old data — but only sometimes.**
> "Read-after-write against a lagging replica. 'Sometimes' is the clue — it depends which server served
> the read.
> Short term, route reads to the primary for a short window after that user writes. Long term, decide per
> screen: user-facing data that was just edited reads from the primary; dashboards and reports can happily
> be a few seconds stale."

---

## 14. Partitioning and sharding

| | **Partitioning** | **Sharding** |
|---|---|---|
| What | Split one big table into pieces **inside one database** | Split data across **different databases/servers** |
| Why | Faster queries, easy to drop old data | More storage and write capacity than one machine |
| Example | `appointments_2026_09` per month | Tenants A–M on server 1, N–Z on server 2 |
| Cost | Low — mostly transparent | ⭐ High — cross-shard queries, rebalancing, no easy joins |

```sql
-- Postgres declarative partitioning by month
CREATE TABLE appointments (…) PARTITION BY RANGE (starts_at);
CREATE TABLE appointments_2026_09 PARTITION OF appointments
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
```
⭐ **Dropping a partition is instant** — `DROP TABLE appointments_2020_01` beats deleting ten million
rows. That alone justifies partitioning for logs, events and call records.

**Shard key** — the most important decision: high cardinality, evenly spread, present in most queries.
For multi-tenant systems the natural key is **tenant id**, which is exactly why database-per-tenant is a
form of sharding you already understand ([10](10-multi-tenant-saas.md)).
⚠️ A **time-based** shard key gives you a hot shard — all of today's traffic lands on one server.

**MongoDB** shards natively: you choose a shard key, a **config server** stores the map, and `mongos`
routes queries. Queries that include the shard key hit one shard; queries without it hit **all** of them.

### Interview questions

**Q: When would you shard?**
> "Last. First indexes and queries, then caching, then read replicas, then partitioning, and only then
> sharding — because sharding brings cross-shard queries, rebalancing and operational pain. For a
> multi-tenant product, tenant id is the natural shard key."

**Q: Partitioning vs sharding?** → the table + the instant-drop point.

---

## 15. Connection pooling

**Every connection costs memory** — in Postgres it is a whole process (a few MB). Postgres handles a few
hundred connections comfortably, not thousands.

```
20 app containers × a pool of 10 = 200 connections … plus workers, plus migrations 😬
```

| Fix | What it does |
|---|---|
| **App-side pool** (Prisma, `pg`) | Reuses connections instead of opening one per request |
| **PgBouncer / RDS Proxy** ⭐ | Sits in front and shares a few real connections among many clients |
| Smaller pool per instance | The right pool size is usually smaller than people think |
| Serverless (Lambda) | ⚠️ Each instance opens its own → a proxy is essentially required |

⚠️ **Transaction-mode pooling breaks some features** — prepared statements, `SET LOCAL`, session
variables. This matters for multi-tenant setups that use `SET app.tenant_id` with row-level security.

**MongoDB** pools per client too: one `MongoClient` for the whole app, never one per request.

### Interview questions

**Q: Why does the database run out of connections when you scale the app?** → the multiplication, then
"a pooler like PgBouncer, plus a smaller pool per instance".

### Scenarios

**S10. After autoscaling to 10 instances, the API starts failing with "too many connections".**
> "Each instance opened its own pool, and together they passed the database limit — scaling the app
> broke the database.
> Immediate: reduce the pool size per instance and cap the autoscaling maximum. Proper fix: PgBouncer or
> RDS Proxy in transaction mode so many app connections share a few real ones, and make sure background
> workers have their own, smaller budget."

---

## 16. Backups, migrations and daily operations

### Backups

| Term | Meaning |
|---|---|
| **Logical backup** | `pg_dump` / `mysqldump` — portable, slower to restore |
| **Physical backup / snapshot** | A copy of the data files — fast for big databases |
| **PITR** ⭐ | Point-in-time recovery — restore to any second using the write-ahead log |
| **RPO / RTO** | How much data you can lose / how long you can be down ([14 §15](14-cloud-devops.md)) |

⭐ **A backup you have never restored is not a backup.** Schedule a restore drill.

### Migrations — the rules

1. **Never edit an applied migration.** Write a new one.
2. **Additive first** — add a column, backfill, switch reads, drop later (expand and contract).
3. **Migrations run before the new code** and must work with the **old** code too.
4. **Beware long locks:** adding a `NOT NULL` column with a default, or a plain `CREATE INDEX`, can lock
   writes on a big table. Use `CREATE INDEX CONCURRENTLY`, and backfill in batches.
5. **Data migrations in batches**, not one giant `UPDATE` of ten million rows.
6. **Schema does not roll back** — that is why everything is additive ([14 §13](14-cloud-devops.md)).

### Daily operations to name

| Task | Why |
|---|---|
| **Slow query log** / `pg_stat_statements` | Find the worst queries by total time |
| **VACUUM / autovacuum** (Postgres) | Reclaim space from updated and deleted rows; prevent bloat |
| **ANALYZE** | Refresh statistics so the planner chooses well |
| **Monitor** | Connections, replication lag, cache hit ratio, disk, slowest queries |
| **Soft delete + retention** | Keep history, then remove old data on a schedule |

### Interview questions

**Q: How do you add a column to a huge table with no downtime?**
> "Add it nullable with no volatile default, backfill in batches, then add the constraint. For an index,
> `CREATE INDEX CONCURRENTLY`. And the deploy is expand-and-contract, so the old code keeps working while
> both versions are live."

**Q: What is VACUUM?**
> "Postgres keeps old row versions for MVCC; vacuum reclaims that space and updates statistics. If
> autovacuum cannot keep up — usually because of long-running transactions — tables bloat and queries
> slow down."

### Scenarios

**S11. A migration ran for 40 minutes and the whole app was down.**
> "It took a lock the whole time — usually adding a `NOT NULL` column with a default on an old version,
> a plain `CREATE INDEX`, or rewriting the table.
> The safe pattern: add the column nullable, backfill in small batches with short transactions, create
> the index `CONCURRENTLY`, and only then add the constraint. I would also test migrations against a copy
> of production data, because on an empty staging database everything runs in a second."

---
---

# WRAP-UP

---

## 17. ⭐ Your honest position (fill this in before the interview)

Say your real depth. Interviewers respect a clear line far more than a vague claim.

| Database | How to say it |
|---|---|
| **PostgreSQL** — your depth | "My production systems run on Postgres with Prisma. I own the schema, migrations, indexes and the harder parts: preventing double bookings with constraints, multi-tenant isolation, and zero-downtime migrations." |
| **MySQL** — if you have used it | "I have worked with MySQL on a Laravel project. Day to day it is very similar — the differences I care about are stricter typing and better JSON in Postgres, and MySQL's simpler replication." |
| **MySQL** — if you have not | "I have not run MySQL in production. The relational concepts transfer directly; what I would check on day one are the differences: default isolation is Repeatable Read, storage engines, and its weaker JSON support." |
| **MongoDB** — working knowledge | "I have used MongoDB for smaller projects and I know the design rules — embed for bounded data read together, reference otherwise, and never let an array grow without limit. I have not run a sharded cluster in production." |

⚠️ **Do not claim all three equally.** One good follow-up question ("what is the default isolation level
in MySQL?" or "what is the document size limit?") will find the gap.

**Your real stories to tell:**

| Story | The sentence |
|---|---|
| **Double booking** | "Prevented in the database with a unique constraint and a conditional update — not by a check in application code." |
| **Multi-tenancy** | "Tenant id on every row and every query in the shared-database product; a database per tenant for the one with procurement requirements." |
| **Zero-downtime migrations** | "Additive migrations, run before the new code, so old and new run together during the deploy." |
| **Indexing** | "Composite indexes matching the filter and sort, checked with `EXPLAIN ANALYZE` rather than guessed." |
| **pgvector** | "Embeddings stored next to the relational data, so the tenant filter is a plain `WHERE` clause ([13 §6](13-ai-llm-voice.md))." |

---

## 18. Rapid-fire

| Word | One line |
|---|---|
| **Primary key / foreign key** | Unique id of a row / a pointer to another table's row |
| **Normalisation** | Store each fact once |
| **Denormalisation** | Copy on purpose — for history or for read speed |
| **Index** | A sorted copy of columns that makes lookups fast |
| **B-tree** | The default index; good for `=`, ranges and sorting |
| **Composite index** | Several columns; **equality first, then range/sort** |
| **Covering index** | Has every column the query needs — no table read |
| **Partial index** | Indexes only rows matching a condition |
| **Sequential scan** | Reading the whole table |
| **EXPLAIN ANALYZE** | Shows the real plan and timings |
| **N+1** | One query, then one per row — fix with a join or `IN` |
| **ACID** | Atomic, consistent, isolated, durable |
| **Read Committed** | Postgres default isolation |
| **Repeatable Read** | MySQL InnoDB default |
| **Lost update** | Two writers, one change disappears |
| **Optimistic locking** | Version column; the loser retries |
| **Pessimistic locking** | `SELECT … FOR UPDATE`; others wait |
| **Deadlock** | Two transactions waiting on each other; lock in a fixed order |
| **MVCC** | Readers see a snapshot and never block writers |
| **VACUUM** | Reclaims space from old row versions (Postgres) |
| **Replication lag** | How far a replica is behind |
| **Read-after-write** | Your own write must be visible to you |
| **Partitioning** | Split one table inside one database |
| **Sharding** | Split data across servers |
| **Shard key** | The field that decides where data lives |
| **PgBouncer** | Connection pooler in front of Postgres |
| **PITR** | Restore to any second |
| **Expand and contract** | Safe multi-step schema change |
| **JSONB** | Indexable JSON in Postgres |
| **BSON** | MongoDB's binary JSON format |
| **Aggregation pipeline** | Mongo's `$match → $group → $sort` stages (its GROUP BY) |
| **Replica set** | Mongo's primary + secondaries with automatic election |
| **16 MB** | MongoDB's document size limit |
| **ESR rule** | Mongo index order: Equality, Sort, Range |

---

## 19. Self-check

**Basics & modelling**
- [ ] Say when you would choose Postgres, MySQL or MongoDB — with a reason each
- [ ] Model a many-to-many relationship, and say when a join table needs extra columns
- [ ] Explain normalisation, then give two good reasons to denormalise
- [ ] Say how you store money and timestamps, and why
- [ ] Explain embed vs reference in Mongo, and the unbounded array trap

**Performance**
- [ ] Explain an index with the book example, and its cost on writes
- [ ] Choose the right composite index for a filter + sort, and explain the order
- [ ] List 5 reasons an index is not used
- [ ] Explain N+1 and two ways to fix it
- [ ] Explain why deep `OFFSET` is slow

**Transactions**
- [ ] Explain ACID and the difference between the Postgres and MySQL defaults
- [ ] Give the double-booking answer end to end
- [ ] Explain optimistic vs pessimistic locking with code
- [ ] Explain a deadlock and how to avoid it

**Scale & operations**
- [ ] Explain replication lag and read-after-write
- [ ] Explain partitioning vs sharding, and a good shard key
- [ ] Explain why scaling the app can break the database
- [ ] Explain a zero-downtime column addition
- [ ] Say your honest position on all three databases (§17)

---

## 20. Traps — how people lose this round

**Choosing**
1. **"NoSQL is faster"** with no access pattern behind it.
2. **Claiming equal depth in all three** — one follow-up exposes it.
3. **Choosing Mongo for relational data**, then rebuilding joins in application code.

**Modelling**
4. **Floats for money.**
5. **Local timestamps with no timezone.**
6. **Storing a live join where history was needed** — invoices showing today's name.
7. **`ON DELETE CASCADE` on business data.**
8. **Unbounded arrays in a Mongo document.**
9. **No `tenant_id`** in a multi-tenant schema.

**Performance**
10. **Indexing every column** — or none.
11. **Wrong composite order** — index `(a, b)` and filtering only on `b`.
12. **Guessing instead of running `EXPLAIN ANALYZE`.**
13. **N+1 hidden behind an ORM.**
14. **`SELECT *` everywhere.**
15. **Deep `OFFSET` pagination** on a big table.

**Transactions & operations**
16. **Preventing double booking in application code** instead of with a constraint.
17. **Calling an external API inside a transaction** — locks held for seconds.
18. **Treating a replica as a backup.**
19. **Never testing a restore.**
20. **Editing an already-applied migration**, or a migration that locks a huge table.
21. **Ignoring connection limits** when the app autoscales.
