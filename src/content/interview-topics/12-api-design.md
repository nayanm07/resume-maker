# 12 — API Design (REST + GraphQL basics)

> Easy English. Short lines. Say them out loud.
> **Time:** ~3 hours · **Pairs with:** [11 — Auth & Security](11-auth-and-security.md), [07 — BullMQ](07-bullmq.md)
> ⭐ You shipped a 56-endpoint public partner API with OpenAPI docs. This is a topic you can own.

---

## 0. The 30-second answer (memorise this)

> 💬 **"How do you design an API?"**
>
> "I design around **resources**, not actions. Nouns in the URL, HTTP methods for the verb, and
> status codes that mean what they say.
>
> Then the things that decide whether the API survives contact with real users: consistent error
> format, cursor pagination with a maximum page size, versioning with a rule about what counts as a
> breaking change, idempotency keys on writes so a retry cannot double charge, rate limits with clear
> headers, and OpenAPI documentation generated from the code so the docs cannot drift.
>
> I built a public partner API with 56 endpoints, so I care most about the boring parts — because
> once a partner integrates, I cannot change my mind."

---

## 1. What is an API? (the simple picture)

A restaurant again.

- You do not walk into the kitchen.
- You read the **menu** and tell the **waiter** what you want.
- The waiter brings back the food.

The menu is the API documentation. The waiter is the API. The kitchen is your database and logic.

**REST** just means: the menu is organised by **things** (resources), and you use standard HTTP
words to act on them.

---

## 2. URLs — name things, do not name actions

**Rule: the URL is a noun. The HTTP method is the verb.**

| ❌ Bad | ✅ Good |
|---|---|
| `POST /getUsers` | `GET /users` |
| `POST /createUser` | `POST /users` |
| `POST /deleteUser?id=5` | `DELETE /users/5` |
| `GET /user/list/all` | `GET /users` |
| `POST /updateUserEmail` | `PATCH /users/5` |

**Other rules:**
- **Plural** collections: `/users`, `/appointments`.
- Nesting shows ownership: `/clinics/9/appointments`. Stop at **two levels** — deeper gets ugly.
- Use `kebab-case` in paths: `/call-recordings`.
- Filters go in the query string: `/appointments?status=confirmed&date=2026-09-07`.
- IDs in the path, options in the query.

**When the action is not a noun** (approve, cancel, resend), it is fine to say so:
```
POST /invoices/55/refund
POST /appointments/12/cancel
```
Do not twist that into a fake resource. Being practical is better than being pure.

---

## 3. HTTP methods — and the two words interviewers listen for

| Method | Use | **Safe?** (no change) | **Idempotent?** (same result if repeated) |
|---|---|---|---|
| `GET` | Read | ✅ | ✅ |
| `POST` | Create, or an action | ❌ | ❌ ← the risky one |
| `PUT` | Replace the whole thing | ❌ | ✅ |
| `PATCH` | Change some fields | ❌ | Usually ✅ (make it so) |
| `DELETE` | Remove | ❌ | ✅ (deleting twice = still gone) |

**Say the definitions:**
- **Safe** = it does not change anything. A `GET` must never change data.
- **Idempotent** = calling it 5 times leaves the same state as calling it once.

⭐ **Why it matters:** networks retry. If a `POST /payments` is retried after a timeout, you can
charge twice. That is exactly why POST needs idempotency keys (§8).

**PUT vs PATCH in one line:** PUT replaces the whole record — missing fields get wiped. PATCH
changes only what you send. Most real APIs want PATCH.

---

## 4. Status codes — the ones you must use correctly

| Code | Meaning | When |
|---|---|---|
| **200** | OK | Normal success |
| **201** | Created | After a POST that made something. Add a `Location` header. |
| **202** | Accepted | ⭐ Work queued, not done yet ([07 — BullMQ](07-bullmq.md)) |
| **204** | No Content | Success with nothing to return (a DELETE) |
| **400** | Bad Request | Malformed request |
| **401** | Unauthorized | Not logged in / bad token |
| **403** | Forbidden | Logged in, not allowed |
| **404** | Not Found | Missing — **or hiding another tenant's record** ([10](10-multi-tenant-saas.md)) |
| **409** | Conflict | Duplicate, or the state does not allow it ("already cancelled") |
| **422** | Unprocessable | Valid JSON, invalid values (validation errors) |
| **429** | Too Many Requests | Rate limited. Send `Retry-After`. |
| **500** | Server Error | Your bug. Never leak the stack trace. |
| **503** | Unavailable | Down or overloaded; a dependency failed |

**The rule that fixes most bad APIs:** never return `200 { "success": false }`.
The status code *is* the result. Clients, proxies and monitoring all read it.

---

## 5. Errors — one shape, everywhere

Pick one error shape and use it in every endpoint. This is the thing partners complain about most.

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "Two fields are invalid",
  "requestId": "req_01H8...",
  "errors": [
    { "field": "email", "message": "must be a valid email" },
    { "field": "age",   "message": "must be 18 or older" }
  ]
}
```

Four things to say:
1. A **machine-readable `code`** so clients can branch on it. Messages change; codes must not.
2. **Field-level errors** for forms, so the UI can show them in place.
3. A **`requestId`** that also appears in your logs. Support becomes 10× faster.
4. **Never leak internals** — no stack traces, no SQL, no "user not found in table users".

The standard format is called **RFC 7807 / Problem Details**. Naming it sounds professional.

---

## 6. Response body basics

| Thing | Do this |
|---|---|
| Field names | Pick `camelCase` or `snake_case` and **never mix** |
| Dates | ISO 8601 in **UTC**: `2026-09-07T09:30:00Z`. Let the client localise. |
| Money | Integer in the smallest unit (paise/cents) + a currency code. **Never floats.** |
| Booleans | `isActive`, not `active: "yes"` |
| Nulls | Be consistent — either omit or send `null`, not both |
| IDs | UUID (or prefixed like `apt_01H8…`) for public APIs — sequential IDs leak how many customers you have and invite guessing |
| Empty list | `[]`, not `null` |
| Enums | Fixed lowercase strings: `"confirmed"`, not `2` |

⭐ **Never return the whole database row.** Use a response DTO. Otherwise a new internal column
(`internal_notes`, `cost_price`) silently becomes public on your next deploy.

---

## 7. Pagination, filtering, sorting

**Never return everything.** A list endpoint must always have a limit — even if the client forgets.

### Offset pagination (simple)
```
GET /appointments?page=2&limit=50
```
✅ Easy, can jump to any page.
❌ Slow deep in the table (`OFFSET 100000` still walks 100,000 rows), and **items shift** — if a row
is inserted while you page, you see a duplicate or miss one.

### Cursor pagination (better) ⭐
```
GET /appointments?limit=50&cursor=eyJpZCI6IjEyMyJ9
→ { "data": [...], "nextCursor": "eyJpZCI6IjE3MyJ9" }
```
✅ Fast at any depth (`WHERE id > :cursor LIMIT 50`), stable while data changes.
❌ No "jump to page 7", and you need a stable sort key.

> 💬 **Say this:** "Offset for a small admin table where users want page numbers. Cursor for
> anything public or large, because it stays fast and does not skip records when data is being
> written. I always cap `limit` — the client can ask for 500, but they get 100."

**Total count is expensive.** `COUNT(*)` on a big table is slow. Either return an approximate count,
or just tell the client whether there is a next page (`hasMore: true`).

**Filtering and sorting:**
```
GET /appointments?status=confirmed&from=2026-09-01&sort=-createdAt
```
Allow-list the sortable and filterable fields. Never pass the client's string into SQL.

---

## 8. Idempotency keys — the payments answer ⭐

Problem: the client sends `POST /payments`. The network times out. Did it work?
If they retry, will the customer be charged twice?

Solution: the client sends a key it generates.

```http
POST /payments
Idempotency-Key: 6f1a0c2e-...
```

Server logic:
1. Look up the key.
2. **Not seen** → do the work, save `key → response`, return it.
3. **Seen and finished** → return the **saved response**, do not do the work again.
4. **Seen and still running** → return 409 so the client retries later.

Store keys with a TTL (24 hours is normal), scoped to the tenant and endpoint.

> 💬 "Any endpoint that moves money or sends something accepts an idempotency key, because the
> client cannot know whether a timeout meant success. I store the key with the response so a retry
> returns the original result instead of doing the work twice."

---

## 9. Rate limiting — and telling the client about it

Return the limits in headers so a good client can behave:

```http
429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1757239200
```

Limit **per API key or per tenant**, not just per IP ([06 §6](06-redis.md), [10 §9](10-multi-tenant-saas.md)).
Also cap page size, request body size and query complexity — those are limits too.

---

## 10. Versioning and breaking changes

```
/v1/appointments        ← simple, visible, easy to route and cache
Accept: application/vnd.api.v2+json     ← purer, harder for partners to use
```

Most public APIs use the URL. Use that unless there is a reason not to.

**What is a breaking change?** Know this list cold:

| ✅ Safe (no new version) | ❌ Breaking (new version) |
|---|---|
| Adding a new endpoint | Removing an endpoint or field |
| Adding an **optional** field to a response | Renaming a field |
| Adding an optional request parameter | Making an optional field required |
| Adding a new enum value *if clients tolerate it* | Changing a type (`"5"` → `5`) |
| Bug fix that matches the docs | Changing the meaning of a field or a status code |

**Deprecation, said properly:**
> "I announce it, keep the old version running for a stated window — six months for a partner API —
> send `Deprecation` and `Sunset` headers, and monitor who is still calling it so I can contact them
> before it is switched off."

---

## 11. Caching and concurrent edits

**ETag** = a fingerprint of the response.

```http
GET /appointments/12        → 200, ETag: "abc123"
GET /appointments/12        (If-None-Match: "abc123")  → 304 Not Modified, empty body
```
Saves bandwidth and time.

**The same idea prevents lost updates** (optimistic concurrency):

```http
PATCH /appointments/12
If-Match: "abc123"      → 412 Precondition Failed if someone else changed it first
```

Two people editing the same record no longer silently overwrite each other. Mentioning this is a
strong signal — most candidates never do.

Also use `Cache-Control: private, max-age=60` for data that can be a minute old, and `no-store` for
anything sensitive.

---

## 12. Slow work — do not make the client wait

```http
POST /interviews/55/evaluate
→ 202 Accepted
   Location: /jobs/job_123
   { "jobId": "job_123", "status": "queued" }

GET /jobs/job_123 → { "status": "processing", "progress": 40 }
                  → { "status": "done", "resultUrl": "/reports/88" }
```

Then tell the client when it is finished by **polling**, a **webhook**, or a **socket**
([09](09-realtime-websockets.md)).

Never hold an HTTP request open for 40 seconds. Proxies time out, mobile networks drop, and a
restart loses the work.

---

## 13. Webhooks you send to others

If your API notifies partners, you now own the reliability problem:

- **Retry** with exponential backoff, for hours, not minutes.
- **Sign** every payload (HMAC + timestamp), so they can verify it ([11 §9](11-auth-and-security.md)).
- Include an **event ID** so they can be idempotent.
- Do not promise **ordering** — say "events can arrive out of order, use the timestamp".
- Give them a **replay** endpoint and a log of deliveries. Partners will ask for it.
- Time out fast on their endpoint (5s) and retry, rather than holding your worker.

---

## 14. Documentation — OpenAPI

**OpenAPI (Swagger)** is a machine-readable description of your API.

Two ways round:
- **Code-first** — decorators generate the spec (NestJS `@nestjs/swagger`). Easiest to keep in sync.
- **Contract-first** — write the spec, generate types and stubs. Better when a partner needs the
  contract before you build.

Why it matters:
- Partners get a real reference and a "try it" page.
- You can **generate client SDKs**, so they integrate in a day.
- The spec can be **diffed in CI** to catch accidental breaking changes. ⭐ Great thing to say.

> 💬 "The docs are generated from the code, so they cannot drift. Every endpoint has an example
> request and response, the error codes are listed, and I diff the OpenAPI file in CI so a breaking
> change fails the build instead of surprising a partner."

---

## 15. GraphQL — the basics you need

**One endpoint. The client asks for exactly the fields it wants.**

```graphql
query {
  appointment(id: "12") {
    date
    patient { name phone }
  }
}
```
You get back exactly that shape. Nothing more.

**Three operation types:**

| Type | Meaning | REST equivalent |
|---|---|---|
| `query` | Read | GET |
| `mutation` | Write | POST/PATCH/DELETE |
| `subscription` | Live updates | WebSocket |

**Pieces:** the **schema** defines types and is the contract; a **resolver** is the function that
fills one field; the whole thing is strongly typed.

### What it fixes

| Problem in REST | GraphQL |
|---|---|
| **Over-fetching** — you get 40 fields, you needed 3 | Ask for 3 |
| **Under-fetching / N+1 requests** — a mobile screen needs 4 calls | One request, nested |
| Many client-specific endpoints (`/users/:id/dashboard-lite`) | The client chooses |

### What it costs (say these — it shows judgement)

| Cost | Why |
|---|---|
| **N+1 database queries** | A list of 50 appointments each resolving `patient` = 51 queries. Fix: **DataLoader** batches them. ⭐ |
| **HTTP caching is gone** | Everything is a POST to `/graphql`. No ETag, no CDN. You cache inside instead. |
| **Expensive queries** | A deeply nested query can melt the database. Fix: depth limit, complexity scoring, timeouts. |
| **Harder rate limiting** | One request ≠ one unit of work. Limit by complexity points, not request count. |
| **Errors are odd** | Usually HTTP 200 with an `errors` array. Monitoring must look inside the body. |
| **More setup** | Schema, resolvers, tooling — heavier for a small API |

### When to choose which

> 💬 "REST for a **public partner API** — it is cacheable, easy to document, easy to rate limit, and
> every integrator already knows it.
>
> GraphQL when **many different clients** need different shapes of the same data, especially mobile
> screens that would otherwise make five calls. The price is N+1 protection with DataLoader, query
> complexity limits, and losing HTTP caching.
>
> For internal service-to-service, **gRPC** is often the better answer — binary, fast, typed
> contracts."

---

## 16. Maps to YOUR projects

| Project | API work | The sentence to say |
|---|---|---|
| **Partner API** | 56 REST endpoints, public | "Consistent errors with codes and a request ID, cursor pagination with a max page size, versioned URLs, rate limits per key" |
| **Partner API** | OpenAPI docs | "Generated from the code and diffed in CI, so docs cannot drift and a breaking change fails the build" |
| **Payments** | Idempotency | "Idempotency keys on write endpoints, so a retried request returns the original response" |
| **Interview AI** | Long AI work | "202 with a job ID, then progress by polling or socket — never a 40-second request" |
| **Clinic Cloud** | Tenant scoping | "Every list endpoint is scoped by the tenant from the token, and returns 404 rather than 403 across tenants" |
| **Any** | Webhooks out | "Signed, retried with backoff, with an event ID so partners can be idempotent" |

---

## 17. Model answers (say these out loud)

**Q: What makes an API RESTful?** → §2 + §3. Resources as nouns, HTTP methods as verbs, correct
status codes, stateless requests (each request carries its own auth).

**Q: PUT vs PATCH vs POST?** → §3, plus safe/idempotent definitions.

**Q: How do you paginate?** → §7. Offset vs cursor, with the trade-off and the max-limit rule.

**Q: How do you version an API and what is a breaking change?** → §10's table + the deprecation
window.

**Q: How do you stop a retried payment charging twice?** → §8 idempotency keys.

**Q: How do you handle errors?** → §5. One shape, a stable machine code, field errors, request ID,
never leak internals.

**Q: An endpoint takes 40 seconds. What do you do?** → §12. 202 + job status + notify.

**Q: REST vs GraphQL?** → §15's "when to choose which". Include the N+1/DataLoader point — it proves
you have actually used it.

**Q: How do you document an API?** → §14. Generated from code, examples, diffed in CI.

**Q: How would you design an API for scheduling calls?**
> "`POST /calls` with `scheduledAt` and an idempotency key, returning 201 with the resource.
> `GET /calls?status=&from=&to=` with cursor pagination. `PATCH /calls/:id` to reschedule, using
> `If-Match` so two people cannot overwrite each other. `POST /calls/:id/cancel` for the state
> change. Because the work happens later, the actual dialling is a queued job, and partners get a
> signed webhook when the state changes."

---

## 18. Rapid-fire one-liners

| Word | One line |
|---|---|
| **Resource** | A thing the API exposes — the noun in the URL |
| **Safe method** | Does not change anything (GET) |
| **Idempotent** | Same result if called many times |
| **201 + Location** | Created, and where to find it |
| **202** | Accepted, work is queued |
| **204** | Success, nothing to return |
| **409** | Conflict — duplicate or wrong state |
| **422** | Validation failed |
| **429 + Retry-After** | Rate limited, try again in N seconds |
| **Problem Details** | The standard error body (RFC 7807) |
| **Request ID** | Ties a client error to your logs |
| **Offset pagination** | `page` + `limit`; simple, slow deep, can skip rows |
| **Cursor pagination** | `WHERE id > cursor`; fast and stable |
| **Idempotency key** | Client-generated key so a retry is safe |
| **ETag / 304** | Fingerprint so unchanged data is not resent |
| **If-Match / 412** | Stops two edits overwriting each other |
| **Breaking change** | Removing or renaming; changing type or meaning |
| **Sunset header** | Tells clients when the old version dies |
| **OpenAPI** | Machine-readable API description → docs + SDKs |
| **HATEOAS** | Responses include links to next actions — rarely used in practice |
| **GraphQL** | One endpoint, client picks the fields |
| **Resolver** | Function that fills one field |
| **DataLoader** | Batches resolver calls to stop N+1 |
| **gRPC** | Fast binary RPC, good service-to-service |

---

## 19. Self-check

- [ ] Turn 5 bad URLs into good ones
- [ ] Say which methods are safe and which are idempotent, and why it matters
- [ ] Use 201, 202, 204, 409, 422, 429 correctly in one sentence each
- [ ] Write your standard error body from memory
- [ ] Explain offset vs cursor pagination and when to use each
- [ ] Explain idempotency keys end to end
- [ ] List 4 breaking changes and 4 safe ones
- [ ] Explain ETag and If-Match
- [ ] Explain the 202 + job status pattern
- [ ] Explain GraphQL in 3 sentences
- [ ] Explain the GraphQL N+1 problem and DataLoader
- [ ] Say when you would pick REST over GraphQL

---

## 20. Traps — how people lose this round

1. **Verbs in URLs** (`/getUser`, `/createOrder`).
2. **`200 { success: false }`** for errors.
3. **A list endpoint with no limit.** One call pulls the whole table.
4. **Returning the raw database row.** Internal fields leak on the next migration.
5. **Float money.** `0.1 + 0.2 !== 0.3`.
6. **Local timestamps with no timezone.**
7. **No idempotency on payments.**
8. **Sequential integer IDs in a public API.** They leak volume and invite guessing.
9. **Renaming a field "quickly"** — that is a breaking change for every client.
10. **Docs written by hand.** They drift within a month.
11. **403 instead of 404 across tenants.** It confirms the record exists.
12. **`OFFSET 100000`** in production.
13. **GraphQL with no depth or complexity limit.** One query can take the site down.
14. **GraphQL without DataLoader.** 51 database queries for one list.
15. **Holding an HTTP request open for slow work.**

---

## 21. Scenario questions — "what will you do if…"

The shape is always: **say the cause → fix it now → stop it happening again.**

---

**S1. A partner says your API charged their customer twice.**
> "Almost certainly a retry after a timeout — the first request succeeded, but they never saw the
> response. First I check by their reference: if there are two payments with the same intent, I
> refund one immediately.
> The proper fix is an `Idempotency-Key` header on write endpoints. I store the key with the saved
> response, so a retry returns the original result instead of charging again. I would also document
> it and tell partners to always send one."

**S2. A partner's page is timing out on `GET /appointments`.**
> "They are probably pulling everything. I check the request: no limit, or a huge one, and a deep
> offset.
> Immediate fix is a maximum page size on the server — they can ask for 1000 but they get 100 — and
> a database index for that filter and sort.
> Long term I move that endpoint to cursor pagination, because offset gets slower the deeper they
> go, and it can skip records while new rows are inserted."

**S3. You need to rename a response field. Partners are already live.**
> "Renaming is a breaking change, so I do not just do it. I use expand and contract: add the new
> field alongside the old one, keep both for the deprecation window, mark the old one deprecated in
> the OpenAPI spec, and watch who still reads it.
> If I cannot know who reads a field, that is a sign I need per-endpoint usage metrics. Only after
> the window do I remove it, in a new version."

**S4. One partner's traffic is slowing the API for everyone.**
> "Rate limit per API key, not per IP, and return 429 with `Retry-After` and the limit headers so
> their client can back off properly.
> Then I look at what they are calling — usually polling a list endpoint every second because we
> never gave them webhooks. So the real fix is often a webhook or a `since` filter, so they do not
> need to poll at all."

**S5. A client says "your API returns 200 but the data is wrong."**
> "First I ask for the `requestId` from the response — that is exactly why every response carries
> one. With it I can find the exact request, the tenant, the parameters and the response in the logs.
> If we do not have a request ID, that is the first thing I add, because otherwise every support
> ticket is guesswork."

**S6. Two staff members edit the same appointment. The second overwrites the first.**
> "A lost update. The API accepted a blind PATCH.
> I add optimistic concurrency: the GET returns an `ETag`, and the PATCH must send `If-Match`. If the
> record changed in between, they get 412 and the UI can say 'this was changed by someone else,
> reload'.
> A version column works the same way if I do not want ETags."

**S7. An endpoint that used to take 2 seconds now takes 40.**
> "First I find out whether it is the database or an external call, using the request trace.
> Short term I add the missing index or cache the expensive part.
> If the work genuinely takes 40 seconds, it should not be a synchronous endpoint at all: return 202
> with a job ID, do it in a queue, and let the client poll or get a webhook. A request that long will
> be killed by a proxy or a mobile network anyway."

**S8. A partner integrated against undocumented behaviour and your fix broke them.**
> "It is partly on us — if it was not documented, it was ambiguous. I would restore the old behaviour
> quickly if their business is affected, then document the intended behaviour and give a migration
> window.
> To prevent it: the OpenAPI spec is the contract, examples in the docs, and contract tests so what
> we promise is actually tested."

**S9. Your team wants to move the whole product to GraphQL.**
> "I would ask what problem we are solving. If mobile screens are making five calls and over-fetching,
> GraphQL genuinely helps.
> But for the public partner API I would keep REST — it is cacheable, easy to rate limit, easy to
> document, and partners already know it. A common answer is both: GraphQL for our own apps, REST for
> partners. And if we do adopt it, DataLoader and a complexity limit are day-one requirements, not
> later."

**S10. A single GraphQL query is taking the database down.**
> "Someone nested deeply — appointments → patient → clinic → appointments — and each level multiplies
> the queries.
> Immediate: kill the query and add a depth limit and a timeout.
> Proper fix: DataLoader so each level batches into one database call, complexity scoring so an
> expensive query is rejected before it runs, and pagination required on every list field."

**S11. The interviewer says: design the API for a booking system.**
> "Resources first: `/clinics/:id/slots` to see availability, `POST /appointments` to book with an
> idempotency key, `PATCH /appointments/:id` to reschedule with `If-Match`, `POST
> /appointments/:id/cancel` for the state change, and `GET /appointments` with cursor pagination and
> filters.
> Booking the last slot is a race, so the guarantee is a unique constraint in the database, not a
> check in the code — that returns 409 to the loser.
> Everything is scoped to the tenant from the token, reminders are queued jobs, and partners get a
> signed webhook on state change."

**S12. How would you document and release a v2?**
> "Run v1 and v2 side by side. New URL prefix, generated OpenAPI for both, a written changelog of
> exactly what changed, `Deprecation` and `Sunset` headers on v1, and per-version usage metrics so I
> know who has migrated.
> I would only create v2 for real breaking changes — anything additive goes into v1, because every
> extra version is maintenance forever."
