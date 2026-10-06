# 15 — System Design

> Easy English. Short lines. Say them out loud.
> **Time:** ~6 hours (mostly practice out loud) · **Pairs with:** every earlier file — this is where they all meet.
> ⭐ At your level they will **not** ask you to design Twitter. They will ask you to design
> **something you have already built**. You have four of those. That is a huge advantage.

---

## How this file is organised — basic → advanced

**Every topic:** explanation → deeper detail → **interview questions** → **scenarios**.

| Level | Topics | Time | You can answer… |
|---|---|---|---|
| **1. The method** | 1 The 7-step framework · 2 Requirements & estimation | 45 min | "Design X." — without panicking |
| **2. Building blocks** | 3 The standard architecture · 4 Databases & data modelling · 5 Caching · 6 Async & queues | 1.5 h | "Where does the cache go? SQL or NoSQL?" |
| **3. Core theory** | 7 Consistency, CAP & transactions · 8 Scaling data (replicas, sharding) · 9 Reliability patterns | 1.5 h | "Strong or eventual consistency? What is a circuit breaker?" |
| **4. Delivery** | 10 APIs & communication · 11 Real-time & mobile · 12 Security & multi-tenancy in design | 45 min | "Sync or async? How do tenants stay separated?" |
| **5. Operate** | 13 Observability, failure & cost in a design | 30 min | "How do you know it broke? What does it cost?" |
| **6. Practice** | 14–18 **Five rehearsed designs — four are yours** | 1.5 h | "Walk me through a system you built." |
| **Wrap-up** | 19 Numbers · 20 Follow-ups · 21 Rapid-fire · 22 Self-check · 23 Traps | 30 min | The questions that always come at the end |

**If you only have 1 hour:** §1, §3, §14, §15, §20.

---

## 0. The 30-second answer (how to start any design)

> 💬 **"Design a system that…"**
>
> "Before I draw anything, let me check the requirements and scale.
>
> Who uses it, how many, and is it read-heavy or write-heavy? How fresh does the data have to be —
> can something be a few seconds stale? Is any downtime acceptable? Mobile, web or both? Any
> compliance constraints like health data staying in India?
>
> Then I will list the functional requirements, do a rough estimate of traffic and storage, sketch
> the API and data model, draw the high-level design, and go deep on the one or two hard parts."

⭐ **Never start drawing boxes first.** Asking questions for two minutes is the single biggest
difference between a junior and a senior design interview.

---
---

# LEVEL 1 — THE METHOD

---

## 1. The 7-step framework (use it every single time)

| Step | Minutes | What you do |
|---|---|---|
| **1. Clarify** | 5 | Requirements, scale, users, what is out of scope. **Ask before you draw.** |
| **2. Define** | 3 | Functional requirements + non-functional (latency, availability, consistency, scale) |
| **3. Estimate** | 2 | Rough numbers: users, requests per second, storage, growth |
| **4. API + data model** | 5 | The key endpoints, the core tables and how they relate |
| **5. High-level design** | 8 | Boxes and arrows: clients → load balancer → services → queue → database/cache/storage |
| **6. Deep dive** | 10 | One or two hard parts — usually where the interviewer steers you |
| **7. Bottlenecks & trade-offs** | 5 | What breaks first at 10× traffic, and what you would do |

### How to behave during it

- **Think out loud.** Silence looks like being stuck. Say "I am choosing between X and Y because…".
- **State your assumptions.** "I will assume 100 clinics and 500 appointments a day each." A stated
  wrong assumption is fine. A silent one fails the interview.
- **Let them steer.** If they ask about one box, go there. Do not finish your speech first.
- **There is no perfect answer.** They are testing how you make trade-offs, not whether you match a
  hidden solution.
- **Say what you would NOT build.** "I would not add Kafka here; a Redis-backed queue is enough at
  this scale." Scope control is a senior signal.

### Interview questions

**Q: How do you approach a system design question?** → the 7 steps, and "clarify before drawing".

**Q: You are asked to design something you have never used. What do you do?**
> "I map it to things I have built. Most systems are the same pieces in a different order: an API, a
> datastore, a cache, a queue for slow work, and a way to notify users. I say my assumptions out loud
> and ask which part they want to go deep on."

---

## 2. Requirements and estimation

### Functional vs non-functional

| Type | Question | Example |
|---|---|---|
| **Functional** | What must it *do*? | "A patient can book, reschedule and cancel an appointment" |
| **Non-functional** ⭐ | How *well*? | "p95 under 300 ms, 99.9% uptime, booking must never double-book" |

The non-functional list is where design decisions come from. Always ask for:
**scale · latency · availability · consistency · durability · security/compliance · cost.**

### Back-of-envelope estimation — the simple method

**The one number to memorise:**
> **1 million requests a day ≈ 12 per second on average. Plan for about 5× at peak, so ~60/second.**

That number makes most "can one server handle it?" questions easy. A normal Node API handles
hundreds of requests per second, so 60 is fine — the database is usually the real limit.

**How to do any estimate in 4 lines:**

```
1. Users:      100,000 active users
2. Actions:    each does 10 actions a day        → 1,000,000 actions/day
3. QPS:        1,000,000 / 86,400 ≈ 12/s average → ~60/s peak
4. Storage:    1 KB per action × 1M = 1 GB/day   → ~365 GB/year
```

**Read:write ratio matters more than raw numbers.**
- Read-heavy (most apps: 100:1) → caching and read replicas.
- Write-heavy (logging, analytics, call events) → queues, batching, partitioning.

⭐ **Round aggressively.** 86,400 seconds ≈ 100,000. Nobody wants exact maths; they want to see that
you can tell 10 requests a second from 10,000.

### Interview questions

**Q: How do you estimate the scale of a system?** → the 4 lines above, then "and I would confirm the
read:write ratio, because that decides whether I reach for caching or for queues."

**Q: What are non-functional requirements and why do they matter?**
> "They are the qualities — latency, availability, consistency, durability, security, cost. They drive
> almost every decision. 'Bookings must never double-book' pushes me to a database constraint;
> 'dashboards can be a minute stale' lets me cache aggressively."

### Scenarios

**S1. The interviewer says only: "Design a booking system." Nothing else.**
> "I would not start drawing. First: who books — patients on WhatsApp, staff on a dashboard, or both?
> How many clinics and appointments a day? Can two people ever hold the same slot, or must that be
> impossible? Do we take payment? Do we send reminders? Is it multi-tenant?
> Then I would say my assumptions — say 500 clinics, 300 appointments a day each, read-heavy with a
> hard constraint on double booking — and design against those, checking they are reasonable."

---
---

# LEVEL 2 — BUILDING BLOCKS

---

## 3. The standard architecture (draw this from memory)

Almost every web system you will be asked about is this picture, with pieces added or removed.

```
           [ Mobile ]   [ Web ]   [ Partner API ]
                    \      |      /
                     \     |     /
                    [ CDN (static) ]
                          |
                    [ Load balancer ]
                          |
            ┌─────────────┴─────────────┐
       [ API servers (stateless, N of them) ]
            │            │            │
       [ Cache ]    [ Database ]  [ Queue ]
       (Redis)      (Postgres)    (BullMQ/Redis)
                         │            │
                  [ Read replica ]  [ Workers ] → third parties (AI, WhatsApp, payments)
                                       │
                                  [ Object storage (S3) ]
```

**Say what each box is for:**

| Box | Why it exists |
|---|---|
| **CDN** | Static files served near the user; takes load off your servers |
| **Load balancer** | Spreads traffic, health checks, lets you run many servers |
| **Stateless API servers** | Any server can serve any request, so you can add or kill them freely |
| **Cache** | Avoid repeating expensive reads ([06 — Redis](06-redis.md)) |
| **Database** | The source of truth |
| **Read replica** | Scale reads without touching the primary |
| **Queue + workers** | Slow work leaves the request path ([07 — BullMQ](07-bullmq.md)) |
| **Object storage** | Files, never on the app server's disk |

### Monolith vs microservices (they ask, and the brave answer wins)

| | **Monolith** | **Microservices** |
|---|---|---|
| Deploy | One thing | Many things |
| Local development | Easy | Needs tooling |
| Data | One database, real transactions | One DB per service, **no cross-service transactions** |
| Failure | One bug can affect everything | Isolated — but network failures are now everywhere |
| Team fit | One or a few teams | Many independent teams |
| Debugging | Stack trace | Distributed tracing needed |

> 💬 **The answer to give:** "I would start with a well-structured monolith, with clear module
> boundaries and separate worker processes. Microservices solve a **team scaling** problem more than a
> technical one, and they turn function calls into network calls with their own failure modes. I would
> split out a service when one part has a genuinely different scaling or reliability profile — for
> example the voice pipeline, which is latency-critical and bursty."

⭐ **Modular monolith** is the phrase to use. It sounds current, and it is honest for your scale.

### Interview questions

**Q: Draw the high-level architecture of a typical web product.** → the diagram, naming why each box
exists.

**Q: Monolith or microservices?** → the quote above. Never say "microservices are modern and better".

**Q: What makes a service stateless, and why does it matter?**
> "It keeps nothing between requests — no sessions in memory, no uploads on local disk. Sessions go to
> Redis, files to S3, data to the database. Then any instance can serve any request, which is what load
> balancing, autoscaling and zero-downtime deploys all depend on."

### Scenarios

**S2. The team wants to split the product into 8 microservices. You have 4 engineers.**
> "I would push back, with reasons. Eight services means eight pipelines, eight deployments, and
> distributed transactions and tracing — for a team that cannot staff them. The pain we actually feel
> is probably build times or tangled modules, which a modular monolith fixes.
> I would extract a service only where there is a real reason: a different scaling profile, a different
> language, or a genuinely separate team. The voice pipeline would be my first candidate, not an
> across-the-board split."

---

## 4. Databases and data modelling

### SQL vs NoSQL — the honest version

| | **SQL (Postgres)** | **NoSQL (Mongo, DynamoDB)** |
|---|---|---|
| Shape | Tables, rows, relations | Documents / key-value / wide column |
| Schema | Enforced | Flexible |
| Joins | ✅ Yes | ❌ Usually not — you duplicate data |
| Transactions | ✅ Strong, multi-row | Limited (improving) |
| Scaling | Vertical first, then replicas and partitioning | Horizontal by design |
| Best for | ⭐ Most business apps — bookings, payments, users | Huge scale with simple access patterns, logs, sessions, caches |

> 💬 "I default to Postgres, because business data is relational and I want transactions and
> constraints — a double booking should be impossible at the database level, not just in code. I would
> pick a document or key-value store for a specific access pattern: huge write volume with simple
> lookups, or data with no fixed shape."

**Polyglot is normal:** Postgres for core data, Redis for cache and queues, S3 for files, a vector
database for embeddings, and maybe Elasticsearch for text search.

### Data modelling in a design interview

Show the 4–6 core tables only, with relationships and the keys you would index:

```
tenants(id, name, plan)
users(id, tenant_id, email, password_hash)
doctors(id, tenant_id, name)
slots(id, tenant_id, doctor_id, start_at, status)          UNIQUE(doctor_id, start_at)  ⭐
appointments(id, tenant_id, slot_id, patient_id, status)   UNIQUE(slot_id)              ⭐
payments(id, tenant_id, appointment_id, provider_ref, status, amount_paise)
```

**Things that earn points:**
- **`tenant_id` on every table** ([10](10-multi-tenant-saas.md)).
- **Unique constraints that make bad states impossible** — one appointment per slot.
- **Money as integer paise**, never floats.
- **Timestamps in UTC**, `created_at`/`updated_at` everywhere.
- **Status as an enum**, with the valid transitions written down.
- **Soft delete** where history matters; hard delete for GDPR.

### Indexes in one minute

- An index is the book's index: find rows without reading every page.
- Index what you **filter**, **join** and **sort** on.
- **Composite index order matters** — `(tenant_id, start_at)` serves "this tenant, this date range";
  the reverse does not.
- Every index **slows writes** and costs storage. Do not index everything.
- On a big live table, build with `CREATE INDEX CONCURRENTLY`.

### Interview questions

**Q: SQL or NoSQL for this system?** → the quote above, then justify from the access pattern.

**Q: How do you prevent two people booking the same slot?**
> "A unique constraint on the slot in the database, plus a conditional update inside a transaction —
> update the slot to booked only while it is still free. Whoever loses affects zero rows and gets a
> 409. I do not rely on a check-then-insert in application code, because two requests can both pass the
> check. Application locks are an optimisation; the database constraint is the guarantee."

**Q: How do you design for multi-tenancy from day one?**
> "A tenant ID on every table and in every query, applied automatically by the data layer rather than
> remembered by developers, and a tenant-aware key in every cache entry. That way moving a big customer
> to their own database later is a configuration change, not a rewrite."

### Scenarios

**S3. Two patients booked the last slot at the same second.**
> "A race between check and write. The fix is at the database: a unique constraint on the slot, and the
> booking done as a conditional update inside a transaction. The second request updates zero rows, so it
> gets a clear 409 and is offered the next slot. Redis locks can reduce contention but they cannot be
> the guarantee — only the database can."

**S4. A list endpoint that was fast last year now takes 4 seconds.**
> "Data grew past what a sequential scan can handle. I run `EXPLAIN ANALYZE` to see the plan, then add
> the right composite index for that filter and sort — usually `(tenant_id, created_at)`. I also cap page
> size and switch deep pagination from offset to cursor ([12 §7](12-api-design.md)). If it is an
> aggregate over a large history, I pre-compute it instead of scanning on every request."

---

## 5. Caching in a design

### The layers (name them in order)

```
Browser cache → CDN → API in-memory (seconds) → Redis (shared) → Database
```

Each layer takes load off the next. For each layer decide: **what**, **how long (TTL)**, and **how it
is invalidated**.

| What to cache | Example | TTL |
|---|---|---|
| Static assets | JS, CSS, images | Forever, with hashed filenames |
| Reference data | Clinic settings, permissions, plans | Minutes, invalidated on write |
| Expensive computations | Dashboard aggregates, AI results | Minutes to hours |
| Session/auth data | Session, JWT denylist | Token lifetime |

**The rules you must say** ([06 §4](06-redis.md)):
1. **Invalidate on write — delete, do not update.**
2. **Always set a TTL** as the safety net.
3. **Key by tenant.** A shared key across tenants is a data leak.
4. **Jitter TTLs** so keys do not expire together (stampede).
5. **A cache failure must not break the request** — fall through to the database.

⚠️ **Every cache is a consistency decision.** Say out loud what staleness you are accepting:
"the clinic's settings can be up to 60 seconds stale, and that is fine; the appointment status cannot,
so it is never cached."

### Interview questions

**Q: Where would you add caching in this design?** → name the layer, the key, the TTL, and the
invalidation. Vague "I would use Redis" is a weak answer.

**Q: What are the risks of caching?**
> "Stale data, and a stampede when a hot key expires and everything hits the database at once. I handle
> staleness by invalidating on the write path with a TTL as a backstop, and stampedes with jittered TTLs
> and a lock so only one request rebuilds the value."

---

## 6. Async work and queues

### When to use a queue (say these four)

1. **Slow work** — AI, PDFs, video. The user should not wait ([07](07-bullmq.md)).
2. **Third-party calls** — retries and rate limits belong in a worker, not a request.
3. **Traffic spikes** — a queue turns a spike into depth instead of failures. The name for this is
   ⭐ **queue-based load levelling**.
4. **Fan-out** — one event triggers several independent jobs (email, analytics, webhook).

```
API → 202 Accepted + job id → [ Queue ] → Workers → DB / third party
                                  │
                        client polls or gets a socket/webhook
```

### Queue vs pub/sub vs stream

| | **Queue** | **Pub/Sub** | **Stream (Kafka/Redis Streams)** |
|---|---|---|---|
| Who gets a message | One consumer | Everyone listening now | Every consumer group, independently |
| Stored? | Until processed | ❌ No | ✅ Kept for a retention period |
| Replay | No | No | ✅ Yes |
| Use | Work to be done | Live fan-out where loss is OK | Event history, analytics, many consumers |

⭐ **Kafka is not the default.** For your scale, BullMQ on Redis does the job. Say: "I would move to
Kafka when I need durable event history with multiple independent consumers and very high throughput —
not before."

### The outbox pattern ⭐ (a strong thing to name)

**The problem:** you save the appointment to the database, then publish an event — and the process
dies in between. The data is saved, but the event never happens. Or the reverse.

**The fix:**
1. In **one transaction**, write the row **and** an `outbox` row describing the event.
2. A separate relay reads unsent outbox rows and publishes them, marking them sent.

Now the database and the events cannot disagree. Consumers still need to be idempotent, because the
relay may publish twice.

### Interview questions

**Q: When would you use a queue?** → the four reasons, with "queue-based load levelling" named.

**Q: Queue or pub/sub?**
> "A queue when exactly one worker must do the job and it must not be lost. Pub/sub when many listeners
> each need the event and losing one is acceptable — like pushing a live update to app servers. If I need
> history and replay, that is a stream."

**Q: What is the outbox pattern?** → the 2 steps above.

### Scenarios

**S5. A marketing campaign sends 50,000 users to the app in ten minutes and the AI feature collapses.**
> "The synchronous path to a third party was the bottleneck. With a queue, that spike becomes queue depth
> instead of 50,000 parallel calls — the API stays fast and returns 202, workers drain at a rate the
> provider allows, and users see progress. I would also autoscale workers on queue depth, put a per-tenant
> limit in place so one customer cannot take every worker, and show an honest 'in queue' state in the UI."

**S6. A payment succeeded, but the confirmation email and the webhook never went out.**
> "The event was published outside the transaction, or the process died after committing. That is exactly
> the outbox pattern: write the payment row and the outbox event in one transaction, and let a relay
> publish it — so a crash can delay the event but never lose it. Consumers stay idempotent because the
> relay can publish the same event twice."

---
---

# LEVEL 3 — CORE THEORY

---

## 7. Consistency, CAP and transactions

### Strong vs eventual consistency

| | **Strong** | **Eventual** |
|---|---|---|
| Meaning | Every read sees the latest write | Reads may be briefly old, then catch up |
| Example | Account balance, seat booking | Like counts, search index, analytics |
| Cost | Slower, harder to scale | Fast and scalable |

**The sentence to say:** "I pick consistency **per feature**, not per system. Booking a slot is
strongly consistent, because a double booking is unacceptable. The clinic dashboard counters are
eventually consistent, because a two-second delay costs nothing."

⭐ That single idea makes most consistency questions easy.

### CAP theorem — in plain words

When the network between your servers breaks (a **partition**), you must choose:

- **CP** — stay **consistent**: refuse some requests rather than serve wrong data. (Postgres-style.)
- **AP** — stay **available**: keep answering, accept that some answers are stale. (DynamoDB-style.)

**You do not choose P.** Partitions happen to you. You only choose what to do when one occurs.

> 💬 "My systems are CP for anything transactional — a booking or a payment would rather fail than be
> wrong — and AP for things like live dashboards and presence, where a stale value is harmless."

### ACID in one line each

| Letter | Meaning |
|---|---|
| **Atomic** | All of it happens, or none of it |
| **Consistent** | Constraints always hold |
| **Isolated** | Concurrent transactions do not see each other's half-done work |
| **Durable** | Once committed, it survives a crash |

**Isolation levels** worth naming: **Read Committed** (Postgres default) and **Serializable**
(strongest, may abort transactions that conflict — retry them).

### Distributed transactions

You cannot have one transaction across the database **and** a payment provider **and** an email.
So do not try.

| Approach | Meaning |
|---|---|
| **Saga** ⭐ | A sequence of local steps, each with a **compensating action** to undo it (refund instead of rollback) |
| **Two-phase commit** | Real distributed transaction — slow, blocking, rarely used in web apps |
| **Idempotency + retries** ⭐ | The practical everyday answer: make each step safe to repeat |

> 💬 "Instead of a distributed transaction I use a saga with compensations: reserve the slot, take the
> payment, confirm. If payment fails, the compensation releases the slot. Every step is idempotent, so
> retries are safe, and the state machine makes it clear where a booking is stuck."

### Interview questions

**Q: Explain CAP.** → the 3 lines above. Mention that P is not optional.

**Q: Strong or eventual consistency for this feature?** → "per feature", with an example of each.

**Q: How do you handle a transaction across services?** → the saga answer.

### Scenarios

**S7. A user updates their profile and immediately reloads — the old data appears.**
> "Read-after-write on a replica. The write went to the primary and the read hit a replica that is a few
> hundred milliseconds behind. Fixes: route a user's reads to the primary for a short window after they
> write, or read from the primary for that specific screen, or have the client use the response it just
> received instead of re-fetching. It is a replication-lag trade-off, so the fix belongs to the
> feature, not the whole system."

---

## 8. Scaling data

### The order to do things (this is the answer they want)

```
1. Index and fix the queries        ← most "we need to scale" problems end here
2. Cache the hot reads
3. Read replicas for read-heavy load
4. Move heavy work out of the request (queue)
5. Partition (split tables by time or tenant)
6. Shard (split data across databases)   ← last, because it is hardest
```

⭐ "Shard last" is a senior answer. Sharding adds cross-shard queries, rebalancing and operational pain.

### Replication

- **Primary** takes writes; **replicas** take reads.
- Replication is usually **asynchronous** → **replication lag** (see S7).
- A replica is **not** a backup. A bad `DELETE` replicates instantly.

### Partitioning and sharding

| Word | Meaning |
|---|---|
| **Vertical partitioning** | Split columns — move rarely used big columns to another table |
| **Horizontal partitioning** | Split rows by a key — e.g. one table per month |
| **Sharding** | Horizontal partitioning across **separate databases** |
| **Shard key** ⭐ | The field that decides where a row lives — the most important choice |
| **Consistent hashing** | Spreads keys across nodes so adding a node moves few keys |
| **Hot shard** | One shard gets most of the traffic — usually a bad key choice |

**Choosing a shard key:** high cardinality, evenly spread, and present in most queries.
For multi-tenant systems, **tenant ID** is the natural shard key — and it is exactly why
database-per-tenant is a form of sharding you already understand.

⚠️ Time as a shard key gives you a hot shard: everything today goes to one place.

### Interview questions

**Q: What breaks first as traffic grows, and what do you do?**
> "Almost always the database — first connections, then write throughput. In order: fix indexes and
> queries, cache hot reads, add read replicas, move heavy work to a queue, then partition, and shard
> only if all of that is exhausted."

**Q: Is a read replica a backup?**
> "No. It copies everything, including mistakes. Backups are separate, with point-in-time recovery, and
> tested by actually restoring them."

**Q: How would you shard this data?**
> "By tenant ID — it has high cardinality, it is in nearly every query, and it keeps one customer's data
> together, which also helps isolation. I would avoid a time-based key, because all of today's traffic
> would land on one shard."

### Scenarios

**S8. The database CPU is at 95% and everything is slow.**
> "First find the cause, not the cure: look at the slowest queries and the plans. Usually it is a missing
> index or a query that got worse as data grew — or an N+1 from the ORM. Immediate relief: cache the
> hottest reads, move heavy reports to a replica or a queued job, and cap expensive endpoints.
> Only after that would I consider a bigger instance, and only much later sharding."

---

## 9. Reliability patterns (name them by name)

| Pattern | What it does |
|---|---|
| **Idempotency** ⭐ | Safe retries — the foundation of everything else |
| **Retry + exponential backoff + jitter** | Recover from a blip without a thundering herd |
| **Queue-based load levelling** | A spike becomes queue depth instead of failures |
| **Circuit breaker** ⭐ | Stop calling a dead dependency; fail fast, test it occasionally |
| **Bulkhead** | Separate resource pools so one bad dependency cannot starve everything |
| **Timeout** | Never wait forever on anyone — always set one |
| **Graceful degradation** ⭐ | Feature off, product still works |
| **Outbox** | The database and the events cannot disagree (§6) |
| **Backpressure** | Slow down intake when downstream is overloaded |
| **Health checks + replacement** | Unhealthy instances get no traffic and are replaced |

### Circuit breaker — the simple picture

A fuse in your house. If something is shorting, the fuse trips so the whole house does not burn.

```
CLOSED  — calls go through normally
   ↓ too many failures
OPEN    — fail instantly for 30 seconds, do not call the dead service
   ↓ after the timeout
HALF-OPEN — let one call through. Success → CLOSED. Failure → OPEN again.
```

Why: when a dependency is down, retrying makes it worse and ties up all your threads and connections.

### Graceful degradation — examples from your systems

| If this dies | The product still… |
|---|---|
| AI evaluation provider | accepts interviews; evaluation is queued and retried |
| Sentiment analysis | still logs the call and the recording |
| Redis cache | works, just slower — reads fall through to Postgres |
| WhatsApp provider | queues messages and sends when it recovers |

⭐ For every external dependency in your design, say what happens when it is down. Interviewers love
this and most candidates never do it.

### Interview questions

**Q: Name some reliability patterns.** → the table, with idempotency first and a real example for
each of circuit breaker, backoff and degradation.

**Q: What is a circuit breaker and why not just retry?**
> "Retrying a dead service makes the outage worse and exhausts your own connections and threads. A
> circuit breaker trips after repeated failures, fails fast for a cooldown, then lets a single probe
> through to test recovery."

**Q: What happens in your design when a third party goes down?** → the degradation table.

### Scenarios

**S9. A third-party API started responding in 30 seconds instead of 300 ms, and your whole API went down.**
> "No timeout and no circuit breaker. Every request was stuck waiting, so the connection pool and event
> loop filled up and healthy endpoints died too — a slow dependency is more dangerous than a dead one.
> Fixes: an aggressive timeout, a circuit breaker so we fail fast while it is unhealthy, that call moved
> into a queue so it is never in the request path, and a bulkhead so it cannot consume all resources."

---
---

# LEVEL 4 — DELIVERY

---

## 10. APIs and communication between services

### Sync vs async — the decision

| Use **synchronous** (HTTP/gRPC) when | Use **asynchronous** (queue/event) when |
|---|---|
| The caller needs the answer now | The work can happen later |
| It is fast and reliable | It is slow, or a third party |
| Example: "is this slot free?" | Example: "generate the report" |

⭐ **The rule:** if a failure should fail the user's request, do it synchronously. If the work must
happen but not now, make it async — and then it must be idempotent and retryable.

### Protocols in one line each

| Protocol | Use |
|---|---|
| **REST** | Public and partner APIs — cacheable, easy to document ([12](12-api-design.md)) |
| **GraphQL** | Many clients needing different shapes of the same data |
| **gRPC** | Fast, typed service-to-service communication |
| **WebSocket** | Two-way live updates ([09](09-realtime-websockets.md)) |
| **Webhooks** | Telling other systems that something happened |

### The API details that matter in a design

- **Idempotency keys** on writes that move money ([12 §8](12-api-design.md)).
- **Pagination with a maximum page size** on every list.
- **Versioning** and what counts as a breaking change.
- **Rate limits per tenant or per key**, with `Retry-After`.
- **202 + job id** for anything slow.

### Interview questions

**Q: Sync or async for this step?** → the rule above with an example both ways.

**Q: How do services talk to each other in your design?**
> "Synchronously over HTTP when the caller needs an answer, and through the queue for anything slow or
> retryable. Events carry IDs, not big payloads, so consumers read fresh data, and every consumer is
> idempotent because delivery is at-least-once."

---

## 11. Real-time and mobile in a design

### Choosing the update mechanism ([09 §2](09-realtime-websockets.md))

| Need | Use |
|---|---|
| Server pushes only (progress, notifications) | **SSE** |
| Two-way (chat, live call state) | **WebSocket** |
| Can be a few seconds late, low traffic | **Polling** — and say so, it is a mature answer |
| App is closed or in the background | **Push notification** — sockets do not survive there |

### The two things to say about scaling real-time

1. **Fan-out across servers** — users are connected to different instances, so broadcast through
   **Redis Pub/Sub**.
2. **Reconnect and reconcile** — a phone that lost network missed events, so on reconnect the client
   **re-fetches state** rather than trusting the stream. The socket is an optimisation, not the source
   of truth.

### Mobile and offline-first ⭐ (your CRM is exactly this)

Offline-first is a distributed systems problem, and saying so is a strong signal.

| Problem | Answer |
|---|---|
| The phone may be offline when data is created | **Write locally first** (SQLite), then sync — zero data loss |
| The same record edited in two places | Conflict resolution: last-write-wins, or server-authoritative, or merge per field |
| Uploads fail on bad networks | An upload queue with retry and backoff, resumable for big files |
| Duplicate uploads after a retry | Client-generated IDs so the server can deduplicate — idempotency again |
| Clock differences between devices | Use server time for ordering, or a logical counter |

### Interview questions

**Q: How do you design live updates for a dashboard?**
> "SSE or WebSocket to the browser, with the event fan-out going through Redis Pub/Sub so it works with
> many app servers. Events are small signals; the client re-fetches on reconnect so a missed event is
> never permanent. And I throttle updates — one refresh per second beats fifty events."

**Q: How do you design an offline-capable mobile feature?** → the table above, leading with "write
locally first, sync later, and dedupe with client-generated IDs".

### Scenarios

**S10. Field staff use the app in areas with no signal, and data goes missing.**
> "The app is treating the network as reliable. The fix is offline-first: every action writes to local
> SQLite immediately with a client-generated ID and a `synced` flag, and a background queue uploads with
> retry and backoff when connectivity returns. The server deduplicates on that ID, so retries are safe.
> Then we choose a conflict rule per field — for call logs, append-only means there are no conflicts at
> all, which is the easiest kind of design to defend."

---

## 12. Security and multi-tenancy inside a design

Say these as part of the design, not as an afterthought — it is what separates a product engineer
from someone drawing boxes.

| Layer | What to say |
|---|---|
| **AuthN** | Short-lived access token + refresh with rotation ([11](11-auth-and-security.md)) |
| **AuthZ** | Role **and** ownership checked on the server for every request |
| **Tenant isolation** ⭐ | Tenant comes from the verified token; the data layer applies it automatically ([10](10-multi-tenant-saas.md)) |
| **Transport** | TLS everywhere; internal services in private subnets |
| **Secrets** | Secrets manager and roles, never in the repo or image |
| **Data** | Encryption at rest; PII minimised; retention and deletion policy |
| **Abuse** | Rate limits per tenant, request size limits, WAF at the edge |
| **Audit** | Who did what, especially for support impersonation |
| **Compliance** | Data residency — Indian health data stays in the India region |

### Interview questions

**Q: How do you keep tenants isolated in this design?**
> "The tenant ID comes from the verified token, never from the request body. It is carried through the
> request in AsyncLocalStorage, and the data layer applies the filter automatically, so a forgotten
> `where` clause is a bug, not a breach. Cache keys, S3 prefixes, queue payloads and the vector store
> namespace are all tenant-scoped too — isolation is not only the database."

**Q: What compliance questions would you expect for health data?**
> "Where the data is stored, who can access it, how long it is kept, whether third parties like an AI
> provider see it, and how a customer's data is exported and deleted. Those answers shape the design —
> region choice, per-tenant databases, PII redaction before third-party calls, and an audit log."

---
---

# LEVEL 5 — OPERATE

---

## 13. Observability, failure and cost in a design

A design is not finished at the happy path. Three closing moves make it look complete.

### 1. "How do we know it broke?"

| Watch | Why |
|---|---|
| **p95 latency, error rate, traffic** | The user-facing signals ([14 §14](14-cloud-devops.md)) |
| **Queue depth + oldest job age** ⭐ | The leading indicator for everything async |
| **Failed job count** | Silent failures live here |
| **Third-party error and latency rate** | Their outage becomes your incident |
| **Database connections, replication lag** | The usual first bottleneck |
| **Business metrics** ⭐ | Bookings per hour, calls completed — a drop means something broke that no technical alert caught |

⭐ Naming a **business metric** as an alert is a senior move. "If bookings drop 80% against the same
hour last week, page someone — even if every technical metric looks green."

### 2. "What breaks first, and where is the single point of failure?"

Answer honestly and give the fix. Every design has one. Pretending otherwise is the failure.

### 3. "What does it cost?"

Rough monthly shape: compute + database + storage + third parties (AI minutes, SMS, WhatsApp
templates). For AI and voice, cost per call or per report matters more than server cost — say that,
because it is the part that actually decides the product's margin.

### Interview questions

**Q: How would you monitor this system?** → the table, leading with queue depth and a business metric.

**Q: What is the single point of failure in your design?**
> "Right now, the single application instance and the primary database. The fix in order: two instances
> across two zones behind a load balancer, a managed database with Multi-AZ failover, and tested
> backups. I would rather name it than pretend it is not there."

---
---

# LEVEL 6 — REHEARSED DESIGNS

> ⭐ Four of these are **your own systems**. Practise them out loud with a pen. If you can draw and
> narrate designs 1 and 2 in 20 minutes each, you will pass most design rounds at your level.

---

## 14. Design 1 — WhatsApp appointment booking (Clinic Cloud)

```
Patient (WhatsApp) → Meta Cloud API → webhook → Nginx → NestJS API
   → verify HMAC signature → enqueue (BullMQ) → return 200 fast  ⭐
   → bot worker: conversation state in Redis, keyed by phone + clinic (with TTL)
        → intent → free slots (Postgres, cached) → patient picks
        → BOOK: transaction + conditional update → 409 to the loser
        → payment link (Razorpay) → webhook confirms, idempotently
   → confirmation template message
   → delayed jobs: reminder at T-24h and T-2h (cancelled if the appointment is)
   → Socket.IO pushes the live slot count to the clinic dashboard
```

**The five things to say while drawing:**
1. **Answer the webhook in milliseconds.** Verify the signature, enqueue, return 200. Meta retries if
   you are slow, and then you process everything twice.
2. **Conversation state lives in Redis, not in process memory** — any worker must be able to handle
   the next message, and the state expires by itself.
3. **Double booking is prevented by the database** — unique constraint plus conditional update.
4. **Reminders are delayed jobs**, and cancelling an appointment must remove the job **and** the
   worker must re-check status before sending.
5. **Idempotency everywhere** — Meta and Razorpay both deliver at least once.

**Likely deep dives:** the booking race · the 24-hour WhatsApp template window · reminder cancellation ·
what happens when the WhatsApp provider is down (queue and retry; the appointment is still valid).

---

## 15. Design 2 — Voice interview platform (Interview AI)

```
University admin (dashboard) ─┐
Student (onboarding UI) ──────┤→ NestJS API → tenant guard → ALS binds that tenant's Prisma client
                                        ↑ control-plane DB: encrypted connection strings, LRU client pool
   Documents → presigned S3 → Azure Document Intelligence (queued) → verified
   Knowledge base → chunk → embed → Pinecone (namespace per tenant)
   Interview → telephony → STT (Deepgram) → LLM → TTS (ElevenLabs)   ← streaming, ~1s budget
             → call webhooks ingested append-only and idempotently
   Queues: assignment · evaluation · report · prep guide · summary · indexing · extraction · email
             → EVERY worker re-binds tenant context before touching the database  ⭐
   Reports → PDF → S3 → emailed
```

**The five things to say:**
1. **Database per tenant**, because universities ask about isolation in procurement and there are tens
   of them, not thousands. Per-tenant backup, restore and deletion come free.
2. **The connection problem is the real cost** — one pool per tenant would exhaust Postgres, so clients
   live in an **LRU cache** and idle ones are closed.
3. **Workers have no HTTP request**, so the tenant travels in the job payload and is re-bound before
   any database access.
4. **The voice path is latency-critical** — everything streams, with about a one-second budget
   ([13 §24](13-ai-llm-voice.md)).
5. **Evaluation must be consistent** — a rubric, temperature 0, schema-validated output, and a golden
   set so a prompt change is measured.

**Likely deep dives:** tenant isolation · migrating N databases · the latency budget · evaluation
fairness and appeals · what happens when the LLM provider is down.

---

## 16. Design 3 — Public API platform with API keys (Sicada)

```
Partner system → gateway → key auth (hash lookup, cached) → rate limit (per key)
   → usage metering (Redis counters → periodic flush to Postgres → billing)
   → resources: agents, campaigns, knowledge bases, numbers, scheduled calls, conversations
   → long operations return 202 + a status resource; completion pushed by partner webhook
   → OpenAPI spec → generated docs and SDKs
```

**The five things to say:**
1. **Keys are hashed at rest**, shown once, scoped, and rotatable with an overlap window.
2. **Rate limit per key**, with `Retry-After` and limit headers so a good client can behave.
3. **Metering is fast but lossy** — Redis counters flushed periodically, then **reconciled against
   request logs for billing**, because billing must be right, not fast.
4. **Backward compatibility is the whole product.** Once a partner integrates, you cannot change your
   mind — additive changes only, versioned URLs, a deprecation window with `Sunset` headers.
5. **Outbound webhooks are your reliability problem now** — signed, retried with backoff, event IDs so
   partners can be idempotent, and a replay endpoint.

**Likely deep dives:** key rotation · metering accuracy · versioning · noisy partner · webhook delivery
guarantees.

---

## 17. Design 4 — CRM with call tracking (B2C CRM)

```
Web dashboard ──click to call──► Laravel API ──► Pusher private-user.{id}
                                                        ▼
Android: foreground SocketService → CallModule (ACTION_CALL) → CallStateModule → overlay
   → write to local SQLite FIRST (zero data loss)  ⭐
   → upload queue → recording multipart upload (retry, backoff)
   → backend NLP: sentiment, emotion timeline, talk ratio, topics, action items
   → pre-aggregated analytics → dashboards
```

**The five things to say:**
1. **Local write first.** The phone is offline constantly; the local database is the source of truth
   until the sync succeeds.
2. **A foreground service is required** on modern Android for reliable call state and overlays.
3. **Reconnect and reconcile** — after a dead zone, the app re-fetches rather than trusting missed
   socket events.
4. **Uploads are queued and resumable**, with client-generated IDs so a retry cannot create duplicates.
5. **Analytics are pre-aggregated**, not computed by scanning raw call logs on each dashboard load.

**Likely deep dives:** conflict resolution · battery and background limits · scaling the NLP pipeline ·
privacy and consent for recordings.

---

## 18. Design 5 — Caller ID lookup at scale (Truecaller-like)

The one that is **not** yours — so use it to show fundamentals.

```
Phone app → on-device cache → edge/CDN → API → Redis → sharded read store
Crowd-sourced names → queue → batch aggregate → rebuild read store (CQRS-flavoured)
```

**The five things to say:**
1. **Read-dominated, tiny payload, huge dataset** → this is a caching and partitioning problem, not a
   compute problem.
2. **Shard by phone number** with consistent hashing — high cardinality, even spread, present in every
   query.
3. **Multi-layer cache:** on-device for recent contacts → edge → Redis → store. Most lookups never
   reach the database.
4. **Writes are async** — crowd-sourced names go through a queue and batch aggregation. Reads never
   wait for writes.
5. **A bloom filter** skips lookups for numbers you have nothing on — cheap, and it shows depth.

⭐ **Privacy is a real answer here:** consent, opt-out and unlisting, and not exposing raw contact
graphs. Saying it unprompted makes you stand out.

---
---

# WRAP-UP

---

## 19. Numbers worth memorising

| Thing | Order of magnitude |
|---|---|
| RAM read | ~100 ns |
| SSD random read | ~100 µs |
| Redis round trip (same data centre) | ~0.5–1 ms |
| Postgres indexed query | ~1–10 ms |
| Same-region network hop | ~1 ms |
| Cross-continent round trip | ~100–150 ms |
| LLM time to first token | ~300–1000 ms |
| **1M requests/day** | **~12 QPS average → plan ~60 QPS peak** |
| 1 KB × 1M rows/day | ~1 GB/day → ~365 GB/year |
| One Node API instance | Hundreds of requests/second (I/O bound work) |
| Postgres connections | Low hundreds — the usual first wall |
| Embedding (1536 dims) | ~6 KB → 1M vectors ≈ 6 GB |

**Two rules of thumb to say:**
- **Memory is ~100× faster than SSD, and SSD is ~100× faster than a cross-continent round trip.**
- **Anything over ~200 ms is felt by a user; anything over ~2 s needs streaming or a queue.**

---

## 20. The follow-ups that always come

| Question | Your answer |
|---|---|
| **"What breaks first at 10× traffic?"** | "The database — connections first, then write throughput. Then any synchronous third-party call." |
| **"How do you know it is broken?"** | "p95 latency, error rate, queue depth and oldest job age, plus a business metric like bookings per hour." |
| **"Where is the single point of failure?"** | Name it honestly, then give the fix. |
| **"How would you migrate this with zero downtime?"** | "Expand and contract — additive migration, dual write, backfill, switch reads, drop later." |
| **"How much would it cost?"** | Rough compute + database + storage + per-call third-party cost; for AI, cost per report or per call. |
| **"What would you do differently with more time?"** | Have two real answers ready. It shows judgement, not regret. |
| **"How would you test this?"** | "Unit tests for the rules, integration tests against a real database for the booking race, and a load test on the hot path." |
| **"What if the third party is down?"** | Graceful degradation, per dependency ([§9](#9-reliability-patterns-name-them-by-name)). |

---

## 21. Rapid-fire — by level

### The method
| Word | One line |
|---|---|
| **Functional requirement** | What it must do |
| **Non-functional** | How well — latency, availability, consistency, cost |
| **QPS** | Requests per second; 1M/day ≈ 12/s average |
| **Read:write ratio** | Decides caching vs queueing |

### Building blocks
| Word | One line |
|---|---|
| **Stateless service** | Keeps nothing between requests |
| **Load balancer** | Spreads traffic, health checks |
| **CDN** | Static content near the user |
| **Read replica** | A copy for reads |
| **Object storage** | Files live in S3, never on the app disk |
| **Modular monolith** | One deployable, clean internal boundaries |
| **Queue-based load levelling** | A spike becomes queue depth |
| **Outbox pattern** | Row and event written in one transaction |
| **Fan-out** | One event triggers many jobs |

### Theory
| Word | One line |
|---|---|
| **Strong consistency** | Every read sees the last write |
| **Eventual consistency** | Reads catch up shortly |
| **CAP** | On a partition, choose consistency or availability |
| **ACID** | Atomic, consistent, isolated, durable |
| **Saga** | Local steps with compensating undo actions |
| **Replication lag** | Replica is behind the primary |
| **Read-after-write** | Your own write must be visible to you |
| **Sharding** | Splitting data across databases |
| **Shard key** | The field that decides where data lives |
| **Hot shard** | One shard takes most traffic |
| **Consistent hashing** | Adding a node moves few keys |
| **Idempotency** | Repeating is safe |
| **Circuit breaker** | Fail fast while a dependency is sick |
| **Bulkhead** | Isolated resource pools |
| **Backpressure** | Slow intake when overloaded |
| **Graceful degradation** | Feature off, product alive |

### Delivery & operate
| Word | One line |
|---|---|
| **Sync vs async** | Need the answer now, or not |
| **202 + job id** | Accepted, result later |
| **Idempotency key** | Client-supplied key making retries safe |
| **Pub/Sub fan-out** | Broadcast to all app servers |
| **Reconcile on reconnect** | Re-fetch instead of trusting missed events |
| **Offline-first** | Write locally, sync later |
| **Conflict resolution** | Rule for two edits of one record |
| **p95** | 95% of requests are faster than this |
| **Queue depth** | The leading indicator for async health |
| **Business metric alert** | Bookings dropped, even if servers look fine |
| **SPOF** | Single point of failure |
| **Expand and contract** | Safe multi-step schema change |

---

## 22. Self-check

**The method**
- [ ] Run the 7 steps on a cold prompt without skipping clarification
- [ ] Ask 5 good clarifying questions for any prompt
- [ ] Estimate QPS and storage in 4 lines

**Building blocks**
- [ ] Draw the standard architecture from memory and say why each box exists
- [ ] Give the monolith vs microservices answer
- [ ] Choose SQL or NoSQL with a reason
- [ ] Explain how to make double booking impossible
- [ ] Name the cache layers, with TTL and invalidation for one of them
- [ ] Give 4 reasons to use a queue, and explain the outbox pattern

**Theory**
- [ ] Explain strong vs eventual consistency, per feature
- [ ] Explain CAP, including that P is not a choice
- [ ] Explain a saga with a real compensation
- [ ] Say the scaling order, ending with "shard last"
- [ ] Explain replication lag and read-after-write
- [ ] Name 8 reliability patterns, with an example each

**Delivery & operate**
- [ ] Decide sync vs async with the failure rule
- [ ] Explain real-time fan-out and reconnect reconciliation
- [ ] Explain offline-first with conflict handling
- [ ] Say how tenants stay isolated across DB, cache, S3, queue and vector store
- [ ] Say what you would monitor, including a business metric

**Practice**
- [ ] Whiteboard Design 1 (WhatsApp booking) in 20 minutes, out loud
- [ ] Whiteboard Design 2 (Interview AI) in 20 minutes, out loud
- [ ] Answer all 8 standard follow-ups in §20

---

## 23. Traps — how people lose this round

**Process**
1. **Drawing before clarifying.** The single most common failure.
2. **Silence while thinking.** Narrate your reasoning.
3. **Designing for 100M users** when they said 1,000. Over-engineering is a real mark against you.
4. **Ignoring their hints.** If they ask about one box twice, that is where the interview is.
5. **No trade-offs.** "I would use X" without "instead of Y, because…" sounds memorised.

**Technical**
6. **Preventing double booking in application code** instead of with a database constraint.
7. **Forgetting the queue** and putting slow third-party calls in the request path.
8. **No timeouts or circuit breakers** on external calls.
9. **Caching without saying the TTL and the invalidation.**
10. **A cache key without the tenant** in a multi-tenant system.
11. **Assuming events cannot be lost or duplicated** — delivery is at-least-once.
12. **"We'll just shard"** as an early answer, before indexes, caching and replicas.
13. **Treating a read replica as a backup.**
14. **Sockets treated as guaranteed delivery** — no reconnect reconciliation.
15. **Ignoring mobile reality** — offline, background limits, battery.

**Closing**
16. **No monitoring story.** A design without "how would we know it broke" is unfinished.
17. **Claiming no single point of failure** when there obviously is one.
18. **Never mentioning cost**, especially for AI and voice, where cost per call decides the product.
19. **Buzzwords without need** — Kafka, Kubernetes, microservices, event sourcing. Justify or drop.

---

> **Practice plan:** pick one design from §14–§18 a day. Set a 20-minute timer, draw it on paper,
> narrate it out loud, then answer all 8 follow-ups in §20 from memory. Reading this file is not
> practice — **saying it is**.
