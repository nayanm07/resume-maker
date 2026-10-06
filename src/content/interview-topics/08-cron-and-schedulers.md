# 08 — Cron Jobs & Schedulers (Complete Topic Notes)

> Easy English. Short lines. Say them out loud.
> **Time:** ~2 hours · **Pairs with:** [07 — BullMQ](07-bullmq.md) and [06 — Redis](06-redis.md)

---

## 0. The 30-second answer (memorise this)

> 💬 **"How do you run scheduled jobs?"**
>
> "A cron job is work that runs on a time schedule. Not because a user asked. Because the clock said so.
>
> Like: send reminders every morning at 9, clean old files every night, retry failed payments every hour.
>
> The problem is that I run more than one server. If I put the schedule inside the app, all three
> servers fire at 9 AM and the customer gets three emails.
>
> So I use BullMQ repeatable jobs. The schedule lives in Redis, not inside each server. It fires
> once, one worker picks it up, and I get retries and history for free."

That last paragraph is the answer they are actually testing. Everything else is detail.

---

## 1. What is a cron job? (the simple picture)

**Normal API work:** a user clicks a button → your code runs.
**Cron work:** nobody clicks anything → the clock runs your code.

Think of an alarm clock.
You set it once. It rings every day at the same time. You do not press anything.

The name "cron" comes from an old Unix program that did this. Everyone still uses the name.

**Real examples from real apps:**

| Time | Job |
|---|---|
| Every day 9:00 AM | Send appointment reminders |
| Every night 2:00 AM | Delete files older than 30 days |
| Every hour | Retry failed payments |
| Every 5 minutes | Sync data from another system |
| Every Monday | Email a weekly report |
| Every 1st of the month | Generate invoices |

---

## 2. Cron syntax — how to read it

Five numbers. Left to right: **minute, hour, day of month, month, day of week.**

```
 ┌───────────── minute        (0 - 59)
 │ ┌─────────── hour          (0 - 23)
 │ │ ┌───────── day of month  (1 - 31)
 │ │ │ ┌─────── month         (1 - 12)
 │ │ │ │ ┌───── day of week   (0 - 6, Sunday = 0)
 │ │ │ │ │
 * * * * *
```

`*` means "every".

**The patterns you should just know:**

| Pattern | Meaning |
|---|---|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour, at minute 0 |
| `0 9 * * *` | Every day at 9:00 AM |
| `30 2 * * *` | Every day at 2:30 AM |
| `0 9 * * 1` | Every Monday at 9:00 AM |
| `0 0 1 * *` | 1st of every month, midnight |
| `0 9-17 * * 1-5` | Every hour 9 AM–5 PM, Monday to Friday |

⚠️ Note: some tools (like BullMQ/node-cron) allow a **6th field at the front for seconds**.
So `*/10 * * * * *` = every 10 seconds. Check which format your library uses.

💡 **Say this if you forget the syntax:** "I always check it on crontab.guru before shipping."
That is an honest, normal answer. Nobody memorises cron syntax.

---

## 3. The 5 ways to schedule work (know the trade-offs)

| Way | What it is | Good | Bad |
|---|---|---|---|
| **System crontab** | The Linux server's own cron | Simple, no code | Runs on one machine. Dies with that machine. No retries, no logs, no history. |
| **`node-cron`** | A library inside your Node app | Very easy to add | ⚠️ Runs on **every** server you deploy. No retries. Lost on restart. |
| **`@nestjs/schedule`** | The same idea, but Nest-style decorators | Clean code, DI works | Same duplicate problem on multiple servers |
| **BullMQ repeatable job** ⭐ | Schedule stored in Redis | Runs **once** across all servers. Retries. History. Can be paused. | Needs Redis |
| **Cloud scheduler** | AWS EventBridge, Kubernetes CronJob, Vercel Cron | Fully outside the app. Very reliable. | Extra infrastructure. Usually calls an HTTP endpoint you must protect. |

**My default answer:** BullMQ repeatable jobs, because I already run Redis for queues.

---

## 4. ⭐ The big problem: three servers, three emails

This is the question they really want to hear you solve.

**What goes wrong:**

```
9:00 AM
  Server 1  →  sends the reminder
  Server 2  →  sends the reminder      ← same customer
  Server 3  →  sends the reminder      ← same customer again
```

The schedule is inside the app. You deployed 3 copies of the app. So it fires 3 times.

**Three ways to fix it. Know all three.**

**Fix 1 — Put the schedule outside the app (best).**
BullMQ keeps the schedule in Redis. Redis creates one job. Only one worker takes it.
Or a cloud scheduler calls one endpoint.

**Fix 2 — A lock, so only one server wins.**
Every server wakes at 9:00. All try to take a Redis lock. Only one gets it. The rest do nothing.

```ts
// SET key value NX PX  →  "set only if nobody has it, expire in 5 minutes"
const gotIt = await redis.set('cron:reminders:2026-09-04', '1', 'NX', 'PX', 300_000);
if (!gotIt) return;          // another server is doing it
await sendReminders();
```
(Details in [06 — Redis §7](06-redis.md).)

**Fix 3 — Make the job idempotent.**
Mark each reminder as sent in the database before sending.
Then even if it runs 3 times, the customer gets 1 email.

> 💬 **Say this:** "I move the schedule out of the app instances. But I still make the job
> idempotent, because a lock is an optimisation, not a guarantee."
>
> That sentence is a senior answer.

---

## 5. BullMQ repeatable jobs — the way I do it

```ts
// Add it ONCE, when the app starts
await queue.add(
  'daily-reminders',
  {},                                    // no payload needed
  {
    repeat: {
      pattern: '0 9 * * *',              // every day at 9:00
      tz: 'Asia/Kolkata',                // ⚠️ always set this
    },
    jobId: 'daily-reminders',            // stops duplicate schedules
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: 100,
  },
);
```

**How it works inside** (a great thing to explain, because most people cannot):

1. Redis stores the *schedule*, not a job.
2. When the time comes, BullMQ creates **one real job** in the queue.
3. It immediately schedules the **next** one.
4. One worker picks the job up. The other servers see nothing.

So it is a **delayed job that re-creates itself**.
And a delayed job is just a Redis sorted set with the run time as the score
([06 — Redis §3.5](06-redis.md)).

**What you get for free versus a plain cron:**

| | Plain cron | BullMQ repeatable |
|---|---|---|
| Runs once with 3 servers | ❌ | ✅ |
| Retry if it fails | ❌ | ✅ |
| History of past runs | ❌ | ✅ |
| Pause / resume without a deploy | ❌ | ✅ |
| See the error and the payload | ❌ | ✅ |

⚠️ **Removing a schedule:** you must remove it explicitly. Changing the pattern in code and
redeploying can leave the **old schedule still alive in Redis**, and now it fires twice.
Use `removeRepeatable` / `removeJobScheduler`, or use a fixed `jobId` and update it.
This is a very common real bug — a good one to mention.

---

## 6. NestJS scheduling (if the app is small)

```ts
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  @Cron('0 9 * * *', { name: 'reminders', timeZone: 'Asia/Kolkata' })
  async sendReminders() { /* ... */ }

  @Cron(CronExpression.EVERY_HOUR)
  async retryPayments() { /* ... */ }

  @Interval(30_000)          // every 30 seconds after startup
  async healthPing() { /* ... */ }

  @Timeout(5_000)            // once, 5 seconds after startup
  async warmCache() { /* ... */ }
}
```

Simple and clean. Use it when you run **one** instance.

⚠️ The moment you scale to two instances, this fires twice. Then add a Redis lock (§4 fix 2),
or move the schedule to BullMQ.

> 💬 **Good honest answer:** "`@nestjs/schedule` is fine for a single instance. It does not survive
> horizontal scaling on its own, so anything that must run exactly once goes through BullMQ."

---

## 7. ⚠️ Timezone — the trap that bites everyone

Servers usually run in **UTC**. Your users are in India (IST = UTC + 5:30).

`0 9 * * *` with no timezone = 9:00 **UTC** = **2:30 PM** in India.
Your "good morning" reminder arrives after lunch.

**Rules:**
1. Always set the timezone explicitly: `tz: 'Asia/Kolkata'`.
2. Store timestamps in the database in UTC. Convert only when showing them.
3. Remember daylight saving time exists in some countries. 2:30 AM can happen twice, or not at all,
   on the changeover day. Do not schedule important work at 2:00–3:00 AM in those regions.

> 💬 "The first thing I check on a scheduled job is the timezone, because the server is in UTC and
> the business is in IST."

---

## 8. What if the server was down at 9:00 AM?

The clock does not wait for you. So the run is simply **missed**.

Ask yourself one question: **does this job need to catch up?**

| Type of job | Missed run | What to do |
|---|---|---|
| "Send today's reminders" | Just send them late | Catch up — run it when you come back |
| "Health check ping" | Does not matter | Skip it |
| "Generate the invoice for March" | Must not be skipped | Catch up, and make it idempotent |

**How to catch up properly:** do not rely on the clock alone. Rely on the **data**.

```ts
// ❌ weak — depends on the job firing at exactly the right time
await sendRemindersForToday();

// ✅ strong — finds everything that was missed, whenever it runs
const due = await prisma.appointment.findMany({
  where: { remindAt: { lte: new Date() }, reminderSentAt: null },
});
```

The second version is self-healing. If the job did not run for 6 hours, the next run fixes everything.
And it can never send twice, because `reminderSentAt` is set after sending.

⭐ This is the best idea in this whole chapter. **Make the job look at the data, not at the clock.**

---

## 9. Overlap — when the job takes longer than the gap

You run a job every 5 minutes. One day it takes 8 minutes.
Now run #2 starts while run #1 is still going. Then #3. They pile up.

**Fixes:**
1. A lock with a TTL, so a second run exits immediately (§4 fix 2).
2. In BullMQ, use `concurrency: 1` on that queue so only one runs at a time.
3. Make the job smaller — process 500 rows per run instead of everything.

> 💬 "I always ask: what happens if this run takes longer than the interval? If overlapping is
> unsafe, I guard it with a lock or a concurrency limit of one."

---

## 10. Big scheduled jobs — do not load everything

A nightly job that does `findMany()` on a million rows will eat all the memory and die.

**Do it in batches:**

```ts
let cursor: string | undefined;
while (true) {
  const rows = await prisma.appointment.findMany({
    where: { remindAt: { lte: new Date() }, reminderSentAt: null },
    take: 500,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    orderBy: { id: 'asc' },
  });
  if (rows.length === 0) break;
  for (const r of rows) await reminderQueue.add('send', { id: r.id });   // ⭐ fan out
  cursor = rows[rows.length - 1].id;
}
```

⭐ **The pattern to name:** the cron job is only a **finder**. It finds the work and puts one job in
the queue per item. The queue does the actual work.

Why this is better:
- The cron job stays fast and small.
- Each item retries on its own. One bad phone number does not stop the other 999.
- You can see exactly which items failed.

> 💬 "My scheduled job does not do the work. It finds the work and enqueues it. That way one
> failure does not kill the whole batch."

---

## 11. Monitoring — how do you know it ran?

A cron job that silently stops is very dangerous. Nothing errors. Nothing alerts. Work just stops.

**Watch for the absence, not only the error.**

| Method | How it works |
|---|---|
| **Heartbeat / dead man's switch** | The job calls a URL every time it finishes. If that service does not hear from you by 9:15, it alerts. (Healthchecks.io, Cronitor) |
| **Last-run timestamp** | Write `lastRunAt` to Redis or the DB. Your health check compares it to now. |
| **Queue metrics** | Failed count, queue depth ([07 §11](07-bullmq.md)) |
| **Log start and end** | With the job name and how long it took |

> 💬 **Say this:** "I alert on the job *not* running, not only on it failing. A silent stop is worse
> than an error, because nobody notices for days."

---

## 12. How to choose — decision table

| Your situation | Use |
|---|---|
| One server, simple task | `@nestjs/schedule` or `node-cron` |
| Many servers, must run once | **BullMQ repeatable job** ⭐ |
| Needs retries and history | **BullMQ** |
| Must survive the whole app being down | Cloud scheduler (EventBridge / k8s CronJob) hitting an endpoint |
| Heavy work over many rows | Cron finds the rows → queue does each one (§10) |
| Every few seconds | An interval, not cron — cron's smallest normal step is 1 minute |

---

## 13. Real problems and their fixes

| Problem | Why | Fix |
|---|---|---|
| Email sent 3 times | Schedule lives inside 3 app instances | Move it to BullMQ, or use a lock |
| Job runs at the wrong hour | Server is UTC | Set `tz` explicitly |
| Job fires twice after a deploy | Old repeatable schedule is still in Redis | Remove the old one; use a stable `jobId` |
| Runs pile up on each other | The job is slower than the interval | Lock, or `concurrency: 1` |
| Job stopped weeks ago, nobody noticed | No monitoring | Heartbeat alert |
| Job crashes on one bad row | It does everything in one go | Fan out to the queue, one job per row |
| Out of memory at 2 AM | Loaded a million rows | Batch with a cursor |
| Nothing ran while the server was down | Cron does not catch up | Query by data state, not by time (§8) |

---

## 14. Maps to YOUR projects

| Project | Scheduled job | The sentence to say |
|---|---|---|
| **Clinic Cloud** | Appointment reminders | "The cron finds due appointments and enqueues one WhatsApp job per patient, so one failure does not stop the batch" |
| **Clinic Cloud** | Daily / weekly reports | "A BullMQ repeatable job — it runs once even though the API runs on multiple instances" |
| **Interview AI** | Cleanup of old files and finished jobs | "`removeOnComplete` plus a nightly clean, so Redis memory stays flat" |
| **Payments** | Retry pending payments hourly | "It reads the payments still in `pending`, so it is self-healing if a run is missed" |
| **Any** | Anti-duplicate | "The schedule is outside the app instances, and the job is still idempotent" |

---

## 15. Model answers (say these out loud)

**Q: How do you run scheduled tasks in Node?** → §0, then §3's table.

**Q: You have 3 servers. How do you stop the job running 3 times?** ⭐ → §4, all three fixes, in
order: move the schedule out, lock, idempotent.

**Q: The server was down when the job should have run. What happens?**
> "The run is missed — cron does not catch up by itself. So I write the job to look at the data,
> not the clock. It asks for everything due and not yet done. Whenever it next runs, it fixes the
> gap by itself."

**Q: Your job takes longer than the interval. What now?**
> "The runs overlap. I guard it with a Redis lock with a TTL, or a queue concurrency of one. And I
> make the job smaller — a fixed batch size per run."

**Q: How do you know the job actually ran?**
> "A heartbeat. The job pings a monitoring service when it finishes. If that ping does not arrive
> in time, I get alerted. I alert on the missing run, not only on the error."

**Q: Cron vs a queue — what is the difference?**
> "Cron answers *when*. The queue answers *how it gets done reliably*. I use them together — cron
> triggers, the queue executes, with retries."

**Q: How would you schedule one reminder 24 hours from now?**
> "That is not cron, that is a delayed job. `queue.add(data, { delay: 86400000 })`. BullMQ stores it
> in a Redis sorted set with the run time as the score."

**Q: How do you handle timezones?** → §7.

---

## 16. Rapid-fire one-liners

| Word | One line |
|---|---|
| **Cron job** | Work that runs on a clock, not on a user request |
| **Cron expression** | 5 fields: minute, hour, day, month, weekday |
| **`0 9 * * *`** | Every day at 9 AM |
| **`*/5 * * * *`** | Every 5 minutes |
| **Repeatable job** | BullMQ's cron — the schedule lives in Redis |
| **Delayed job** | Run once, later — not a repeating schedule |
| **Distributed cron problem** | Many servers → the job fires many times |
| **Leader lock** | One server wins the lock and does the job |
| **Idempotent** | Running twice is the same as running once |
| **Catch-up / misfire** | What you do about a run that was missed |
| **Overlap** | The next run starts before this one ends |
| **Fan out** | Cron finds the items, the queue processes each one |
| **Heartbeat / dead man's switch** | Alert me if the job did *not* run |
| **UTC vs IST** | Servers are UTC; always set the timezone |
| **Batching** | Process N rows per run, not everything |

---

## 17. Self-check

- [ ] Explain a cron job in one sentence, without jargon
- [ ] Read `0 9 * * 1` out loud correctly
- [ ] Name the 5 ways to schedule work, with one downside each
- [ ] Explain the 3-servers-3-emails problem and 3 fixes
- [ ] Explain how a BullMQ repeatable job works inside
- [ ] Explain why you query by data state and not by the clock
- [ ] Explain the overlap problem and 2 fixes
- [ ] Explain the fan-out pattern (cron finds, queue does)
- [ ] Explain how you would know the job stopped running
- [ ] Say the timezone trap in one sentence
- [ ] Say the difference between a delayed job and a repeatable job

---

## 18. Traps — how people lose this round

1. **Putting the schedule inside the app and forgetting you run 3 copies.** The #1 mistake.
2. **No timezone.** 9 AM UTC is 2:30 PM in India.
3. **Assuming a missed run comes back.** It does not. Query the data instead.
4. **Doing the whole batch inside the cron job.** One bad row kills all of it. Fan out.
5. **Loading a million rows at 2 AM.** Batch it.
6. **No overlap guard** on a job that got slower over time.
7. **Old repeatable schedules left in Redis** after you change the pattern → it fires twice.
8. **No monitoring.** A cron that silently stops is invisible for weeks.
9. **Using cron for "every 10 seconds".** That is an interval or a queue, not cron.
10. **Using cron for something a user is waiting on.** Cron is background work by definition.
11. **Saying "the lock guarantees it runs once".** It reduces the chance. Idempotency is the real
    guarantee.

---

> **Next:** [07 — BullMQ](07-bullmq.md) for retries and idempotency in depth, and
> [06 — Redis §7](06-redis.md) for how the lock is actually written.
