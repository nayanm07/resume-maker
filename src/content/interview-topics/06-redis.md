# 06 — Redis (Complete Topic Notes)

> **Who this is for:** you, the night before an interview, when someone says *"So, tell me about Redis."*
> Everything here is in plain English first, then the real command, then the answer you say out loud.
> **Time:** ~3 hours · **Prereq:** none · **Pairs with:** [06 — Redis, BullMQ & Async](../notes/06-redis-bullmq.md) (the short, dense version)

---

## 0. The 30-second answer (memorise this one)

> 💬 **"What is Redis?"**
> "Redis is an in-memory data store. It keeps data in RAM instead of on disk, so reads and writes
> take microseconds instead of milliseconds. It's not just a key-value cache — it has real data
> structures: strings, hashes, lists, sets, sorted sets and streams. I use it for four things in
> production: caching hot reads, rate limiting, distributed locks, and as the backing store for
> BullMQ job queues. It's single-threaded for commands, which sounds like a weakness but is
> actually the reason every command is atomic — no locks needed."

That paragraph alone passes most Redis screening questions. The rest of this chapter is so you can
survive the follow-ups.

---

## 1. Why Redis is fast — the honest reason

Three reasons, in order of importance:

| Reason | Plain English |
|---|---|
| **1. Data lives in RAM** | Disk is a storeroom in the basement. RAM is your desk. Redis keeps everything on the desk. RAM is roughly 100,000× faster than a spinning-disk seek, and still ~100× faster than an SSD read. |
| **2. Simple data model** | No query planner, no joins, no table scans, no rows-to-objects mapping. You ask for a key, it hashes the key, it hands you the value. |
| **3. Single-threaded event loop** | One thread runs all commands, one after another. No lock contention, no context switching between threads. |

**The interviewer's favourite follow-up:** *"Single-threaded sounds slow. Isn't that a bottleneck?"*

> 💬 "For command execution, no — the bottleneck in Redis is almost never CPU, it's network I/O and
> memory. One thread doing simple in-memory operations handles ~100k operations per second easily.
> Modern Redis (6+) is still single-threaded for the *commands* but uses extra threads for reading
> and writing sockets. And single-threaded gives me something valuable for free: every command is
> atomic. `INCR` can never lose a count from a race, because two `INCR`s physically cannot run at
> the same instant."

⚠️ **The real consequence of single-threaded:** one slow command blocks *everyone*. `KEYS *` on a
million-key database will freeze your production Redis for seconds. This is the #1 Redis outage
story, and a great thing to mention (see §14).

---

## 2. The mental model: keys, values, TTL

Redis is one giant dictionary.

```
key                                  →  value
"user:42"                            →  a hash    {name: "Nayan", role: "admin"}
"clinic:9:permissions"               →  a JSON string
"ratelimit:ip:1.2.3.4"               →  a counter  17
"queue:evaluation:waiting"           →  a list
```

**Key naming convention** (say this — it shows you've run Redis in production, not just in a tutorial):

```
<app>:<entity>:<id>:<field>        e.g.  cliniccloud:clinic:9:settings
```

Colons are just convention — Redis doesn't care — but they make keys readable and let you scan by
prefix. Always **namespace by tenant/app** so two features can't collide on the same key.

### TTL — the most useful feature in Redis

TTL = time to live. "Delete this key by yourself after N seconds."

```bash
SET otp:9876543210 "482913" EX 300     # expires in 5 minutes, automatically
TTL otp:9876543210                     # 287  (seconds left)
TTL some:permanent:key                 # -1   (key exists, no expiry set)
TTL deleted:key                        # -2   (key doesn't exist)
EXPIRE user:42 3600                    # add a TTL to an existing key
PERSIST user:42                        # remove the TTL — make it permanent
```

**Why it matters:** TTL is your safety net. Even if your cache-invalidation code has a bug, stale
data dies on its own within the TTL. This is the single best argument for *always* setting a TTL on
cache keys.

*How does Redis actually delete expired keys?* Two ways, and knowing both is a good signal:

1. **Lazy** — when you read a key, Redis checks if it expired and deletes it then.
2. **Active** — a background job samples 20 random keys that have TTLs, 10× per second, and deletes
   the expired ones; if more than 25% were expired it immediately samples again.

So an expired key may still occupy memory for a short while. It will never be *returned* to you,
but it counts against memory until collected.

---

## 3. The data types — with a real use for each

This is the section that separates "I've used Redis as a cache" from "I know Redis". Learn one real
use case per type.

### 3.1 String — the workhorse

A string is any blob up to 512 MB: text, JSON, a number, even a JPEG.

```bash
SET clinic:9:settings '{"tz":"IST","beds":40}' EX 600
GET clinic:9:settings
SET counter 0
INCR counter                  # 1   — atomic, no read-modify-write race
INCRBY counter 10             # 11
DECR counter                  # 10
SETNX lock:invoice:55 "held"  # sets ONLY if the key does not exist → the basis of locking
MSET a 1 b 2 c 3              # set many at once
MGET a b c                    # get many in one round trip
STRLEN clinic:9:settings
```

**Use for:** cached JSON blobs, counters, feature flags, OTPs, rate-limit counters.

⭐ **Why `INCR` matters:** in app code, `x = get(); x = x + 1; set(x)` is three steps — two requests
can read the same value and one increment is lost. `INCR` is one atomic step on the server. Any time
you need a counter, use `INCR`, never read-modify-write.

### 3.2 Hash — an object stored under one key

```bash
HSET user:42 name "Nayan" role "admin" plan "pro"
HGET user:42 role             # "admin"      ← read ONE field, not the whole object
HGETALL user:42               # everything
HMGET user:42 name plan       # several fields
HINCRBY user:42 loginCount 1  # atomic counter inside a hash
HDEL user:42 plan
HEXISTS user:42 role
```

**Use for:** objects where you often need one field. Storing a user as JSON in a String means
fetching and parsing 4 KB just to read one boolean. A Hash lets you fetch only that field.

⚠️ **Trap:** you cannot set a TTL on an individual hash *field* (Redis 7.4 added `HEXPIRE`, but it's
new and not everywhere). TTL applies to the whole key. Interviewers love this question.

### 3.3 List — an ordered queue

A linked list. Push and pop from either end, both O(1).

```bash
LPUSH tasks "job1"            # push to the left (head)
RPUSH tasks "job2"            # push to the right (tail)
LPOP tasks                    # pop from the left
BRPOP tasks 0                 # BLOCKING pop — waits until an item arrives (0 = wait forever)
LRANGE tasks 0 -1             # view everything (index 0 to last)
LLEN tasks
LTRIM recent:logs 0 99        # keep only the newest 100 — a capped list
```

**Use for:** simple FIFO queues (`LPUSH` + `BRPOP`), "last 50 activity items" feeds (`LPUSH` +
`LTRIM`).

**Why `BRPOP` is nice:** the worker sleeps instead of polling `LPOP` in a loop. No busy waiting, no
wasted CPU, instant pickup.

### 3.4 Set — unique members, no order

```bash
SADD clinic:9:doctors 101 102 103
SADD clinic:9:doctors 101        # → 0, already there. Duplicates are impossible.
SISMEMBER clinic:9:doctors 102   # → 1   O(1) membership check
SMEMBERS clinic:9:doctors
SCARD clinic:9:doctors           # count
SREM clinic:9:doctors 103
SINTER set:a set:b               # intersection — "users in both campaigns"
SDIFF set:a set:b                # difference
```

**Use for:** de-duplication (processed webhook IDs), tag membership, "has this user already voted",
online-user sets, mutual-friends style intersections.

### 3.5 Sorted Set (ZSET) — a set where every member has a score ⭐

The most powerful and most under-known type. Members are unique; each has a numeric **score**; Redis
keeps them sorted by score at all times.

```bash
ZADD leaderboard 950 "nayan" 1200 "asha" 700 "ravi"
ZRANGE leaderboard 0 -1 WITHSCORES        # low → high
ZREVRANGE leaderboard 0 9 WITHSCORES      # top 10
ZRANK leaderboard "nayan"                 # position, 0-based
ZSCORE leaderboard "nayan"
ZINCRBY leaderboard 50 "nayan"            # atomic score bump
ZRANGEBYSCORE reminders 0 1735689600      # everything due before this timestamp ⭐
ZREMRANGEBYSCORE ratelimit:u42 0 1735689000   # delete old entries
```

**Three killer uses — know all three:**

1. **Leaderboards / rankings** — score = points.
2. **Delayed jobs / schedulers** — score = the unix timestamp when the job should run. A worker
   polls `ZRANGEBYSCORE key 0 <now>`. **This is exactly how BullMQ implements delayed jobs.**
3. **Sliding-window rate limiting** — score = request timestamp (see §6).

### 3.6 Stream — an append-only log with consumer groups

Like Kafka's little brother, built into Redis.

```bash
XADD events * type "call.completed" callId "77"   # * = auto-generate the ID
XLEN events
XRANGE events - +
XGROUP CREATE events workers 0
XREADGROUP GROUP workers worker1 COUNT 10 STREAMS events >
XACK events workers 1735689600000-0               # mark as processed
```

**Why it beats Pub/Sub:** messages are **persisted**. A consumer that was offline can come back and
read what it missed. Consumer groups let several workers split the load, and unacknowledged messages
can be claimed by another worker if one dies.

**Use for:** event sourcing, audit logs, work distribution where losing a message is unacceptable.

### 3.7 The rest (one line each — enough to name them)

| Type | What it is | Use |
|---|---|---|
| **Bitmap** | Bits stored on a string | Daily active users: `SETBIT dau:2026-09-04 <userId> 1`, count with `BITCOUNT`. 1M users = 125 KB. |
| **HyperLogLog** | Approximate unique counter | "Roughly how many unique visitors?" — 12 KB for billions of items, ~0.81% error. `PFADD`, `PFCOUNT`. |
| **Geospatial** | Lat/long stored on a ZSET | "Doctors within 5 km": `GEOADD`, `GEOSEARCH`. |

---

## 4. Caching — the #1 real-world use

### The pattern you actually use: cache-aside (lazy loading)

```
READ:
  1. Look in Redis.
  2. HIT  → return it. Done. (~1 ms)
  3. MISS → read Postgres → write it into Redis with a TTL → return it. (~50 ms)

WRITE:
  1. Write to Postgres.
  2. DELETE the Redis key.   ← delete, do NOT update
```

```ts
async function getClinicSettings(clinicId: string) {
  const key = `clinic:${clinicId}:settings`;

  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);                      // HIT

  const fresh = await prisma.clinic.findUnique({ where: { id: clinicId } });
  await redis.set(key, JSON.stringify(fresh), 'EX', 600);     // MISS → fill, 10 min TTL
  return fresh;
}

async function updateClinicSettings(clinicId: string, data: any) {
  const updated = await prisma.clinic.update({ where: { id: clinicId }, data });
  await redis.del(`clinic:${clinicId}:settings`);             // invalidate, don't overwrite
  return updated;
}
```

⭐ **Why delete instead of update?** Two writers, A and B. A writes value 1, B writes value 2. If the
network reorders their cache updates, the cache can end up holding 1 while the DB holds 2 — and it
stays wrong until the TTL expires. **Deleting is idempotent**: whoever deletes last, the next read
just refetches the truth. Say this exact reasoning; it's a senior-level answer.

### The three cache problems — name them by name

| Problem | Plain English | Fix |
|---|---|---|
| **Stampede / thundering herd** | One hot key expires. 500 requests miss at the same moment and all hammer Postgres. | A short lock so only one request rebuilds; or serve stale while one refreshes; or **jitter the TTL** (`600 + random(0..60)`) so keys don't expire together. |
| **Penetration** | Someone requests an ID that doesn't exist, over and over. Every request misses the cache *and* misses the DB. | Cache the "not found" result too, with a short TTL (30–60s). Or put a bloom filter in front. |
| **Avalanche** | A huge number of keys expire at once (or Redis restarts cold) and the whole load lands on the DB. | Jittered TTLs, warm the cache on deploy, a circuit breaker in front of the DB. |

### What to cache (and what not to)

| ✅ Good candidate | ❌ Bad candidate |
|---|---|
| Read often, changes rarely (permissions, config, catalogue) | Changes on every request |
| Expensive to compute (aggregations, LLM output, big joins) | Trivially cheap to fetch |
| Same for many users (shared) | Unique per request, read once |
| Stale-tolerable for N seconds | Must be perfectly consistent (a bank balance) |

> 💬 **Your line:** "In Clinic Cloud I cache clinic config, permission sets and ABDM certificates —
> read on nearly every request, changed maybe once a week. Cache-aside with explicit invalidation on
> the write path plus a TTL as the safety net. I invalidate a precise key — clinic *and* user —
> rather than flushing a prefix, so one permission edit doesn't cold-start the whole tenant."

---

## 5. Sessions & tokens

```bash
SET session:abc123 '{"userId":42,"role":"admin"}' EX 1800   # 30-min sliding session
EXPIRE session:abc123 1800                                  # refresh on activity
DEL session:abc123                                          # logout
```

**The JWT logout problem:** a JWT is stateless — you cannot un-issue it. The standard fix is a Redis
**denylist**:

```ts
// on logout
const secondsLeft = decoded.exp - Math.floor(Date.now() / 1000);
if (secondsLeft > 0) await redis.set(`jwt:blocked:${jti}`, '1', 'EX', secondsLeft);

// on every request
if (await redis.exists(`jwt:blocked:${payload.jti}`)) throw new UnauthorizedException();
```

The TTL equals the token's remaining life, so the denylist cleans itself up and never grows without
bound. That detail *is* the answer — anyone can say "keep a blacklist".

---

## 6. Rate limiting — three algorithms, increasing quality

### 6.1 Fixed window (simplest)

```ts
const key = `rl:${userId}:${Math.floor(Date.now() / 60000)}`;  // one key per minute
const hits = await redis.incr(key);
if (hits === 1) await redis.expire(key, 60);
if (hits > 100) throw new TooManyRequestsException();
```

✅ Two commands, dead simple.
❌ **Edge burst:** 100 requests at 10:00:59 and 100 more at 10:01:00 = 200 in one second.

### 6.2 Sliding window with a ZSET (accurate)

```ts
const now = Date.now();
const key = `rl:${userId}`;
await redis.zremrangebyscore(key, 0, now - 60_000);   // drop entries older than 60s
const count = await redis.zcard(key);
if (count >= 100) throw new TooManyRequestsException();
await redis.zadd(key, now, `${now}-${Math.random()}`);
await redis.expire(key, 60);
```

✅ A true rolling 60 seconds — no edge burst.
❌ Stores one member per request (more memory). Run it inside a Lua script or `MULTI` so the
check-and-add is atomic — otherwise two concurrent requests can both pass the check.

### 6.3 Token bucket (allows controlled bursts)

Tokens refill at a fixed rate; each request spends one. A user who was idle can burst, then is
throttled down to the refill rate. This is what most public APIs actually do. Implement it in Lua so
refill-and-spend is one atomic step.

> 💬 **Say this:** "Fixed window is two commands but allows a double burst at the boundary. I'd use a
> sorted-set sliding window when fairness matters, in a Lua script so the check and the insert are
> atomic."

---

## 7. Distributed locks — "only one server should do this"

You run 3 API instances. A cron fires on all 3. Only one should send the invoice.

```ts
// acquire
const token = randomUUID();                        // proves the lock is MINE
const ok = await redis.set('lock:invoice:55', token, 'NX', 'PX', 10_000);
// NX = only if not exists   PX = auto-expire in 10s (so a crash can't deadlock)
if (!ok) return;                                   // someone else has it

try {
  await sendInvoice(55);
} finally {
  // release ONLY if I still hold it — atomic compare-and-delete via Lua
  await redis.eval(
    `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
    1, 'lock:invoice:55', token,
  );
}
```

**The three details that make this a good answer:**

1. `NX` — atomic "set if absent". Never `EXISTS` then `SET`; that's a race.
2. `PX` — always a TTL. If the process dies holding the lock, without a TTL it's held forever.
3. **Random token + Lua release** — if your work overran the TTL, the lock may already belong to
   someone else. A blind `DEL` would delete *their* lock. Compare-then-delete, atomically.

⚠️ **Be honest about the limit:** "A single-instance Redis lock is not a correctness guarantee — if
Redis fails over to a replica that hasn't received the lock write, two holders are possible. Redlock
across independent nodes reduces that, and it's debated. So for anything where double execution
would be catastrophic — money, for instance — I make the *operation* idempotent too, and treat the
lock as an optimisation rather than the only defence."

That answer, offered unprompted, reads as genuinely senior.

---

## 8. Atomicity — pipelines, transactions and Lua

| Tool | What it does | Atomic? |
|---|---|---|
| **Pipeline** | Sends many commands in one network round trip | ❌ No — just fewer round trips; other clients can interleave |
| **MULTI/EXEC** | Queues commands, runs them together | ✅ Yes, consecutively — but you **cannot** branch on a result mid-transaction |
| **Lua script (`EVAL`)** | Runs your script on the server | ✅ Yes, *and* you can use `if` on intermediate results |
| **WATCH** | Optimistic locking: abort the `EXEC` if a watched key changed | ✅ Retry-based (a CAS loop) |

```ts
// Pipeline: 3 commands, 1 round trip — the easiest latency win there is
const results = await redis.pipeline().get('a').get('b').incr('c').exec();
```

**Rule of thumb:** need speed → pipeline. Need "all these commands together" → MULTI. Need "read a
value, decide, then write" as one step → **Lua**. Every rate limiter and lock you write eventually
becomes a Lua script.

⚠️ Lua scripts block the single thread. Keep them tiny — microseconds, not milliseconds.

---

## 9. Pub/Sub vs Streams vs Lists — picking the right messaging tool

```bash
SUBSCRIBE call:updates            # terminal 1
PUBLISH call:updates '{"id":77}'  # terminal 2
```

| | **Pub/Sub** | **List queue** | **Stream** |
|---|---|---|---|
| Message stored? | ❌ Never | ✅ Until popped | ✅ Until trimmed |
| Offline subscriber | **Loses the message** | Gets it later | Gets it later |
| Consumers per message | All subscribers | Exactly one | One per consumer group |
| Replay history | ❌ | ❌ | ✅ |
| Use for | Live fan-out where loss is OK: cache-invalidation signals, presence, WebSocket fan-out across servers | Simple work queue | Durable events, audit trails |

⭐ **Pub/Sub is fire-and-forget.** If nobody is listening, the message vanishes. Never use it for
anything that must happen. Its best use is exactly what you do in real-time systems: broadcasting an
event to every app server so each can push it down its own WebSocket connections.

---

## 10. Persistence — what survives a restart

| | **RDB (snapshot)** | **AOF (append-only file)** |
|---|---|---|
| What it saves | A full point-in-time dump, every N minutes | Every write command, appended to a log |
| Restart speed | Fast (load one compact file) | Slower (replay the log) |
| Data loss window | Up to the snapshot interval — minutes | `everysec` (default): ~1 second. `always`: none, but slow |
| File size | Small | Large (compacted by periodic rewrite) |
| Best for | Backups, seeding replicas | Durability |

**Default production answer:** "Enable both. RDB for fast restarts and backups, AOF with
`appendfsync everysec` so the worst case is one second of lost writes. And I stay clear that Redis is
not my system of record — Postgres is. If Redis loses a second of cache, nothing breaks."

That last sentence is the one interviewers are listening for.

---

## 11. Eviction — what happens when memory runs out

Set `maxmemory`, then choose what Redis does when it's full:

| Policy | Behaviour |
|---|---|
| `noeviction` | Reject writes with an error. **Use for queues** — never silently drop a job. |
| `allkeys-lru` | Evict the least recently used key. **Use for a pure cache.** |
| `allkeys-lfu` | Evict the least *frequently* used. Better when a few keys are permanently hot. |
| `volatile-lru` | Evict LRU, but only among keys that have a TTL |
| `allkeys-random` / `volatile-ttl` | Random / shortest remaining TTL first |

⚠️ **A production trap worth telling as a story:** running BullMQ on a Redis set to `allkeys-lru`.
Under memory pressure Redis quietly evicts job keys — jobs vanish with no error anywhere. Queues need
`noeviction`, and ideally a **separate Redis instance** from the cache, so a cache spike can never
touch the queue.

---

## 12. Scaling & high availability

| Setup | What it is | Gives you |
|---|---|---|
| **Single instance** | One Redis | Nothing if it dies |
| **Replication** | 1 primary + N replicas, async copy | Read scaling, a warm standby. **Async → a failover can lose the last few writes.** |
| **Sentinel** | Watchdog processes that detect a dead primary and promote a replica | Automatic failover, same single dataset |
| **Cluster** | Data split across N primaries by **hash slot** (16384 slots) | Horizontal scale of memory *and* writes |

**Cluster gotcha to mention:** a multi-key command only works if all its keys live in the same slot.
You force that with **hash tags** — `{clinic:9}:settings` and `{clinic:9}:permissions` hash only on
the part inside `{}`, so both land on the same node. Without hash tags, `MGET` across keys fails in
cluster mode.

---

## 13. Redis vs the alternatives

| | Redis | Memcached | Postgres |
|---|---|---|---|
| Data types | Many (hash, zset, stream…) | Strings only | Full relational |
| Persistence | Yes (RDB/AOF) | No | Yes — source of truth |
| Replication / cluster | Yes | Manual | Yes |
| Pub/Sub, scripting, queues | Yes | No | LISTEN/NOTIFY only |
| Threads | Single (for commands) | Multi-threaded | Multi-process |

> 💬 "Memcached is fine if you only need a plain string cache and want a simple multi-threaded LRU. I
> choose Redis because I also want sorted sets for delayed jobs and rate limits, atomic operations
> for locks, and persistence."

**When NOT to use Redis:** as the primary database for relational data; for datasets far larger than
RAM (RAM is expensive); when you need complex queries, joins, or strong transactional guarantees
across many entities; for very large blobs (use S3).

---

## 14. Operational things that make you sound experienced

```bash
redis-cli INFO memory          # used_memory_human, fragmentation ratio
redis-cli INFO stats           # keyspace_hits vs keyspace_misses → your HIT RATE
redis-cli --bigkeys            # find the key that's eating your RAM
redis-cli SLOWLOG GET 10       # the 10 slowest recent commands
redis-cli MONITOR              # live command stream — DEBUG ONLY, it's expensive
SCAN 0 MATCH "clinic:9:*" COUNT 100    # ✅ safe, paginated
KEYS clinic:9:*                        # ❌ NEVER in production — O(n), blocks everything
```

**Hit rate** = `hits / (hits + misses)`. Below ~80% for a cache means your TTL is too short, your keys
are too specific, or you're caching the wrong things.

**Three commands that can take down production** — knowing these is a real signal: `KEYS *`,
`FLUSHALL`, and `MONITOR` left running. All three hurt for the same reason: §1's single thread.

---

## 15. Node.js quick reference (ioredis)

```ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: null,      // required by BullMQ
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 200, 3000),   // reconnect with backoff
});

await redis.set('k', 'v', 'EX', 60);          // set with TTL
await redis.get('k');
await redis.del('k');
await redis.hset('user:42', { name: 'Nayan' });
await redis.hgetall('user:42');
await redis.zadd('lb', 950, 'nayan');
await redis.zrevrange('lb', 0, 9, 'WITHSCORES');
await redis.expire('k', 120);

// Always guard: a cache must never take down the request path
async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
  } catch (e) {
    logger.warn({ e }, 'redis read failed, falling through to db');   // ⭐ degrade, don't fail
  }
  const value = await fn();
  redis.set(key, JSON.stringify(value), 'EX', ttl).catch(() => {});
  return value;
}
```

⭐ **That try/catch is the point.** If Redis is down, the app should get slower, not break. Say "cache
failures are non-fatal by design" and you've answered the resilience question before it's asked.

---

## 16. How it maps to YOUR projects

| Where | What Redis does | The sentence to say |
|---|---|---|
| **Clinic Cloud** | Clinic config, permission sets, ABDM certificate caching | "Read on every request, changed weekly — cache-aside with explicit invalidation plus a TTL safety net" |
| **Clinic Cloud** | WhatsApp bot messages, appointment reminders via BullMQ | "Delayed jobs are a sorted set keyed on the due timestamp" |
| **Interview AI** | Evaluation, report generation, indexing, email queues | "Each worker re-binds tenant context before touching the DB" |
| **Interview AI** | LLM call rate limiting | "Worker concurrency plus BullMQ's limiter, and backoff with jitter on 429s" |
| **Public partner API** | Per-API-key rate limiting | "Sorted-set sliding window in a Lua script so check-and-add is atomic" |
| **Real-time features** | Pub/Sub fan-out across app servers | "Fire-and-forget is acceptable — a missed live update is re-fetched on reconnect" |
| **Anywhere multi-instance** | Distributed lock for crons | "`SET NX PX` with a random token and a Lua compare-and-delete release" |

---

## 17. Likely questions — model answers

**Q: What is Redis and why use it instead of a database?** → §0 + §1.

**Q: Redis is single-threaded — isn't that a problem?** → §1. Land on *"atomicity for free"* and
*"one slow command blocks everyone, which is why `KEYS *` is banned"*.

**Q: How do you keep the cache in sync with the database?**
> "I don't aim for perfect sync — I aim for a bounded staleness window. Cache-aside: on write I
> update Postgres and *delete* the key rather than updating it, because delete is idempotent and
> can't be reordered into a permanently stale value. The TTL is the safety net for any invalidation I
> miss. If a value truly cannot be stale, I don't cache it."

**Q: A key expires and 500 requests hit at once. What happens?**
> "Cache stampede. All 500 miss and hit Postgres together. Three fixes: jitter the TTLs so keys don't
> expire in lockstep, take a short lock so only one request rebuilds while the others wait or serve
> stale, or refresh proactively before expiry."

**Q: How would you rate-limit an API?** → §6, all three, with the trade-off.

**Q: How do you make sure only one server runs a cron?** → §7, including the honest caveat.

**Q: What happens if Redis goes down?**
> "Cache reads fall through to Postgres, so the app gets slower but keeps working — my cache calls are
> wrapped so a Redis failure is logged, not thrown. The real damage is queues: jobs can't be enqueued
> or processed, so async work stalls. I'd alert on enqueue failure and run the queue on a separate
> instance with `noeviction` so jobs are never silently dropped."

**Q: When would you NOT use Redis?** → §13. Wanting to answer "never" is the wrong instinct; naming
the limits is the right one.

**Q: Difference between Pub/Sub and Streams?** → §9. One line: "Pub/Sub forgets, Streams remember."

**Q: How do you store a user object — String or Hash?**
> "Hash if I read individual fields often, because `HGET` fetches one field instead of deserialising
> the whole object. String with JSON if I always read the whole thing — simpler, and it compresses
> better. The trade-off is that a Hash can't expire individual fields."

---

## 18. Rapid-fire one-liners (drill these daily)

| Term | One line |
|---|---|
| **In-memory** | Data lives in RAM → microsecond access, lost on restart unless persisted |
| **TTL** | Auto-delete after N seconds; the safety net for stale cache |
| **Cache-aside** | App checks cache, falls back to DB, fills the cache |
| **Invalidate** | Delete the key on write — don't overwrite it |
| **Stampede** | Many requests miss the same expired key at once |
| **Jitter** | Randomise TTLs so keys don't expire together |
| **Eviction** | What Redis deletes when memory is full (`allkeys-lru` for cache, `noeviction` for queues) |
| **RDB / AOF** | Snapshot / write log — the two persistence modes |
| **Atomic** | Happens completely or not at all; single-threaded gives Redis this for free |
| **`SET NX PX`** | Set if absent, with expiry → a distributed lock |
| **Lua / EVAL** | Multi-step logic run atomically on the server |
| **Pipeline** | Many commands, one round trip (not atomic) |
| **ZSET** | Sorted set — leaderboards, delayed jobs, sliding windows |
| **Hash slot** | Cluster's 16384 buckets; `{tag}` forces related keys onto one node |
| **Sentinel** | Automatic failover watchdog |
| **Hit rate** | hits / (hits + misses); under 80% means fix your caching |
| **SCAN not KEYS** | Paginated and safe vs O(n) and blocking |

---

## 19. Self-check — can you do these without looking?

- [ ] Explain Redis and why it's fast, in 30 seconds
- [ ] Name all 6 main data types with one real use each
- [ ] Draw the cache-aside read path and write path
- [ ] Explain why you delete rather than update the cache on write
- [ ] Define stampede, penetration and avalanche, plus one fix each
- [ ] Write a fixed-window rate limiter from memory (3 lines)
- [ ] Explain the sliding-window ZSET version and why it's better
- [ ] Write `SET NX PX` locking and explain the token + Lua release
- [ ] Explain RDB vs AOF and which you'd run
- [ ] Explain why a BullMQ Redis must be `noeviction`
- [ ] Say what breaks if Redis dies, and how you degrade gracefully
- [ ] Name three commands that can take down production Redis

---

## 20. Traps — how people lose the Redis round

1. **"Redis is just a cache."** It's a data-structure server. Naming ZSET-backed delayed jobs
   instantly separates you.
2. **Updating the cache on write** instead of deleting it → the permanent-stale race in §4.
3. **No TTL on cache keys.** One missed invalidation and the data is wrong forever.
4. **`KEYS *` in production.** Use `SCAN`. This is a real outage, not a style preference.
5. **Read-modify-write for counters** instead of `INCR` → lost updates under load.
6. **A lock without a TTL** → one crash deadlocks the feature permanently.
7. **A lock released with a blind `DEL`** → you delete someone else's lock after an overrun.
8. **`allkeys-lru` on a queue instance** → jobs silently evicted.
9. **Pub/Sub for anything that must not be lost.** Offline subscriber = message gone.
10. **Claiming "exactly-once".** The correct phrase is *at-least-once delivery plus idempotent
    processing = effectively once* — see [06 §4](../notes/06-redis-bullmq.md).
11. **Letting a Redis failure throw a 500.** Cache calls must degrade, not fail.
12. **Caching per-tenant data under a shared key** — the multi-tenant leak. Always namespace by tenant.

---

---

> **Next:** [06 — Redis, BullMQ & Idempotency](../notes/06-redis-bullmq.md) for the queue half of the story,
> then [07 — Real-Time Systems](../notes/07-realtime-websockets.md) for Pub/Sub fan-out in practice.
