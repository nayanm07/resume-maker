# 04 — Node.js & NestJS

> Easy English. Short lines. Say them out loud.
> **Time:** ~6 hours · **Pairs with:** [10 — Multi-Tenant](10-multi-tenant-saas.md) (AsyncLocalStorage),
> [07 — BullMQ](07-bullmq.md), [12 — API Design](12-api-design.md), [16 — Testing](16-testing-quality.md)
> ⭐ This is your **main stack**. Most backend interviews start here, and the event loop is the most
> asked question of all.

---

## How this file is organised — basic → advanced

**Every topic:** explanation → deeper detail → **interview questions** → **scenarios**.

| Level | Topics | Time | You can answer… |
|---|---|---|---|
| **1. Node basics** | 1 What Node is · 2 Modules & npm · 3 Core modules | 45 min | "Why is Node single-threaded?" |
| **2. Async & the event loop** | 4 **Event loop** · 5 Callbacks → promises → async/await · 6 Streams · 7 CPU work, threads, cluster | 1.5 h | "What prints first? How do you handle CPU-heavy work?" |
| **3. HTTP servers** | 8 http & Express · 9 Middleware, errors, security | 1 h | "How does Express middleware work?" |
| **4. NestJS** | 10 Architecture · 11 DI · 12 **Request lifecycle** · 13 Pipes · 14 Guards · 15 Interceptors · 16 Filters · 17 Config · 18 **AsyncLocalStorage** · 19 Database | 2 h | "Guard vs interceptor vs middleware?" |
| **5. Production** | 20 Performance & scaling · 21 Memory & graceful shutdown · 22 Security | 45 min | "Your API is slow. Memory keeps growing." |
| **Wrap-up** | 23 Your projects · 24 Rapid-fire · 25 Self-check · 26 Traps | 30 min | |

**If you only have 1 hour:** §0, §4, §7, §12, §18, §20.

---

## 0. The 30-second answer (memorise this)

> 💬 **"Tell me about your backend stack."**
>
> "I build APIs in Node with NestJS and TypeScript.
>
> Node runs my JavaScript on one thread with an event loop, so it is excellent for I/O-heavy work —
> database calls, third-party APIs, sockets — but I must never block that thread with heavy CPU work.
> Anything slow goes to a queue.
>
> NestJS gives the structure: modules, dependency injection, and a clear request pipeline — middleware,
> guards, interceptors, pipes, then the controller. DTOs validate every input, guards handle
> authorisation, and one exception filter gives every error the same shape.
>
> The piece I rely on most is **AsyncLocalStorage** — it carries the tenant and request ID through the
> whole request without passing them into every function."

---
---

# LEVEL 1 — NODE BASICS

---

## 1. What is Node.js?

### The simple idea

**Node lets you run JavaScript outside the browser** — on a server.

It is made of two main parts:

| Part | What it does |
|---|---|
| **V8** | Google's engine that runs the JavaScript (the same one in Chrome) |
| **libuv** | A C library that does the I/O — files, network, timers — and owns the **event loop** |

### One thread, but not slow

**Your JavaScript runs on one thread.** There is no second thread running your code.

But Node does **not wait** for slow things. When you read a file or call a database, Node hands the
work to the operating system (through libuv), keeps serving other requests, and comes back when the
answer is ready. That is **non-blocking I/O**.

**Restaurant picture:** one waiter (your thread) takes many orders. He does not stand in the kitchen
waiting for one dish — he keeps taking orders and delivers each dish when it is ready.

⚠️ **But if the waiter starts cooking himself** (heavy CPU work — a big loop, image processing), every
other customer waits. That is **blocking the event loop** — the #1 Node mistake (§7).

### Node vs the browser

| | Browser JS | Node |
|---|---|---|
| Global object | `window` | `globalThis` / `global` |
| DOM | Yes | No |
| Files | No | `fs` |
| Modules | ESM | CommonJS **and** ESM |
| Made for | Pages | Servers, CLIs, tools |

### Interview questions

**Q: What is Node.js?**
> "A runtime that runs JavaScript on the server, using V8 to execute the code and libuv for
> non-blocking I/O and the event loop. It is single-threaded for my code, so it handles thousands of
> I/O operations efficiently, but heavy CPU work must go somewhere else."

**Q: Is Node single-threaded?**
> "My JavaScript runs on one thread, yes. But Node itself uses more: libuv has a thread pool — four by
> default — for file system work, DNS and crypto, and the OS handles network sockets. So Node is
> single-threaded for my code and multi-threaded underneath."

**Q: Why is Node good for I/O but bad for CPU work?**
> "I/O is mostly waiting, and Node does not block while waiting — it serves other requests. CPU work
> actually occupies the one thread, so every other request is stuck behind it."

---

## 2. Modules and npm

### CommonJS vs ES Modules

```js
// CommonJS (older, default in .js files)
const express = require('express');
module.exports = { createApp };

// ES Modules (modern, standard)
import express from 'express';
export { createApp };
```

To use ESM: set `"type": "module"` in `package.json`, or use the `.mjs` extension. TypeScript compiles
to whichever you configure.

| | CommonJS | ESM |
|---|---|---|
| Loading | **Synchronous** | Asynchronous |
| When resolved | At runtime — `require` inside an `if` works | At parse time (imports are hoisted) |
| `__dirname` | Available | ❌ Use `import.meta.url` |
| Top-level `await` | ❌ No | ✅ Yes |

### package.json — the parts to know

```json
{
  "name": "clinic-api",
  "type": "module",
  "scripts": { "dev": "nest start --watch", "build": "nest build", "start:prod": "node dist/main.js" },
  "dependencies":    { "@nestjs/common": "^10.0.0" },
  "devDependencies": { "typescript": "^5.4.0" }
}
```

| Thing | Meaning |
|---|---|
| **dependencies** | Needed to run in production |
| **devDependencies** | Only for development — TypeScript, Jest, ESLint |
| **`^1.2.3`** | Allows 1.x.x updates (minor + patch) |
| **`~1.2.3`** | Allows 1.2.x updates (patch only) |
| **package-lock.json** | The exact versions installed — ⭐ **always commit it** |
| **`npm ci`** | Installs exactly the lock file — use it in CI and Docker |

### Interview questions

**Q: CommonJS vs ESM?** → the table. Add: "CommonJS loads synchronously and is resolved at runtime; ESM
is the standard, supports top-level await, and is statically analysable, which helps tree-shaking."

**Q: `npm install` vs `npm ci`?**
> "`npm install` can update the lock file and resolve new versions. `npm ci` deletes `node_modules` and
> installs exactly what the lock file says — repeatable, so it is what I use in CI and Docker builds."

**Q: dependencies vs devDependencies?** → the table. "It also keeps the production image small."

---

## 3. Core modules you actually use

```js
import fs from 'node:fs/promises';           // promise version — no callbacks
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';

const data = await fs.readFile(path.join(process.cwd(), 'config.json'), 'utf8');
const id = crypto.randomUUID();
const cpus = os.cpus().length;               // how many workers to start (§20)
```

| Module | Use |
|---|---|
| `fs` / `fs/promises` | Read and write files |
| `path` | Build file paths that work on Windows and Linux |
| `http` / `https` | The server underneath Express and Nest |
| `crypto` | UUIDs, hashes, HMAC signatures (webhooks) |
| `os` | CPU count, memory |
| `process` | `process.env`, `process.argv`, signals, `process.exit()` |
| `events` | `EventEmitter` — the base of streams and much of Node |
| `worker_threads` / `cluster` | Real parallelism (§7) |

**Environment variables**
```js
const port = Number(process.env.PORT) || 3000;
```
⭐ Validate them at startup and fail fast if something is missing (§17), rather than crashing on the
first request.

### Interview questions

**Q: How do you read a file without blocking?**
> "`fs/promises` with `await`, or the callback/stream API. Never `readFileSync` inside a request handler
> — it blocks the event loop for every user. Sync versions are fine at startup."

---
---

# LEVEL 2 — ASYNC & THE EVENT LOOP

---

## 4. ⭐ The event loop (the most asked Node question)

### The picture

```
   your code runs
        │
        ▼
 ┌─ CALL STACK ─┐   one function at a time
 └──────┬───────┘
        │ async work handed to libuv / OS
        ▼
 ┌─ when finished, the callback is queued ─┐
 │  MICROTASK queue: promises, queueMicrotask, process.nextTick   ← drained FIRST, fully
 │  MACROTASK queues (event loop phases): timers, I/O, setImmediate
 └─────────────────────────────────────────┘
```

**The rule to say:** after the current piece of code finishes, Node empties **all microtasks**, then
takes **one macrotask**, then empties microtasks again, and so on.

### The phases of one loop turn (in order)

| Phase | What runs there |
|---|---|
| **timers** | `setTimeout`, `setInterval` callbacks |
| **pending callbacks** | Some system callbacks (e.g. TCP errors) |
| **poll** | New I/O — file read finished, socket data arrived |
| **check** | `setImmediate` |
| **close** | `socket.on('close')` |

Between every phase, the **microtask** queue is drained: `process.nextTick` first, then promises.

### The question they always ask

```js
console.log('1');
setTimeout(() => console.log('2 timeout'), 0);
setImmediate(() => console.log('3 immediate'));
Promise.resolve().then(() => console.log('4 promise'));
process.nextTick(() => console.log('5 nextTick'));
console.log('6');
```
**Output:** `1`, `6`, `5 nextTick`, `4 promise`, then `2 timeout` / `3 immediate`.

**Why:**
1. Normal code first → `1`, `6`.
2. Microtasks → **`nextTick` before promises**.
3. Macrotasks → timers and immediate. ⚠️ At the top level, the order of `setTimeout(0)` vs
   `setImmediate` is **not guaranteed** (it depends on how fast the loop starts). **Inside an I/O
   callback, `setImmediate` always runs first** — a great detail to add.

### `process.nextTick` vs `setImmediate` vs `setTimeout(0)`

| | Runs |
|---|---|
| `process.nextTick` | Right after the current operation, **before** promises. Node-only. |
| `Promise.then` / `queueMicrotask` | After nextTick, still before any timer |
| `setImmediate` | In the **check** phase — after I/O |
| `setTimeout(fn, 0)` | In the **timers** phase (at least ~1 ms later) |

⚠️ **Recursive `process.nextTick` starves the event loop** — the loop never moves on. Use
`setImmediate` for "let other work run, then continue".

### Interview questions

**Q: Explain the event loop.** → the picture + the rule + the phases.

**Q: Microtask vs macrotask?**
> "Microtasks are promises, `queueMicrotask` and `process.nextTick`; macrotasks are timers, I/O
> callbacks and `setImmediate`. After every macrotask — and between phases — Node empties the **whole**
> microtask queue, so a chain of promises runs before the next timer."

**Q: `setTimeout(fn, 0)` vs `setImmediate`?** → the table + the "inside I/O, immediate wins" point.

### Scenarios

**S1. An endpoint became slow, and all other endpoints got slow at the same time.**
> "Something is blocking the event loop — a big synchronous loop, `JSON.parse` on a huge payload, sync
> crypto like `bcrypt.hashSync`, `readFileSync`, or a bad regular expression.
> I confirm it by measuring event loop lag, then find it with a profiler or `--cpu-prof`. The fix
> depends on the cause: use the async version, move the work to a worker thread or a queue, or process
> the data in chunks. One blocked request should never be able to freeze the whole server."

---

## 5. Callbacks → promises → async/await

```js
// 1. callback style (old Node)
fs.readFile('a.json', 'utf8', (err, data) => {
  if (err) return handle(err);
  ...
});

// 2. promises
fs.promises.readFile('a.json', 'utf8').then(use).catch(handle);

// 3. async/await (what you write today)
try {
  const data = await fs.promises.readFile('a.json', 'utf8');
} catch (err) {
  handle(err);
}
```

**Callback hell** = callbacks inside callbacks inside callbacks. Promises and `await` flatten it.

### Running things together

```js
// ❌ slow — one after the other
const patient = await getPatient(id);
const doctor  = await getDoctor(docId);

// ✅ fast — at the same time (they do not depend on each other)
const [patient, doctor] = await Promise.all([getPatient(id), getDoctor(docId)]);
```
More patterns (retry, timeout, concurrency limit) are in
[18 — Coding Round §K11–K13](18-coding-round/04-basic-tasks.md).

### Error handling in async code — the traps

```js
// ❌ forEach does NOT wait
items.forEach(async (i) => { await save(i); });      // finishes instantly, errors are lost

// ✅
for (const i of items) await save(i);                // one by one
await Promise.all(items.map((i) => save(i)));        // all together
```

**Process-level safety nets:**
```js
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled rejection');
  process.exit(1);                      // let the process manager restart it cleanly
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});
```
⚠️ **Do not "keep running" after an uncaught exception.** The process may be in a broken state. Log,
exit, and let Docker/PM2/ECS start a fresh one — after a **graceful shutdown** (§21).

### Interview questions

**Q: What is callback hell and how do you avoid it?** → promises and `async/await`, plus small named
functions.

**Q: What happens to an unhandled promise rejection?**
> "In modern Node it crashes the process by default. I add an `unhandledRejection` handler that logs it
> and exits cleanly, so the restart is controlled and I can see what happened."

### Scenarios

**S2. A loop that saves 500 records finishes instantly, but nothing is saved and no error appears.**
> "`forEach` with an `async` callback — it ignores the returned promises, so nothing is awaited and the
> rejections are lost. I replace it with `for...of` with `await` for sequential work, or `Promise.all`
> when they can run together. If it calls a third-party API, I add a concurrency limit so 500 calls do
> not go out at once."

---

## 6. Streams and buffers

### The simple idea

**A stream processes data piece by piece instead of all at once.**

Reading a 2 GB file with `readFile` puts 2 GB in memory → the process dies. A stream reads it in small
chunks, so memory stays flat.

```js
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

await pipeline(
  createReadStream('calls.csv'),      // read a bit
  createGzip(),                       // transform it
  createWriteStream('calls.csv.gz'),  // write it out
);
```

| Type | Example |
|---|---|
| **Readable** | File read, HTTP request, S3 download |
| **Writable** | File write, HTTP response |
| **Duplex** | A TCP socket (both ways) |
| **Transform** | Gzip, encryption, a CSV parser |

⭐ **Backpressure:** if the writer is slower than the reader, data piles up in memory. `pipe` and
`pipeline` handle this for you — they pause the reader. That is why you should use `pipeline` rather
than reading and writing by hand.

**Buffer** = raw bytes (`Buffer.from('hi')`). Files, images and network data are buffers until you
decode them to text.

### Interview questions

**Q: What is a stream and when do you use one?**
> "A way to handle data in chunks instead of loading it all into memory — big file uploads and
> downloads, CSV exports, proxying a file to S3. It keeps memory flat and starts producing output
> immediately."

**Q: What is backpressure?**
> "When the destination is slower than the source, so data would pile up in memory. Streams signal this
> and pause the source; `pipeline` wires that up correctly and also cleans up on errors."

### Scenarios

**S3. Exporting a big report crashes the server with "JavaScript heap out of memory".**
> "The code builds the whole file in memory — fetching every row and joining strings. I switch to
> streaming: query in batches with a cursor, write each chunk to the response or to S3 with `pipeline`,
> and set the download headers first. Better still, generate it in a background job and email a link,
> so a large export never ties up a request."

---

## 7. ⭐ CPU-heavy work: worker threads, cluster, child processes

**The rule:** Node is great at waiting (I/O), bad at thinking (CPU). Heavy thinking must leave the main
thread.

| Tool | What it is | Use for |
|---|---|---|
| **Worker threads** | Real threads inside the same process, sharing memory if you want | CPU work in the same service: image resize, big parsing, PDF generation |
| **Cluster / PM2** | Several **copies of the whole app**, one per CPU core, sharing a port | Using all cores for a normal API (§20) |
| **Child process** | Run another program (`ffmpeg`, a Python script) | External tools |
| **A queue (BullMQ)** ⭐ | Another service does the work | The best answer in production — retries, scaling, isolation |

```js
// worker threads — the short version
import { Worker } from 'node:worker_threads';

const result = await new Promise((resolve, reject) => {
  const worker = new Worker('./resize-worker.js', { workerData: { file } });
  worker.on('message', resolve);
  worker.on('error', reject);
});
```

> 💬 **The answer to give:** "First I ask whether it belongs in the request at all. Most heavy work goes
> to a BullMQ worker, so the API stays responsive and I get retries and rate limiting. If it must be
> in-process, a worker thread keeps the event loop free. Cluster is for using all cores, not for one
> heavy task."

### Interview questions

**Q: How do you handle CPU-heavy work in Node?** → the quote above.

**Q: Worker threads vs cluster vs child process?** → the table.

### Scenarios

**S4. PDF generation in the request handler makes the whole API freeze for 3 seconds per report.**
> "PDF rendering is CPU work on the event loop, so every other request waits. I move it to a queue: the
> API returns 202 with a job ID, a worker generates the PDF and uploads it to S3, and the user is
> notified by socket or polling. If it truly had to stay in-process, a worker thread would at least keep
> the loop free — but the queue also gives retries and scaling."

---
---

# LEVEL 3 — HTTP SERVERS

---

## 8. From `http` to Express

**Plain Node — this is all a server really is:**
```js
import http from 'node:http';

http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }
  res.writeHead(404).end();
}).listen(3000);
```
Express and Nest are built on exactly this — they add routing, middleware and structure.

**Express — the same thing, readable:**
```js
import express from 'express';
const app = express();

app.use(express.json());                       // parse JSON bodies
app.get('/patients/:id', async (req, res, next) => {
  try {
    const patient = await service.findOne(Number(req.params.id));
    if (!patient) return res.status(404).json({ message: 'Not found' });
    res.json(patient);
  } catch (err) {
    next(err);                                 // ⭐ pass errors to the error middleware
  }
});

app.listen(3000);
```

### Interview questions

**Q: What does Express add over the `http` module?**
> "Routing, middleware, body parsing, and helpers like `res.json`. Underneath it is the same `http`
> server — Express is a thin layer that makes the structure manageable."

---

## 9. Middleware, errors and security

### Middleware is a chain

```
request → [ logger ] → [ json parser ] → [ auth ] → [ route handler ] → response
                                                  ↘ next(err) → [ error middleware ]
```

Each middleware gets `(req, res, next)` and must either **respond** or call **`next()`**.

```js
// normal middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();                                   // ⚠️ forget this and the request hangs forever
});

// error middleware — FOUR arguments, and registered LAST
app.use((err, req, res, next) => {
  logger.error({ err, requestId: req.id });
  const status = err.status || 500;
  res.status(status).json({ code: err.code || 'INTERNAL', message: status === 500 ? 'Something went wrong' : err.message });
});
```

**Order matters.** Middleware runs top to bottom, so the error handler goes at the bottom, and auth goes
before the routes it protects.

⚠️ **In Express 4, errors from an `async` handler are not caught automatically** — you must call
`next(err)` (or wrap handlers in a helper). Express 5 forwards rejected promises for you. Nest handles
this for you (§16).

### Security middleware to name

| Middleware | What it does |
|---|---|
| `helmet()` | Sets safe HTTP headers |
| `cors({ origin: [...] })` | Allows only your own front-ends |
| `express-rate-limit` | Basic protection against brute force |
| `express.json({ limit: '1mb' })` | ⭐ Stops a huge body from eating memory |
| `compression()` | Gzip responses |

### Interview questions

**Q: How does Express middleware work?** → the chain picture, `next()`, and order.

**Q: How do you handle errors centrally?**
> "Routes throw or call `next(err)`. One error middleware at the bottom logs it with the request ID and
> converts it into a consistent JSON shape, never leaking stack traces. In Nest, that is an exception
> filter."

### Scenarios

**S5. Some requests hang forever and eventually time out. No error in the logs.**
> "A middleware that neither responds nor calls `next()` — often inside an `if` branch, or after an
> `await` that threw and was swallowed. I would add a timing middleware that logs when a response
> finishes, so hanging routes are visible, and check every branch of the middleware that changed most
> recently."

---
---

# LEVEL 4 — NESTJS

---

## 10. Why NestJS, and its architecture

### The simple idea

Express gives you freedom. Ten developers write ten different structures.
**Nest gives everyone the same structure**, with TypeScript and dependency injection built in.

If you know Angular, it feels identical. If you know Spring, the ideas are the same.

### The three building blocks

| Block | Job | Picture |
|---|---|---|
| **Module** | Groups a feature together | A department in a hospital |
| **Controller** | Handles HTTP — routes in, responses out | The reception desk |
| **Provider / Service** | The actual logic and data access | The doctor doing the work |

```ts
@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'reminders' })],
  controllers: [AppointmentsController],      // HTTP layer
  providers: [AppointmentsService],           // logic layer
  exports: [AppointmentsService],             // what other modules may use
})
export class AppointmentsModule {}
```

```ts
@Controller('appointments')                   // → /appointments
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}   // ⭐ injected

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);          // return the value — Nest sends the JSON
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto) { // validated by the DTO (§13)
    return this.service.create(dto);          // 201 automatically for POST
  }
}
```

⭐ **The rule to say:** "The controller only speaks HTTP. All logic lives in the service. That makes the
logic easy to test and reusable from a queue worker or a CLI, not just from HTTP."

### Interview questions

**Q: Why NestJS over plain Express?**
> "Structure and consistency. Modules, dependency injection and a clear request pipeline mean every
> feature looks the same, testing is easy because dependencies are injectable, and validation, guards
> and error handling are built in rather than assembled by hand. On a small script Express is fine; on a
> product with several developers, Nest saves the team from ten different styles."

**Q: Controller vs service vs module?** → the table, plus "controllers stay thin".

---

## 11. Dependency injection

### The idea in one line

**A class does not create what it needs — it asks for it in the constructor, and Nest supplies it.**

```ts
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,        // Nest creates and injects these
    private readonly whatsapp: WhatsAppClient,
  ) {}
}
```

**Why it matters:**
1. **Testing** — swap the real WhatsApp client for a fake in one line ([16 §7](16-testing-quality.md)).
2. **Reuse** — one database connection shared everywhere, not created per class.
3. **Loose coupling** — depend on an interface/token, change the implementation without touching callers.

### Custom providers

```ts
{ provide: 'CONFIG', useValue: { retries: 3 } }                    // a fixed value
{ provide: PaymentGateway, useClass: RazorpayGateway }             // swap the implementation
{ provide: 'REDIS', useFactory: (cfg: ConfigService) => new Redis(cfg.get('REDIS_URL')),
  inject: [ConfigService] }                                        // built at startup
```

### Provider scopes

| Scope | Meaning |
|---|---|
| **DEFAULT (singleton)** ⭐ | One instance for the whole app — almost always what you want |
| **REQUEST** | A new instance per request — useful for per-request state, but **slower** |
| **TRANSIENT** | A new instance for every class that injects it |

⚠️ **Request scope spreads:** anything that injects a request-scoped provider becomes request-scoped
too, which hurts performance. ⭐ **This is exactly why you use AsyncLocalStorage for tenant context
instead (§18)** — that sentence impresses.

### Interview questions

**Q: What is dependency injection and why does Nest use it?** → the idea + the 3 reasons.

**Q: What are provider scopes?** → the table + the "request scope spreads" warning.

**Q: How do you swap an implementation for tests?**
> "`overrideProvider(RealClient).useValue(fake)` in the testing module. Because the class asks for
> dependencies in its constructor, I never have to patch imports."

---

## 12. ⭐⭐ The request lifecycle — memorise this order

```
Request
  │
  ├─ 1. MIDDLEWARE        (raw req/res; no route info yet — logging, request ID, raw body)
  ├─ 2. GUARDS            (may I do this? → auth, roles, tenant) → throws 401/403
  ├─ 3. INTERCEPTORS      (before) — start timers, set up context
  ├─ 4. PIPES             (validate and transform the input) → 400/422 on bad data
  ├─ 5. CONTROLLER → SERVICE      (your code)
  ├─ 6. INTERCEPTORS      (after) — wrap the response, log the duration
  └─ 7. EXCEPTION FILTERS (only if something threw) → one error shape
Response
```

**Memory hook:** **M–G–I–P → handler → I → F.**
"**M**iddle **G**uards **I**ntercept **P**ipes … handler … **I**ntercept **F**ilter."

### Guard vs interceptor vs middleware — the classic question

| | Runs | Knows the route? | Use for |
|---|---|---|---|
| **Middleware** | First | ❌ No | Request ID, logging, raw body, CORS, helmet |
| **Guard** | After middleware | ✅ Yes (and the decorators) | Auth, roles, permissions, tenant check |
| **Interceptor** | Around the handler | ✅ Yes | Timing, response shaping, caching, timeouts |
| **Pipe** | Just before the handler | ✅ Yes | Validation and transformation of parameters |
| **Filter** | Only on an error | ✅ Yes | Turning exceptions into HTTP responses |

⭐ **One-line answer:** "A guard decides **yes or no**. An interceptor wraps the call — it can change
what goes in and what comes out. Middleware is Express-level and runs before either. Pipes validate the
input. Filters handle the errors."

### Interview questions

**Q: Explain the NestJS request lifecycle.** → the 7 steps, in order.

**Q: Guard vs interceptor vs middleware?** → the table and the one-line answer.

**Q: Where would you put a "log every request with its duration"?**
> "An interceptor, because it runs around the handler and can measure both sides. I set the request ID
> in middleware, because that must exist before anything else runs."

---

## 13. Pipes and validation

```ts
export class CreateAppointmentDto {
  @IsInt() @IsPositive()
  doctorId: number;

  @IsDateString()
  startsAt: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}
```
```ts
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // ⭐ remove fields not in the DTO
  forbidNonWhitelisted: true,   // ⭐ or reject the request outright
  transform: true,              // turn plain JSON into the DTO class, strings into numbers
}));
```

**What this gives you:**
- Bad input → **400** automatically, with a list of what is wrong. You write no validation code.
- `whitelist` blocks **mass assignment** — a client sending `"role": "admin"` cannot reach your service.
- Built-in pipes: `ParseIntPipe`, `ParseUUIDPipe`, `ParseBoolPipe`, `DefaultValuePipe`.

**Custom pipe** (rare, but good to know):
```ts
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: any) {
    return typeof value === 'string' ? value.trim() : value;
  }
}
```

### Interview questions

**Q: How do you validate input in Nest?** → DTO + `class-validator` + global `ValidationPipe`, and the
`whitelist` point.

**Q: Why separate DTOs for input and output?**
> "The input DTO controls exactly what a client may send. A separate response type controls what leaves —
> so adding an internal column to the database never accidentally exposes it."

### Scenarios

**S6. A user made themselves an admin by adding `"role": "admin"` to the signup request.**
> "Mass assignment. The service spread the whole body into the database create call, and the DTO had no
> `role` field but nothing removed it. Fix: `ValidationPipe` with `whitelist: true` so unknown fields are
> stripped — `forbidNonWhitelisted` to reject them loudly — and the service takes only the fields it
> needs, never the raw body. Then I check whether anyone actually used it, because that decides whether
> it is an incident."

---

## 14. Guards and custom decorators

```ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    try {
      req.user = await this.jwt.verifyAsync(token);      // { sub, tenantId, roles }
      return true;                                        // ✅ allowed
    } catch {
      throw new UnauthorizedException();                  // → 401
    }
  }
}
```

**Roles guard + metadata:**
```ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>('roles', [ctx.getHandler(), ctx.getClass()]);
    if (!required) return false;                          // ⭐ default deny
    const { user } = ctx.switchToHttp().getRequest();
    return required.some((r) => user.roles.includes(r));
  }
}

@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

**Custom parameter decorator** — cleaner controllers:
```ts
export const CurrentUser = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest().user;
  return data ? user?.[data] : user;
});

@Get('me')
me(@CurrentUser() user: TokenUser) { return user; }
@Get('mine')
mine(@CurrentUser('tenantId') tenantId: string) { ... }
```

⭐ Apply the auth guard **globally** (`APP_GUARD`) and mark the few open routes with a `@Public()`
decorator — then a new endpoint is protected by default, instead of forgotten.

### Interview questions

**Q: How do you implement authentication and roles in Nest?** → guard code + global guard + `@Public()`.

**Q: Why is default deny important?**
> "Because the failure mode is safe. If a developer forgets the decorator, the endpoint is blocked, not
> open. Security should not depend on remembering."

---

## 15. Interceptors

**An interceptor wraps the handler** — it sees the request going in and the response coming out.

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    const start = Date.now();
    return next.handle().pipe(
      tap(() => logger.info({
        method: req.method, url: req.url, ms: Date.now() - start, requestId: req.id,
      })),
    );
  }
}
```

**Common uses:**

| Interceptor | Does |
|---|---|
| **Logging** | Method, URL, duration, request ID |
| **Transform** | Wrap every response in `{ data, meta }` |
| **Timeout** | `timeout(5000)` — fail slow requests instead of hanging |
| **Cache** | Return a cached response for GETs |
| **Serialize** | `ClassSerializerInterceptor` — hide fields marked `@Exclude()` (like a password hash) |
| **Errors** | Map a database error to a domain error |

### Interview questions

**Q: What is an interceptor good for?** → the table. "It is the only place that sees both the request
and the response, so timing, shaping and caching belong there."

---

## 16. Exception filters — one error shape

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : 500;

    if (status >= 500) logger.error({ err: exception, requestId: req.id });

    res.status(status).json({
      code: isHttp ? (exception.getResponse() as any).code ?? exception.name : 'INTERNAL_ERROR',
      message: status >= 500 ? 'Something went wrong' : (exception as HttpException).message,
      requestId: req.id,                       // ⭐ ties the user's error to your logs
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Built-in exceptions** map to status codes automatically:
`BadRequestException` 400 · `UnauthorizedException` 401 · `ForbiddenException` 403 ·
`NotFoundException` 404 · `ConflictException` 409 · `UnprocessableEntityException` 422 ·
`InternalServerErrorException` 500.

⭐ **Say:** "Services throw meaningful exceptions — `NotFoundException`, `ConflictException` — and never
touch the response object. One global filter turns them into the same JSON shape with a request ID, and
500s never leak a stack trace." ([12 §5](12-api-design.md))

### Interview questions

**Q: How do you handle errors in Nest?** → the quote above.

**Q: Where do you convert a Prisma unique-constraint error into a 409?**
> "In the service, catching `P2002` and throwing `ConflictException` — or in a Prisma-specific exception
> filter if it happens in many places. The point is that the HTTP layer never sees a raw database error."

---

## 17. Configuration

```ts
// env.validation.ts
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    validate: (env) => schema.parse(env),      // ⭐ fail at startup, not on the first request
  })],
})
export class AppModule {}
```

**Rules to say:** config comes from environment variables, is **validated at startup**, is injected
through `ConfigService` (never `process.env` scattered around the code), and secrets never sit in the
repository or the Docker image ([14 §9](14-cloud-devops.md)).

### Scenarios

**S7. A deploy went out with a missing environment variable, and the app only broke when the first user hit payments.**
> "Config was read lazily with `process.env`, so nothing checked it at startup. With a validated schema,
> the app refuses to start and the deploy fails immediately — much better than a broken payment hours
> later. I would also add the variable to `.env.example` and to the deployment checklist."

---

## 18. ⭐⭐ AsyncLocalStorage — your signature backend answer

### The problem

The guard knows the tenant. The repository, five layers deep, needs it.
Passing `tenantId` through every function is ugly, and one forgotten parameter is a **data leak**.
A global variable cannot work — Node serves many requests at the same time and they would overwrite
each other.

### The idea

**AsyncLocalStorage is a box attached to this request.** Anything inside the request can open the box.
Two requests never see each other's box, even though they share one thread.

```ts
// als.ts
import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = { tenantId: string; requestId: string; prisma: PrismaClient };
export const als = new AsyncLocalStorage<RequestContext>();
export const ctx = () => {
  const store = als.getStore();
  if (!store) throw new Error('No request context — did you forget to bind it?');   // ⭐ fail loudly
  return store;
};
```
```ts
// tenant.interceptor.ts — runs after the auth guard, so req.user exists
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(execCtx: ExecutionContext, next: CallHandler) {
    const req = execCtx.switchToHttp().getRequest();
    const store = {
      tenantId: req.user.tenantId,            // ⭐ from the verified token, never the body
      requestId: req.id,
      prisma: this.pool.clientFor(req.user.tenantId),
    };
    return new Observable((subscriber) => {
      als.run(store, () => next.handle().subscribe(subscriber));
    });
  }
}
```
```ts
// anywhere deep in the code — no parameter passing
async function findAppointments(date: Date) {
  const { prisma } = ctx();
  return prisma.appointment.findMany({ where: { date } });   // already tenant-scoped
}
```

### The three pitfalls to mention (this is what shows real usage)

1. **Background jobs have no request** → the store is empty. The tenant must travel in the job payload
   and be re-bound inside the worker ([07 — BullMQ](07-bullmq.md), [10 §4](10-multi-tenant-saas.md)).
2. **Anything outside `als.run`** — an event emitter callback registered earlier, a `setInterval`
   started at boot — will not see the store. Bind explicitly there.
3. **It costs a little performance** (async hooks), and debugging "why is the store empty" is confusing.
   That is why `ctx()` throws a clear error instead of silently returning `undefined`.

⭐ **Also use it for the request ID**, so every log line — including logs from deep inside services and
from the database layer — can be tied to one request without passing a logger around.

> 💬 **The sentence:** "The tenant comes from the verified token in a guard, goes into AsyncLocalStorage,
> and the data layer reads it automatically. Nothing deeper takes a `tenantId` parameter, so a developer
> cannot forget it. In Python the same thing is `contextvars`."

### Interview questions

**Q: What is AsyncLocalStorage and why did you need it?** → the problem, the box, the tenant example.

**Q: Why not a request-scoped provider in Nest?**
> "Request scope spreads — every provider that injects it becomes request-scoped too, which creates a new
> object graph per request and slows things down. AsyncLocalStorage gives me per-request data with
> singleton services."

### Scenarios

**S8. A background worker saved a report into the wrong tenant's database.**
> "The worker ran with an empty context — there is no request — or it reused a client from a previous
> job. The tenant ID must travel in the job payload, and the handler must open the context with
> `als.run` before any database access. I also make the context getter throw when the store is missing,
> so this fails loudly in development instead of silently writing to a default client."

---

## 19. The database layer (Prisma in Nest)

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }     // ⭐ clean shutdown
}
```

**Things worth saying:**

| Topic | The answer |
|---|---|
| **N+1 queries** | Use `include`/`select` instead of a query inside a loop ([03 — SQL T10](18-coding-round/03-sql.md)) |
| **Transactions** | `prisma.$transaction(async (tx) => { … })` — all or nothing |
| **Race conditions** | A conditional update or a unique constraint decides the winner, not application code |
| **Connection pool** | `?connection_limit=` — pool size × number of instances must stay under the database limit |
| **Migrations** | `prisma migrate deploy` runs **before** the new code, and stays backward compatible ([14 §13](14-cloud-devops.md)) |
| **Select only what you need** | `select` beats returning every column — and it stops internal fields leaking |

### Lifecycle hooks (they sometimes ask)

`onModuleInit` → `onApplicationBootstrap` → *(running)* → `onModuleDestroy` →
`beforeApplicationShutdown` → `onApplicationShutdown`.
Use them to connect and, more importantly, to **close things cleanly** (§21).

---
---

# LEVEL 5 — PRODUCTION NODE

---

## 20. Performance and scaling

### Use all the CPU cores

One Node process uses **one core**. A 4-core server running one process wastes 75% of the machine.

| Option | Note |
|---|---|
| **PM2 cluster mode** | `pm2 start dist/main.js -i max` — simple, restarts on crash |
| **Node `cluster`** | The same idea, written by hand |
| **Docker / ECS / Kubernetes** ⭐ | One process per container, scale containers — the modern answer |

⚠️ Each process has its **own memory** — so an in-memory cache, rate-limit counter or socket list is
**not shared**. Shared state goes in Redis ([06 — Redis](06-redis.md), [09 §5](09-realtime-websockets.md)).

### The usual speed wins, in order

1. **Fix the database** — indexes, N+1, `select` fewer columns. This is 80% of real problems.
2. **Cache** hot reads in Redis with a TTL.
3. **Do less in the request** — move slow work to a queue, return 202.
4. **Run independent calls together** with `Promise.all`.
5. **Compression and keep-alive** for external HTTP calls (reuse connections).
6. **Then** add more processes or instances.

### Interview questions

**Q: How do you scale a Node app?**
> "Vertically first — fix queries and add caching, because most 'scaling' problems are one slow query.
> Then horizontally: the app is stateless, so I run several processes or containers behind a load
> balancer, with sessions in Redis and slow work in queues. Anything in process memory has to move to
> Redis first."

**Q: What is the first thing you check when an endpoint is slow?**
> "Whether it is the database or the event loop. A trace or a timing log tells me which. Database →
> `EXPLAIN` and indexes. Event loop → something synchronous is blocking it."

### Scenarios

**S9. Response times are fine on one instance but terrible after scaling to four.**
> "Something that was in memory is now split four ways — an in-process cache with a low hit rate, a
> rate limiter counting per process, or sticky sockets. Or the database is now the bottleneck, because
> four instances opened four pools and are exhausting connections.
> I check database connections and cache hit rate first, move shared state to Redis, and add a
> connection pooler if needed."

---

## 21. Memory, leaks and graceful shutdown

### Memory leaks in Node — the usual causes

| Cause | Example |
|---|---|
| **A cache that never shrinks** | `const cache = new Map()` with no size limit or TTL |
| **Listeners added per request** | `emitter.on(...)` inside a handler — add once, or remove it |
| **Timers never cleared** | `setInterval` without `clearInterval` |
| **Closures holding big objects** | A callback keeping a whole request body alive |
| **Global arrays** | `logs.push(...)` forever |

**How to find one:** watch memory over time (RSS and heap used); take **heap snapshots** at two times
and compare what grew (Chrome DevTools with `--inspect`, or `clinic.js` / `heapdump`). Look for one
class or array that keeps growing.

### ⭐ Graceful shutdown (deploys depend on it)

```ts
// main.ts
app.enableShutdownHooks();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM — shutting down');
  await app.close();        // stop accepting new requests, run onModuleDestroy hooks
  process.exit(0);
});
```

**What `app.close()` should end up doing:**
1. Stop accepting **new** requests (the load balancer sees the health check fail).
2. Finish the requests **in flight**.
3. Tell BullMQ workers to stop taking jobs and finish the current one.
4. Close database and Redis connections.
5. Exit. If it takes too long, the platform kills it — so keep a timeout.

⚠️ Without this, every deploy drops live requests and leaves half-finished jobs
([14 §13](14-cloud-devops.md), [07 §15](07-bullmq.md)).

### Interview questions

**Q: How do you find a memory leak?** → the causes table + heap snapshots + "compare two snapshots".

**Q: What is graceful shutdown and why does it matter?** → the 5 steps. "Otherwise every deploy loses
in-flight requests and creates stalled jobs."

### Scenarios

**S10. Memory grows all day and the container restarts every night.**
> "That pattern is a leak, not normal load. I take heap snapshots a few hours apart and compare the
> biggest growing object. The usual suspects are an unbounded cache, listeners added per request, or a
> timer that is never cleared. Short term, I cap the cache with an LRU and a TTL and set a memory limit
> so restarts are controlled; then I fix the actual growth."

---

## 22. Security in Node — the quick list

| Risk | Fix |
|---|---|
| Unvalidated input | DTO + `ValidationPipe` with `whitelist` |
| SQL injection | Prisma / parameterised queries — never string concatenation |
| Secrets in code | Environment variables, validated at startup; `.env` never committed |
| Huge request bodies | Body size limit |
| Brute force | Rate limit per IP **and** per account |
| Vulnerable packages | `npm audit`, Dependabot, pin versions, `npm ci` |
| Leaky errors | One exception filter; never return stack traces |
| Missing headers | `helmet` |
| Running as root in Docker | `USER node` |
| Logging sensitive data | Redact `authorization`, `password`, `otp` |

Full detail is in [11 — Auth & Security](11-auth-and-security.md).

---
---

# WRAP-UP

---

## 23. Maps to YOUR projects

| Area | What you did | The sentence to say |
|---|---|---|
| **NestJS APIs** | Clinic Cloud, Interview AI, the partner API | "Modules per feature, thin controllers, logic in services, DTO validation at the edge" |
| **AsyncLocalStorage** | Tenant + request ID context | "The tenant comes from the verified token and is bound per request; the data layer applies it automatically" |
| **Guards** | JWT, roles, tenant membership, API keys | "Global auth guard with an explicit `@Public()` decorator, so new routes are protected by default" |
| **Interceptors** | Logging with duration and request ID | "The request ID is in every log line, so support can trace one complaint end to end" |
| **Exception filters** | One error shape across 56 endpoints | "Machine-readable code, request ID, and no stack traces in production" |
| **Queues** | BullMQ workers for AI, WhatsApp, reports | "The API returns 202; slow work never blocks the event loop" |
| **Event loop discipline** | LLM and PDF work moved out of requests | "Node is great at waiting and bad at thinking — heavy work goes to workers" |
| **Graceful shutdown** | Deploys without dropped requests | "SIGTERM closes the server and lets in-flight jobs finish" |

---

## 24. Rapid-fire

### Node
| Word | One line |
|---|---|
| **V8 / libuv** | Runs the JavaScript / does the I/O and the event loop |
| **Non-blocking I/O** | Node does not wait; it serves other work and comes back |
| **Event loop** | The cycle that runs queued callbacks phase by phase |
| **Microtask** | Promises and `nextTick` — drained fully before the next macrotask |
| **Macrotask** | Timers, I/O callbacks, `setImmediate` |
| **`process.nextTick`** | Runs before promises; recursion starves the loop |
| **Blocking the loop** | Sync CPU work freezing all requests |
| **Worker threads** | Real threads for CPU work in the same process |
| **Cluster / PM2** | Several copies of the app, one per core |
| **Stream** | Data in chunks; keeps memory flat |
| **Backpressure** | Slow the reader when the writer cannot keep up |
| **Buffer** | Raw bytes |
| **EventEmitter** | `on` / `emit` — the base of streams |
| **`unhandledRejection`** | Log and exit; do not limp on |
| **CommonJS vs ESM** | `require` vs `import`; sync vs static |
| **`npm ci`** | Exact install from the lock file |
| **Graceful shutdown** | Finish in-flight work on SIGTERM, then exit |

### NestJS
| Word | One line |
|---|---|
| **Module** | Groups a feature; declares what it needs and exports |
| **Controller** | HTTP only — routes in, responses out |
| **Provider / service** | The logic, injected where needed |
| **DI** | Ask for dependencies in the constructor; Nest supplies them |
| **Singleton scope** | One instance app-wide (the default) |
| **Request scope** | One per request — and it spreads, so use it rarely |
| **Lifecycle** | Middleware → guards → interceptors → pipes → handler → interceptors → filters |
| **Guard** | Yes or no — auth and roles |
| **Interceptor** | Wraps the handler — timing, shaping, caching, timeouts |
| **Pipe** | Validates and transforms input |
| **Exception filter** | Turns errors into one JSON shape |
| **DTO** | The validated shape of the input |
| **`whitelist: true`** | Strips fields not in the DTO (mass assignment) |
| **`APP_GUARD`** | Register a guard globally — default deny |
| **Reflector** | Reads decorator metadata inside a guard |
| **`@Public()`** | Marks the few open routes |
| **AsyncLocalStorage** | Per-request store for tenant and request ID |
| **`enableShutdownHooks`** | Runs destroy hooks on SIGTERM |

---

## 25. Self-check

**Node**
- [ ] Explain Node in 30 seconds — V8, libuv, one thread, non-blocking I/O
- [ ] Draw the event loop and say the phase order
- [ ] Predict the output of the `setTimeout` / `setImmediate` / `nextTick` / promise question
- [ ] Explain microtask vs macrotask
- [ ] Say 3 ways to handle CPU-heavy work, and which you would actually pick
- [ ] Explain streams and backpressure, with a real use
- [ ] Say why `forEach(async …)` is a bug
- [ ] Explain graceful shutdown in 5 steps
- [ ] Name 5 causes of memory leaks and how you would find one

**NestJS**
- [ ] Explain module / controller / service and why controllers stay thin
- [ ] Explain DI, and the trap with request scope
- [ ] Recite the request lifecycle in order
- [ ] Guard vs interceptor vs middleware vs pipe — one line each
- [ ] Write a JWT guard and a roles guard from memory
- [ ] Explain `ValidationPipe` with `whitelist` and why it stops mass assignment
- [ ] Explain the single exception filter and the error shape
- [ ] Explain AsyncLocalStorage, its 3 pitfalls, and the worker re-bind

---

## 26. Traps — how people lose this round

**Node**
1. **"Node is multi-threaded"** or **"Node is slow because it is single-threaded"** — explain it properly.
2. **Blocking the event loop** — sync crypto, `readFileSync`, huge JSON, heavy loops in a handler.
3. **`forEach` with `async`** — nothing is awaited, errors vanish.
4. **Sequential `await`** for calls that could run together.
5. **Reading a big file into memory** instead of streaming.
6. **Keeping the process alive after an uncaught exception.**
7. **Assuming in-memory state is shared** across processes or containers.
8. **No graceful shutdown** — every deploy drops requests.
9. **Not committing the lock file**, or using `npm install` in CI.

**NestJS**
10. **Logic in the controller** — untestable and impossible to reuse from a worker.
11. **Request-scoped providers everywhere** — slow, and usually AsyncLocalStorage is the right answer.
12. **`ValidationPipe` without `whitelist`** → mass assignment.
13. **Auth added per route** instead of a global guard with `@Public()` — one forgotten decorator is a hole.
14. **Catching errors in the controller** and building responses by hand instead of one filter.
15. **Forgetting the tenant re-bind in workers** — the leak nobody catches in review.
16. **Reading `process.env` all over the code** instead of validated config.
17. **Returning the raw database entity** — internal fields leak on the next migration.
