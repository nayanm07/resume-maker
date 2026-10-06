# 🎯 Interview Topics — in study order

> **One topic = one file = everything important about it.** Easy English, short lines, said out loud.
> ⭐ **The file numbers ARE the study order.** Start at 01 and work down — each file assumes the ones
> before it.
> Nothing here depends on the older `../notes/` folder — that stays as it is.

---

## 📚 The topics

### Stage 1 — The language (nothing works without this)
| # | Topic | Covers |
|---|---|---|
| 01 | [JavaScript & TypeScript Core](01-javascript-typescript.md) | Types & coercion, hoisting/TDZ, **closures**, **`this`** (4 rules), copying · prototypes & classes, which array methods mutate, modules, Map/Set/generators · promises & the 4 combinators, async/await errors, sequential vs parallel · **TS**: type vs interface, why unions beat enums, `any`/`unknown`/`never`, **narrowing & discriminated unions**, **generics** · utility types (build `Omit` yourself), mapped/conditional/`infer`, `as const`/`satisfies`, **typing APIs with Zod**, tsconfig & JS→TS migration |
| 02 | [HTML, CSS, React & Next.js](02-html-css-react-nextjs.md) | Semantic HTML, forms, a11y, `defer`/`async`, Core Web Vitals · box model, position & stacking, **flex vs grid**, responsive units, specificity, Tailwind vs CSS Modules · **state vs props & the 4 re-render causes**, keys, **all the hooks** + cleanup, forms · **performance** (memo done right, move state down, virtualise), context vs Redux, data fetching, error boundaries · **Next.js**: App Router, **Server vs Client Components**, **SSG/ISR/SSR/CSR**, caching & revalidation, server actions, SEO |
| 03 | [React Native, Native Android, iOS & Stores](03-react-native-mobile.md) ⭐ | How RN renders, threads, **bridge vs JSI/Fabric/TurboModules/Hermes** · **native Android**: Kotlin modules, **foreground services**, overlays over the dialer, receivers, sensitive permissions · FlatList performance, **offline-first zero-data-loss sync**, push vs sockets, deep links, secure storage · iOS basics & **what iOS does not allow**, your honest iOS script · **release**: keystore, **Play tracks + staged rollout**, **App Store + TestFlight + rejections**, OTA, CI/CD, crash reporting |

### Stage 2 — The backend core (your main job)
| # | Topic | Covers |
|---|---|---|
| 04 | [Node.js & NestJS](04-nodejs-nestjs.md) ⭐ | What Node is (V8 + libuv), modules & npm · **the event loop** (phases, microtask vs macrotask, nextTick vs setImmediate), async patterns, streams & backpressure, CPU work (worker threads / cluster / queue) · http → Express, middleware chain, central errors · **NestJS**: modules/controllers/services, DI & scopes, **the request lifecycle order**, pipes & DTO validation, guards, interceptors, exception filters, config, **AsyncLocalStorage**, Prisma · scaling, memory leaks, **graceful shutdown** |
| 05 | [Databases (PostgreSQL, MySQL, MongoDB)](05-databases.md) | SQL vs NoSQL, **Postgres vs MySQL vs Mongo** · keys & relationships, normalisation (and when to break it), data types, **Mongo embed vs reference** · **how an index works**, composite order, EXPLAIN, N+1, deep pagination · ACID & isolation, optimistic vs pessimistic locking, **double booking**, deadlocks · replication & read-after-write, partitioning vs sharding, connection pooling, backups, safe migrations |
| 06 | [Redis](06-redis.md) | In-memory model, TTL, all 6 data types, caching + stampede, sessions/JWT denylist, rate limiting ×3, distributed locks, pipeline vs MULTI vs Lua, Pub/Sub vs Streams, RDB/AOF, eviction, replication & cluster, ops commands, ioredis |
| 07 | [BullMQ & Job Queues](07-bullmq.md) | What a queue is (restaurant example), queue/job/worker/Redis, job states, every job option, retries & backoff, **idempotency**, delayed & repeatable jobs, stalled jobs, failed list/DLQ, monitoring, flows, scaling, graceful shutdown |
| 08 | [Cron Jobs & Schedulers](08-cron-and-schedulers.md) | Cron syntax, the 5 ways to schedule, the **3-servers-3-emails problem**, BullMQ repeatable jobs, NestJS `@Cron`, timezones, missed runs, overlap, batching + fan-out, heartbeat monitoring |
| 09 | [Real-Time Systems (WebSocket / Socket.IO)](09-realtime-websockets.md) | Polling vs long polling vs SSE vs WebSocket, the handshake, rooms & namespaces, **scaling with the Redis adapter**, sticky sessions, Nginx config, socket auth, heartbeats, **missed events on reconnect**, mobile problems, Pusher, NestJS gateway |
| 10 | [Multi-Tenant SaaS Architecture](10-multi-tenant-saas.md) ⭐ | The 3 models + how to choose, tenant resolution, AsyncLocalStorage, **making leaks impossible** (auto-filter / RLS / silo), migrations across 200 tenants, noisy neighbour, connection pools, provisioning & deletion, memberships & impersonation |
| 11 | [Authentication, Authorization & Security](11-auth-and-security.md) | AuthN vs AuthZ, password hashing, session vs JWT, JWT internals & attacks, access + refresh with rotation & reuse detection, OAuth2/OIDC/PKCE, MFA/OTP, RBAC & default deny, API keys + webhook HMAC, OWASP risks, **CORS explained correctly**, secrets |
| 12 | [API Design (REST + GraphQL basics)](12-api-design.md) ⭐ | URL & method rules, safe vs idempotent, status codes, one error shape, offset vs cursor pagination, **idempotency keys**, rate-limit headers, versioning & breaking changes, ETag/If-Match, 202 for slow work, webhooks out, OpenAPI, GraphQL (resolvers, N+1/DataLoader, when to use) |
| 13 | [AI, LLM & Voice Engineering](13-ai-llm-voice.md) ⭐ | Tokens/context/temperature, prompting in production, structured output · embeddings, ANN/IVF/**HNSW**, **pgvector in depth**, choosing a vector DB · **RAG both pipelines**, chunking, hybrid + RRF, reranking, HyDE, RAG vs fine-tuning, hallucinations, RAGAS · tool calling, **LangChain**, **LangGraph**, MCP, memory · cost & latency, streaming, observability, prompt injection · **voice pipeline with latency budget** |

### Stage 3 — The senior rounds (these decide the level and the salary)
| # | Topic | Covers |
|---|---|---|
| 14 | [Cloud, DevOps & Deployment](14-cloud-devops.md) | Cloud basics, DNS & the URL journey, 12-factor · Docker (multi-stage, Compose) · AWS (EC2/Fargate/Lambda, S3 presigned, RDS PITR & Multi-AZ, VPC/SGs, ALB, CloudFront, IAM & secrets) · Nginx, load balancing, health checks, autoscaling · **CI/CD**, rolling/blue-green/canary, zero downtime, expand-contract · observability, RPO/RTO & DR, Terraform, Kubernetes basics, cost — with an **honest map of your setup** |
| 15 | [System Design](15-system-design.md) ⭐ | The **7-step framework**, requirements & estimation · standard architecture, monolith vs microservices, databases, caching, queues & **outbox** · consistency & CAP, sagas, replication/sharding, **reliability patterns** · sync vs async, real-time & offline-first, security/tenancy in design · monitoring, SPOF, cost · **5 rehearsed designs — 4 are your own systems** · numbers + the 8 follow-ups that always come |
| 16 | [Testing & Code Quality](16-testing-quality.md) | Why test, pyramid vs trophy, test types · AAA & FIRST, Jest, mocks vs stubs vs spies, **what not to mock** · NestJS + supertest, **cross-tenant test**, **parallel-booking race test**, webhook idempotency, React/RN/Detox, AI features · TDD, contract tests, k6 load tests, flaky tests, coverage & mutation testing · clean code & SOLID, static analysis, **code review**, Git (merge/rebase, revert/reset, bisect), tech debt |

### Stage 4 — Practice (do this daily, alongside everything above)
| # | Topic | Covers |
|---|---|---|
| 18 | [Coding Round Question Bank](18-coding-round/README.md) ⭐ | **4 banks, every question answered.** [01 JS logic](18-coding-round/01-js-logic.md) — 55 questions, each solved **with and without built-in functions** · [02 DSA](18-coding-round/02-dsa.md) — 50 problems by pattern at 2-year level, with a must-do list · [03 SQL](18-coding-round/03-sql.md) — 45 queries + 12 theory, up to window functions · [04 Basic tasks](18-coding-round/04-basic-tasks.md) — 20: **create an API**, **call an API**, React data & form tasks, take-home checklist |

### Optional — only if the role asks for it
| # | Topic | When |
|---|---|---|
| 17 | [Python & FastAPI](17-python-fastapi.md) | The job description mentions Python. Framed as a **translation from Node**, with the honest "how much Python?" answer |

### 📋 Not written yet — say the word
| Topic | Why it matters |
|---|---|
| Prisma / ORM (deep) | Partly covered inside 04 and 05 — migrations, N+1, transactions, raw escape hatches |
| **Behavioural / HR round** | STAR stories, "why three companies in two years", salary — the last round before an offer |

---

## 📐 How every topic file is built

| Part | What's in it |
|---|---|
| **§0 The 30-second answer** | The paragraph to memorise for *"So, tell me about X."* |
| **Levels 1 → 5** | Basics first, then deeper. Each topic: explanation → detail → **interview questions** → **scenarios** |
| **Maps to YOUR projects** | The sentence that links the topic to your real work |
| **Rapid-fire** | One-line definitions to drill daily |
| **Self-check** | Tick boxes: can you do this without looking? |
| **Traps** | How people lose this round |

### How to study one file
1. Read **§0** out loud until you can say it without reading. That alone passes the screening question.
2. Read the levels in order. Do not memorise commands — understand **why** each thing exists.
3. Say every **interview question** answer out loud, in your own words.
4. Read the **scenarios** — that is the "what would you do if…" round.
5. Do the **self-check** on paper. Anything you cannot do, go back to that section.
6. Night before: **§0 + rapid-fire + traps** only. 15 minutes.

---

## ⏱️ If you have less time

| You have | Do this |
|---|---|
| **4 weeks** | 01 → 16 in order, about 3 days each, plus 30 minutes of **18** every day |
| **1 week** | §0 of everything, then full: **01, 04, 05, 10, 15** + the JS logic and SQL banks |
| **2 days** | §0 + rapid-fire + traps of **01, 04, 05, 10, 11, 12, 15** · rehearse the 5 designs in **15** |
| **Night before** | §0 of each topic in the job description · the follow-ups in **15** · your stories in **10**, **03**, **15** |
| **On the way there** | §0 paragraphs only. Out loud. |

---

## 🎯 By interview round

| The round | Read |
|---|---|
| **Screening / HR call** | §0 of 01, 04, 10 · the honest-position scripts in **05**, **03**, **17** |
| **Live coding** | [18/01 JS logic](18-coding-round/01-js-logic.md) · [18/02 DSA](18-coding-round/02-dsa.md) · `../URBAN_MONEY_REACT_ROUND.md` |
| **Take-home / machine coding** | [18/04 Basic tasks](18-coding-round/04-basic-tasks.md) + its take-home checklist |
| **Backend technical** | 04, 05, 12, 11, 06, 07 |
| **Front-end technical** | 02, 03, 01 |
| **SQL round** | [18/03 SQL](18-coding-round/03-sql.md) + 05 |
| **System design** | 15, then 10, 09, 07 for the deep dives |
| **Senior / architecture** | 15, 10, 14, 16 — and the honest gap answers |
| **AI / ML-adjacent role** | 13 (all of it) |
| **Mobile role** | 03, then 02 and 01 |

---

> **The rule:** if you cannot explain it to a friend who does not code, you cannot explain it to an
> interviewer. Simple words beat memorised jargon every single time.
