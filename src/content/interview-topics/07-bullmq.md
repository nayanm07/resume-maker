# 07 — BullMQ & Job Queues (Complete Topic Notes)

> Written in easy English. Short lines. Say them out loud.
> **Time:** ~2.5 hours · **Needs:** [06 — Redis](06-redis.md) (BullMQ runs on Redis)

---

## 0. The 30-second answer (memorise this)

> 💬 **"What is BullMQ?"**
>
> "BullMQ is a job queue for Node.js. It uses Redis to store the jobs.
>
> I use it when work is slow and the user should not wait.
>
> My API takes the request, puts a job in the queue, and answers right away.
> A separate worker process picks up the job later and does the slow work.
>
> If the job fails, BullMQ retries it with a delay. If it keeps failing, it goes to a failed list
> where I can look at it and run it again."

That is the whole idea. Everything below is the detail.

---

## 1. What is a queue? (the simple picture)

Think of a restaurant.

- You order food at the counter.
- You get a **token number** and sit down.
- You do **not** stand at the counter and watch them cook.
- The kitchen cooks orders one by one.
- Your number is called when the food is ready.

Now map it to code:

| Restaurant | Your app |
|---|---|
| Your order | A **job** |
| The token you get back | The API response (`202 Accepted`) |
| The list of orders on the kitchen screen | The **queue** (stored in Redis) |
| The cook | The **worker** |
| More cooks in the kitchen | More workers / higher concurrency |
| Food burnt, cook it again | A **retry** |

**Without a queue:** the user waits 40 seconds while the AI writes a report. The browser may time
out. If the server restarts, the work is lost forever.

**With a queue:** the user waits 200 ms. The work happens in the background. If the server
restarts, the job is still in Redis and will run.

---

## 2. The four parts you must name

There are only four things in BullMQ. Learn these names.

| Part | What it is | One line |
|---|---|---|
| **Queue** | The list of work | You **add** jobs to it |
| **Job** | One unit of work + its data | `{ interviewId: 55 }` |
| **Worker** | The code that does the work | You **process** jobs here |
| **Redis** | Where all of it is stored | The queue is just Redis keys |

```
API server  ──add job──►  Redis (queue)  ──picks up──►  Worker process
   |                                                          |
returns 202 to user                                      does the slow work
```

**Important:** the API and the worker are usually **two separate processes**.
They never talk to each other directly. They only talk through Redis.

---

## 3. Job states — the life of one job

A job moves through states. Say these in order:

```
  waiting  ──►  active  ──►  completed
     ▲            │
     │            └──► failed ──► (retry) ──► waiting
  delayed
```

| State | Meaning in plain words |
|---|---|
| **waiting** | In the line. Nobody picked it up yet. |
| **delayed** | Should run later. Not in the line yet. |
| **active** | A worker is doing it right now. |
| **completed** | Done. Finished with no error. |
| **failed** | It threw an error and used up all its retries. |
| **paused** | The whole queue is stopped. Nothing is picked up. |
| **stalled** | A worker took it, then died or froze. See §9. |

⭐ If they ask "walk me through a job", just walk down this list.

---

## 4. Adding a job — every option explained

```ts
await evaluationQueue.add(
  'evaluate-interview',              // 1. name of the job
  { tenantId, interviewId },         // 2. the data (payload)
  {                                  // 3. the options
    jobId: `eval:${interviewId}`,
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    delay: 0,
    priority: 1,
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
);
```

Now each option, one line each:

| Option | What it does | Why you care |
|---|---|---|
| **`jobId`** | A custom ID for the job | ⭐ If a job with this ID already exists, BullMQ **ignores the new one**. Free protection against duplicates. |
| **`attempts`** | How many times to try | 5 means: 1 first try + 4 retries |
| **`backoff`** | How long to wait before retrying | `exponential` with 2000 → waits 2s, 4s, 8s, 16s |
| **`delay`** | Run after N milliseconds | For "remind me in 24 hours" |
| **`priority`** | Lower number = runs earlier | Use it rarely; it slows the queue down |
| **`removeOnComplete`** | Delete old finished jobs | ⚠️ Without this, Redis memory grows forever |
| **`removeOnFail`** | Keep only the last N failures | Keep more failures than successes — you need to debug them |
| **`repeat`** | Run again and again on a schedule | See §8 |

### ⚠️ The payload rule

**Keep the job data small. Send IDs, not objects.**

```ts
// ❌ bad — the whole interview object is copied into Redis, and it may be old by the time it runs
await queue.add('evaluate', { interview: bigInterviewObject });

// ✅ good — small, and the worker reads fresh data from the database
await queue.add('evaluate', { interviewId: 55, tenantId: 'clinic-9' });
```

Two reasons, and say both:
1. Redis stores the payload. Big payloads = big memory.
2. The job may run 10 minutes later. The copied data would be stale. The ID is never stale.

---

## 5. The worker — the code that does the work

```ts
import { Worker } from 'bullmq';

new Worker(
  'evaluation',                        // same queue name as the producer
  async (job) => {
    const { tenantId, interviewId } = job.data;
    await evaluate(tenantId, interviewId);
    return { ok: true };               // this is saved as the job's result
  },
  {
    connection,
    concurrency: 5,                    // 5 jobs at the same time in this process
    limiter: { max: 10, duration: 1000 },   // never more than 10 jobs per second
  },
);
```

Three things to understand:

**`concurrency: 5`**
One worker process handles 5 jobs at the same time.
This works because the jobs are mostly *waiting* (for the AI, for the database).
Node can wait for 5 things at once easily.
⚠️ If your job is heavy CPU work (image resize, big loop), concurrency does **not** help.
Node has one thread for your code. Use more worker **processes** instead.

**`limiter: { max: 10, duration: 1000 }`**
"Never do more than 10 jobs per second."
Use this to protect a third-party API that will block you (OpenAI, WhatsApp).

**If the function throws → the job fails → BullMQ retries it.**
So you never write retry loops yourself. Just throw the error.

---

## 6. Retries and backoff — explained slowly

A job fails. Should you try again immediately?

No. If the AI service is down, trying again in 1 millisecond will fail too.
So you **wait longer each time**. That is called **exponential backoff**.

With `attempts: 5` and `backoff: { type: 'exponential', delay: 2000 }`:

| Try | Waits before this try |
|---|---|
| 1 | — (runs immediately) |
| 2 | 2 seconds |
| 3 | 4 seconds |
| 4 | 8 seconds |
| 5 | 16 seconds |
| after that | job goes to **failed** |

**Why longer each time?** It gives the broken service time to recover.
And it stops your app from making the outage worse.

**Jitter** = add a small random amount to each wait.
Why? If 500 jobs fail at the same second, all 500 would retry at the exact same second again.
Random waits spread them out.

### Not every error should be retried

```ts
// A bad request will fail the same way forever. Do not retry it 5 times.
if (err.status === 400) {
  throw new UnrecoverableError('bad input — do not retry');   // BullMQ stops retrying
}
throw err;   // network error, 500, timeout → let it retry
```

> 💬 **Say this:** "I retry things that might work later — timeouts, 500s, rate limits.
> I do not retry things that will never work — bad input, a record that does not exist.
> BullMQ has `UnrecoverableError` for exactly that."

---

## 7. ⭐ Idempotency — the most important word here

**Simple meaning:** doing it 5 times gives the same result as doing it 1 time.

**Example:** "set the status to paid" is idempotent. Run it 10 times, status is still paid.
"Add ₹500 to the balance" is **not** idempotent. Run it 10 times, you added ₹5000. Bug.

### Why you are forced to care

Queues give **at-least-once** delivery. That means:
- A job can run twice. It happens.
- The worker may finish the work, then die before saying "done". Another worker will run it again.
- A payment provider will send you the same webhook twice if you were slow to answer.

You cannot stop duplicates. So you make duplicates **harmless**.

### Four ways to do it (know at least three)

**1. Same job ID**
```ts
await queue.add('evaluate', data, { jobId: `eval:${interviewId}` });
// Adding it again does nothing. BullMQ sees the ID already exists.
```

**2. Upsert instead of create**
```ts
await prisma.report.upsert({
  where:  { interviewId },     // if it exists, update it; if not, create it
  create: { interviewId, text },
  update: { text },
});
```

**3. A "processed events" table with a unique key**
```ts
await prisma.$transaction(async (tx) => {
  try {
    await tx.processedEvent.create({ data: { id: event.id } });   // unique primary key
  } catch (e) {
    if (isUniqueViolation(e)) return;      // seen before → do nothing
    throw e;
  }
  await applyEffect(tx, event);            // same transaction = both or neither
});
```

**4. Check the state before changing it**
```sql
UPDATE payments SET status = 'paid' WHERE id = $1 AND status = 'pending';
-- 0 rows updated means it was already paid. Nothing happens twice.
```

⚠️ **Never say "exactly-once delivery."** It is not possible in a distributed system.
The correct sentence is:

> "At-least-once delivery **plus** idempotent processing gives me *effectively* once."

That one sentence is worth a lot in an interview.

---

## 8. Delayed jobs and repeating jobs

### Delayed — "do this later, one time"

```ts
await queue.add('reminder', { appointmentId }, { delay: 24 * 60 * 60 * 1000 });  // in 24 hours
```

**How does it work inside?** BullMQ puts the job in a Redis **sorted set**.
The score is the timestamp when it should run.
A worker keeps asking Redis: "give me everything with a score less than now".
(That is §3.5 of [06 — Redis](06-redis.md). Nice link to make out loud.)

### Repeatable — "do this every day"

```ts
await queue.add('daily-report', {}, {
  repeat: { pattern: '0 9 * * *', tz: 'Asia/Kolkata' },   // every day at 9:00 AM IST
});
```

**Why is this better than a normal cron job on the server?**

| Server cron | BullMQ repeatable |
|---|---|
| Runs on every server → 3 servers = 3 emails | Runs **once**, no matter how many servers |
| No retry if it fails | Retries automatically |
| No history | You can see runs, failures, results |

⚠️ Always set a `jobId` or a repeat key you control, and always set a timezone.
Servers usually run in UTC. "9 AM" in UTC is 2:30 PM in India.

👉 Full detail on scheduling — cron syntax, the 3-servers problem, missed runs, overlap, monitoring —
is in [08 — Cron Jobs & Schedulers](08-cron-and-schedulers.md).

---

## 9. Stalled jobs — the question people get wrong

**What happens if a worker dies in the middle of a job?**

While a worker is doing a job, it keeps telling Redis "I am still alive" (a lock it renews).

If that stops — the process crashed, the container was killed, the code froze the event loop —
Redis notices the lock expired.
BullMQ then marks the job **stalled** and gives it to another worker.

**The important consequence — say this part:**

> "A stalled job may already be half done. So my handler must be safe to run twice.
> That is why every handler I write is idempotent."

**Also:** a job can stall even when nothing crashed.
If your code blocks the Node event loop (a big synchronous loop, `JSON.parse` on a huge string),
the worker cannot send its "I am alive" signal. Redis thinks it died.
Fix: never block the loop, or raise `lockDuration` for genuinely long jobs.

---

## 10. Failed jobs — your dead letter queue

After the last retry, the job sits in the **failed** list with its error and stack trace.

That is your DLQ (dead letter queue). It is not automatic — you must look at it.

```ts
const failed = await queue.getFailed(0, 20);   // last 20 failures
await job.retry();                             // push one back into the queue
await queue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');  // delete failures older than 7 days
```

> 💬 **Say this:** "Failures are not silent for me. I alert on the failed count, keep the error and
> the payload, and I can retry a job from the dashboard once the cause is fixed. The retry is safe
> because the handler is idempotent."

---

## 11. Watching the queue (monitoring)

```ts
import { QueueEvents } from 'bullmq';

const events = new QueueEvents('evaluation', { connection });
events.on('completed', ({ jobId }) => logger.info({ jobId }, 'done'));
events.on('failed', ({ jobId, failedReason }) => logger.error({ jobId, failedReason }));
events.on('stalled', ({ jobId }) => logger.warn({ jobId }, 'stalled'));
```

**Three numbers to watch in production** (a great answer to "how do you monitor it?"):

| Number | What it tells you |
|---|---|
| **Queue depth** (waiting count) | Growing = workers are too slow or too few |
| **Failed count** | Something is broken. Alert on this. |
| **Job duration** | Getting slower = a downstream service is struggling |

**bull-board** is a ready-made dashboard UI. Put it behind admin auth. Never make it public — the
job data usually has customer information in it.

---

## 12. Flows — jobs that depend on other jobs

Sometimes step C must wait for A and B to finish.

Example: transcribe the call **and** fetch the CRM data → then generate the summary.

```ts
await flowProducer.add({
  name: 'summary', queueName: 'ai', data: { callId },
  children: [
    { name: 'transcribe', queueName: 'ai', data: { callId } },
    { name: 'fetch-crm',  queueName: 'ai', data: { callId } },
  ],
});
```

The parent only starts after **all** children finish. The parent can read the children's results.

Say it simply: **"Flows are parent and child jobs. The parent waits for its children."**

---

## 13. Scaling — how to make it faster

Ask one question first: **is the job waiting, or is it thinking?**

| Job type | Example | How to scale |
|---|---|---|
| **Waiting (I/O)** | Calling an API, reading the DB | Raise `concurrency`. One process can handle many. |
| **Thinking (CPU)** | Image resize, PDF build, big loop | More worker **processes** (or containers). Concurrency will not help. |

Other levers:

- **More worker containers** — they all read the same Redis queue. Nothing to configure.
- **Separate queues per job type** — so a slow AI job cannot block a fast email job. ⭐ Good answer.
- **`limiter`** — to stay inside a third-party rate limit.

> 💬 "The queue is the buffer. If 500 interviews arrive at once, that becomes queue depth, not 500
> concurrent calls to the AI provider. I scale workers based on how fast the depth is growing."

---

## 14. Real problems and their fixes

| Problem | Why it happens | Fix |
|---|---|---|
| **Jobs disappear** | Redis eviction policy is `allkeys-lru` — Redis deleted job keys to free memory | Set **`noeviction`** on the queue's Redis. Best: a **separate Redis** for queues and cache. |
| **Connection errors on start** | BullMQ needs a specific ioredis setting | `maxRetriesPerRequest: null` |
| **Redis memory keeps growing** | Completed jobs are kept forever | Always set `removeOnComplete` and `removeOnFail` |
| **Jobs randomly re-run** | Worker blocked the event loop, so the lock expired | Do not block the loop; raise `lockDuration` for long jobs |
| **Same email sent twice** | Not idempotent | §7 |
| **Worker uses the wrong tenant's data** | The worker has no HTTP request, so no tenant context | ⭐ Read `tenantId` from `job.data` and re-bind context inside the handler |
| **Jobs run but nothing happens** | Worker is listening to a different queue name, or a different Redis DB | Queue name and connection must match exactly |

⭐ The tenant one is *your* story. Very few candidates mention it. Say it.

---

## 15. Code reference (copy this shape)

```ts
// queue.ts — used by the API
import { Queue } from 'bullmq';
export const evaluationQueue = new Queue('evaluation', { connection });

// controller.ts — the API stays fast
@Post(':id/evaluate')
async evaluate(@Param('id') id: string, @TenantId() tenantId: string) {
  await evaluationQueue.add('evaluate-interview', { id, tenantId }, {
    jobId: `eval:${id}`,
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
  return { status: 'queued' };        // 202 — the user is not waiting
}

// worker.ts — a SEPARATE process
new Worker('evaluation', async (job) => {
  const { id, tenantId } = job.data;
  return als.run({ tenantId, prisma: clientFor(tenantId) }, async () => {
    await evaluate(id);               // safe to run twice
  });
}, { connection, concurrency: 5, limiter: { max: 10, duration: 1000 } });

// shutdown — finish the current job before dying
process.on('SIGTERM', async () => { await worker.close(); process.exit(0); });
```

⭐ That last line is **graceful shutdown**. On deploy, the container gets SIGTERM.
`worker.close()` means: stop taking new jobs, finish the current one, then exit.
Without it, every deploy creates stalled jobs. Mentioning this sounds very experienced.

---

## 16. How it maps to YOUR projects

| Project | Queue | The sentence to say |
|---|---|---|
| **Interview AI** | Evaluation, report generation, prep guides, summaries, indexing, email | "The API returns 202 in 200 ms; the LLM work takes 40 seconds in a worker" |
| **Interview AI** | LLM calls | "Worker concurrency plus a limiter, and backoff with jitter on 429s" |
| **Clinic Cloud** | WhatsApp messages | "Retries with backoff, because the provider fails sometimes" |
| **Clinic Cloud** | Appointment reminders | "Delayed jobs — a Redis sorted set with the due time as the score" |
| **Clinic Cloud** | Daily reports | "Repeatable job, so it runs once even with three servers" |
| **B2C CRM** | Call recording upload | "Same retry idea, but on the phone — an offline queue with backoff" |
| **Payments** | Webhook handling | "Append-only and idempotent — the provider's event ID has a unique constraint" |
| **All of them** | Multi-tenancy | "Every worker re-binds tenant context from the job payload before touching the DB" |

---

## 17. Model answers (say these out loud)

**Q: Why use a queue instead of just awaiting the work?**
> "Five reasons.
> One, speed — the user gets an answer in 200 ms instead of waiting 40 seconds.
> Two, safety — if the server restarts, the job is still in Redis, so the work is not lost.
> Three, retries — a failed job retries by itself with a delay.
> Four, load — a spike of 500 requests becomes queue depth, not 500 parallel AI calls.
> Five, isolation — a slow AI call cannot slow down my API."

**Q: A job fails halfway. What happens?**
> "It retries with exponential backoff, up to the attempt limit. After that it sits in the failed
> list with the error, and I can inspect it and retry it. Because the handler is idempotent, the
> part that already finished does not happen twice. Anything that must be all-or-nothing is inside
> one database transaction."

**Q: What is idempotency?** → §7. Give the "set status to paid" vs "add ₹500" example. It lands well.

**Q: What if a worker crashes mid-job?** → §9. Stalled → another worker picks it up → so handlers
must be idempotent.

**Q: How do you avoid hitting a third-party rate limit?**
> "Worker concurrency plus BullMQ's limiter — for example ten jobs per second. And exponential
> backoff with jitter on a 429, so all the retries do not come back at the same moment."

**Q: How do you make sure a daily job runs only once with 3 servers?**
> "A BullMQ repeatable job. The schedule lives in Redis, not on each server, so it is added once
> and only one worker picks it up. A plain server cron would fire three times."

**Q: How do you monitor queues?** → §11: queue depth, failed count, job duration. Plus bull-board
behind admin auth.

**Q: BullMQ vs Kafka vs SQS?**
> "BullMQ is a job queue — retries, delays, schedules, and it uses the Redis I already run. Kafka is
> an event log built for very high throughput and replay, and it is a much bigger thing to operate.
> SQS is a managed queue — great if I am on AWS and do not want to run Redis, but delays and
> scheduling are more limited. For my scale, BullMQ was the simple right answer."

---

## 18. Rapid-fire one-liners

| Word | One line |
|---|---|
| **Queue** | A list of work stored in Redis |
| **Job** | One piece of work plus its data |
| **Worker** | The process that does the job |
| **Producer** | The code that adds the job (usually your API) |
| **Concurrency** | How many jobs one worker does at the same time |
| **Attempts** | How many times to try before giving up |
| **Backoff** | Wait longer before each retry |
| **Jitter** | Add randomness so retries do not all land together |
| **Delayed job** | Runs later; stored in a sorted set by due time |
| **Repeatable job** | Runs on a schedule, once across all servers |
| **Stalled job** | The worker died or froze, so someone else takes it |
| **Failed** | Out of retries; sitting there for you to inspect |
| **DLQ** | Dead letter queue — the failed list is BullMQ's version |
| **Idempotent** | Running it twice is the same as running it once |
| **At-least-once** | A job can run more than once; plan for it |
| **Effectively once** | At-least-once + idempotent handler |
| **Flow** | Parent job that waits for its child jobs |
| **Graceful shutdown** | Finish the current job before the process exits |
| **`noeviction`** | The Redis setting that stops jobs being deleted |

---

## 19. Self-check

- [ ] Explain a queue with the restaurant example in 30 seconds
- [ ] Name the four parts: queue, job, worker, Redis
- [ ] List the job states in order
- [ ] Give 5 reasons to use a queue
- [ ] Explain exponential backoff with real numbers (2s, 4s, 8s, 16s)
- [ ] Explain which errors you retry and which you do not
- [ ] Define idempotency with a good and a bad example
- [ ] Give 3 ways to make a handler idempotent
- [ ] Explain a stalled job and what it forces you to do
- [ ] Explain why you send an ID and not a big object
- [ ] Explain why a repeatable job beats a server cron
- [ ] Say what breaks if the Redis eviction policy is wrong
- [ ] Explain graceful shutdown in one sentence

---

## 20. Traps — how people lose this round

1. **Saying "exactly-once."** Say *at-least-once + idempotent = effectively once*.
2. **Putting big objects in the payload.** Send the ID. The data may be stale by the time it runs.
3. **No `removeOnComplete`.** Redis memory grows until it falls over.
4. **`allkeys-lru` on the queue's Redis.** Jobs get silently deleted. Use `noeviction`.
5. **Retrying errors that can never succeed.** Use `UnrecoverableError` for bad input.
6. **Forgetting tenant context in the worker.** There is no HTTP request, so nothing sets it for you.
7. **Blocking the event loop in a handler.** The lock is not renewed → the job stalls and re-runs.
8. **No graceful shutdown.** Every deploy leaves half-finished jobs.
9. **Thinking `concurrency` helps CPU work.** It does not. Use more processes.
10. **Never looking at the failed list.** A DLQ nobody reads is just a place where work quietly dies.
11. **A public bull-board.** It shows job payloads — that is customer data.
12. **Using a queue for something that must be instant.** A queue adds delay by design. Login should
    not go through a queue.

---

> **Next:** [06 — Redis](06-redis.md) §3.5 (sorted sets = how delays work) and §11 (eviction), then
> pick the next topic from [README.md](README.md).
