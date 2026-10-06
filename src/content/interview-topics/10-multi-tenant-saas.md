# 10 — Multi-Tenant SaaS Architecture

> Easy English. Short lines. Say them out loud.
> **Time:** ~3 hours · **Pairs with:** [06 — Redis](06-redis.md), [07 — BullMQ](07-bullmq.md)
> ⭐ This is **your strongest topic** — you have shipped both models: Clinic Cloud (shared DB) and
> Interview AI (database per tenant). Spend real time here.

---

## 0. The 30-second answer (memorise this)

> 💬 **"What is multi-tenancy?"**
>
> "One application serving many customers, where each customer's data must never touch another's.
> Each customer is a tenant — a clinic, a company, a school.
>
> There are three models: one shared database with a tenant column, one database with a schema per
> tenant, or a separate database per tenant. It is a trade-off between cost and isolation.
>
> I have shipped two of them. Clinic Cloud serves many small clinics, so it is one shared database
> with a tenant ID on every row. Interview AI serves universities that ask about isolation in
> procurement, so each tenant gets its own database.
>
> The hard part is not the model. It is making the isolation **impossible to forget** — the tenant
> comes from the verified token, it is carried in AsyncLocalStorage, and the data layer applies it
> automatically. If a developer forgets a `where` clause, the system must still be safe."

That last paragraph is the whole interview. Learn it.

---

## 1. What is a tenant? (the simple picture)

Think of a building.

- **Apartment building** — everyone shares one building, but each family has their own flat with
  its own lock. Cheap. But if the water tank breaks, everyone suffers.
- **Separate houses** — every family has their own house. Very private, very safe. But you have to
  maintain 200 houses.

Now in software:

| Building | Software |
|---|---|
| The building | Your app |
| One family | One **tenant** (a clinic, a company) |
| A flat | That tenant's data |
| The lock on the flat | Your isolation code |
| Water tank breaks | One tenant slows down everyone (**noisy neighbour**) |

**Key point:** a tenant is a *customer organisation*, not a user.
One tenant has many users. One user can even belong to two tenants.

---

## 2. The three models (know all three, with numbers)

### Model A — Shared database, shared tables (`tenant_id` on every row)

```sql
SELECT * FROM appointments WHERE tenant_id = 'clinic-9' AND date = '2026-09-07';
```

Everyone's rows live in the same table. A column says who owns each row.

✅ Cheapest. One database, one migration, easy to add a tenant (just insert a row).
❌ Weakest isolation. **One missing `WHERE` = a data leak.** Restoring one tenant's data is painful.

### Model B — One database, one schema per tenant

Same database server, but `clinic_9.appointments`, `clinic_10.appointments`.

✅ Better isolation. Still one server, so still cheap-ish. Per-tenant restore is easier.
❌ Migrations must run on every schema. Hundreds of schemas make Postgres slow (lots of tables).

### Model C — A separate database per tenant

```
clinic_9_db     ← its own connection string
clinic_10_db
```

✅ Strongest isolation. Easy per-tenant backup and restore. Easy to say "your data is separate" to a
hospital or a bank. One tenant's heavy query cannot slow another.
❌ Most expensive. Migrations must run N times. **Connection pools multiply** (see §9).
Onboarding a tenant means creating and migrating a database.

### The comparison table (draw this)

| | A: shared rows | B: schema per tenant | C: DB per tenant |
|---|---|---|---|
| Isolation | Weak (code) | Medium | **Strong** |
| Cost per tenant | Lowest | Low | Highest |
| Onboarding speed | Instant | Fast | Slow (create + migrate) |
| Migrations | One run | N runs | N runs |
| Restore one tenant | Very hard | Medium | **Easy** |
| Noisy neighbour risk | High | Medium | Low |
| Good for | Many small tenants, low risk data | Middle ground | Few large tenants, sensitive data |

### How to choose — say this

> "I choose based on the data and the customer. Health or financial data, or an enterprise customer
> who asks 'where exactly is my data?' — database per tenant. Thousands of small tenants where cost
> per tenant matters — shared tables with a tenant ID.
>
> A hybrid is also normal: most tenants share, and the few big customers who pay for it get their
> own database. The code stays the same because the tenant resolution layer hides the difference."

⭐ That hybrid answer is a senior-level answer.

---

## 3. Where does the tenant ID come from?

The request arrives. Before anything else, you must answer: **whose data is this?**

| Way | Example | Notes |
|---|---|---|
| **JWT claim** ⭐ | `{ sub: 42, tenantId: 'clinic-9' }` | Best. It is signed, so it cannot be faked. |
| **Subdomain** | `clinic9.app.com` | Nice for users. Still verify the user belongs to it. |
| **Header** | `X-Tenant-Id: clinic-9` | Fine for server-to-server with an API key mapped to a tenant. |
| **URL path** | `/api/tenants/clinic-9/patients` | Clear, but must be checked on every route. |
| ❌ **Request body** | `{ tenantId: 'clinic-10' }` | **Never.** The client can type anything. |

**The golden rule:**

> The tenant ID comes from something **the server verified** — a signed token, or an API key you
> looked up in the database. Never from a value the client can freely set.

If the client sends a subdomain or a path tenant, you still check: *does this logged-in user belong
to that tenant?* If not → 403. That check is what stops a normal user reading another clinic by
editing the URL. (That bug has a name: **IDOR**.)

---

## 4. ⭐ Carrying the tenant through the request (AsyncLocalStorage)

You now know the tenant. But the code that reads the database is 5 layers deep.
Passing `tenantId` through every function is ugly and easy to forget.

**AsyncLocalStorage** solves this. Think of it as a box attached to *this request*.
Anything inside the request can open the box. Two requests never see each other's box.

```
Request → guard verifies JWT → put { tenantId, prisma } in the box
                             → controller → service → repository → opens the box
```

```ts
// als.ts
export const als = new AsyncLocalStorage<{ tenantId: string; prisma: PrismaClient }>();

// middleware / interceptor
const { tenantId } = await jwt.verifyAsync(token);
als.run({ tenantId, prisma: clientFor(tenantId) }, () => next());

// anywhere deeper — no parameter passing
const { prisma, tenantId } = als.getStore()!;
```

**Why it is better than a global variable:** Node handles many requests at the same time. A global
would be overwritten by the next request. AsyncLocalStorage keeps one store per async chain.

⚠️ **The trap everyone hits:** a **background job has no request**. So the box is empty.
You must re-open a box inside the worker, using the tenant ID from the job data.

```ts
// producer — the tenant travels with the job
await queue.add('report', { tenantId, reportId });

// worker — re-bind before touching the database
new Worker('reports', async (job) => {
  const { tenantId, reportId } = job.data;
  return als.run({ tenantId, prisma: clientFor(tenantId) }, () => build(reportId));
});
```

⭐ Say this line in the interview: **"Every worker re-binds tenant context from the job payload
before it touches the database."** Very few candidates mention it. ([07 — BullMQ](07-bullmq.md).)

---

## 5. Making a leak impossible (this is the real skill)

"I will remember to add `where: { tenantId }`" is not a strategy. People forget. New joiners do not
know. Code review misses one.

**Build it so forgetting is safe.** Three layers, from weakest to strongest:

### Layer 1 — Automatic filter in the data layer

With Prisma, a client extension adds the filter to every query:

```ts
prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const { tenantId } = als.getStore()!;
        args.where = { ...args.where, tenantId };     // added automatically
        return query(args);
      },
    },
  },
});
```

Now a developer who writes `prisma.patient.findMany()` still gets only their tenant's rows.

### Layer 2 — Database-level rules (Row Level Security)

Postgres itself refuses to return other rows, even if the SQL is wrong.

```sql
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON patients
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- set once per connection/transaction, from the verified token
SET LOCAL app.tenant_id = 'clinic-9';
```

✅ This is the strongest option for a shared database. Even a raw SQL query is filtered.
⚠️ Careful with connection pooling — the setting must be applied per transaction, not left on a
reused connection. And the app's DB user must not be a superuser or the owner, or RLS is bypassed.

### Layer 3 — Separate connection per tenant (model C)

There is nothing to filter. The connection only points at that tenant's database.
The isolation is physical. This is why database-per-tenant is easy to explain to a hospital.

### Also: a test that tries to break in

```ts
it('cannot read another tenant', async () => {
  const res = await api.get(`/patients/${otherTenantPatientId}`).set(authFor('clinic-9'));
  expect(res.status).toBe(404);      // 404, not 403 — do not confirm the row exists
});
```

⭐ Write that test once per resource type. Say you do this — it shows you treat isolation as a
security property, not a feature.

> 💬 **The sentence:** "I never rely on developers remembering. The tenant filter is applied by the
> data layer automatically, and in the shared-database product it is also enforced by Postgres row
> level security. A missing `where` clause should be a bug, not a breach."

---

## 6. Migrations with many tenants

**Shared tables (model A):** one migration, done. Easy.

**Schema or DB per tenant (B and C):** you must run it N times. Now real problems appear.

| Problem | Answer |
|---|---|
| It fails on tenant 47 of 200 | You need it **resumable**. Keep a per-tenant migration version. Re-run only the ones behind. |
| It takes hours | Run in batches, with concurrency. Not all at once — you will exhaust the DB. |
| The code deploys before the migration finishes | ⭐ Use **expand and contract** (below) |
| A new tenant is created mid-deploy | New tenants must be created from the *latest* schema |

### Expand and contract (zero-downtime schema change)

Never change a column in one step. Do it in three deploys:

1. **Expand** — add the new column. Old code ignores it. Nothing breaks.
2. **Migrate** — write to both columns; backfill old rows in batches.
3. **Contract** — switch reads to the new column, then drop the old one.

This works whether you have 1 database or 200. Say the name — interviewers recognise it.

---

## 7. Per-tenant settings, plans and features

Tenants are not identical. They want different things.

| Thing | Where it lives |
|---|---|
| Branding (logo, colours) | Tenant settings row |
| Feature flags (`hasWhatsApp`, `hasAI`) | Tenant settings, cached in Redis |
| Plan limits (users, storage, API calls) | Plan table + a usage counter |
| Custom domain | A domain → tenant mapping table |
| Timezone, currency, language | Tenant settings ⭐ never assume one timezone |

**Cache these** — they are read on almost every request and change rarely.
Cache-aside with a per-tenant key, and delete the key when settings change. ([06 — Redis §4](06-redis.md).)

⚠️ Cache key must include the tenant: `clinic:9:settings`.
A shared key like `settings` will serve one tenant's config to another. That is the classic
multi-tenant caching bug.

---

## 8. Users, roles and switching tenants

A user is **not** inside one tenant. A user has **memberships**.

```
users            (id, email, password)
tenants          (id, name, plan)
memberships      (user_id, tenant_id, role)      ← the join table
```

This model handles everything:
- A consultant who works with 3 clinics → 3 memberships.
- Different role in each → `role` lives on the membership, not on the user.
- Removing someone from one tenant does not delete their account.

**Tenant switching:** the user picks a tenant → you issue a **new token** containing that
`tenantId`. Do not let the client just change a header.

**Invites:** invite by email → a pending membership → they accept → membership becomes active.

**Super admin / impersonation:** support staff sometimes need to see a tenant to fix a problem.
Rules to say out loud:
1. It is a separate permission, not a normal role.
2. Every impersonated action is written to an **audit log** with who, which tenant, and when.
3. It is time limited.
4. Ideally read-only.

⭐ Mentioning the audit log unprompted sounds very professional.

---

## 9. Noisy neighbour — one tenant hurting the others

One clinic uploads 50,000 records. Everyone else's app becomes slow.

| Where it hurts | Fix |
|---|---|
| **API traffic** | Rate limit **per tenant**, not only per IP ([06 §6](06-redis.md)) |
| **Queues** | One tenant floods the queue → everyone waits. Use a queue per job type, and a per-tenant concurrency limit or priority. |
| **Database** | Slow query from one tenant locks a shared table. Add a statement timeout. In model C, they cannot touch each other. |
| **Connection pool** ⚠️ | In DB-per-tenant, 200 tenants × a pool of 10 = 2000 connections. Postgres will die. |

**The connection pool answer (important for model C):**

> "You cannot keep an open pool per tenant. I keep a small LRU cache of clients for the tenants that
> are actually active, and close idle ones. In front of Postgres I use PgBouncer in transaction
> mode, so many app connections share a few real database connections."

⭐ This is the single hardest part of database-per-tenant, and knowing it proves you really built it.

---

## 10. Onboarding and offboarding a tenant

**Creating a tenant (model C) is a workflow, not an insert:**

```
1. Create the tenant row in the control database
2. Create the database
3. Run all migrations on it
4. Seed defaults (roles, templates, settings)
5. Create the first admin user + send the invite
6. Mark the tenant ACTIVE
```

Two things to say:
- Do it as a **background job**, not inside the HTTP request. It takes time.
- Make it **idempotent and resumable**. If step 3 fails, retrying must not create a second database.
  Keep a status per step. ([07 §7](07-bullmq.md).)

**Deleting a tenant (customer leaves, or GDPR):**
- Soft delete first (they may come back, and you may need it for a dispute).
- Then a hard delete after N days.
- Delete **everything**: rows, files in S3, cache keys, search index entries, queued jobs.
- Give them an **export** first. That is usually contractual.

⭐ "Delete also means cache keys, S3 files and search index" — most candidates only say "delete the
rows".

---

## 11. Everything else needs the tenant too

Isolation is not only the database. Say this list — it shows real experience:

| Layer | What to do |
|---|---|
| **Cache** | Key starts with the tenant: `tenant:9:...` |
| **Files / S3** | Prefix per tenant: `s3://bucket/tenant-9/...`. Signed URLs only. |
| **Queues** | Tenant ID in the job payload, re-bound in the worker |
| **Search index** | A field per document, or an index per tenant |
| **Logs & metrics** | Add `tenantId` to every log line ⭐ makes support 10× faster |
| **Emails / webhooks** | Sent from the tenant's own settings and templates |
| **Reports / exports** | Filtered, and the file also stored under that tenant's prefix |

---

## 12. Code reference (NestJS + Prisma)

```ts
// 1. Resolve the tenant from the verified token
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: Request, _res: Response, next: NextFunction) {
    const payload = await this.jwt.verifyAsync(extractToken(req));   // signed = trusted
    const tenantId = payload.tenantId;
    if (!tenantId) throw new UnauthorizedException();

    als.run({ tenantId, prisma: this.pool.clientFor(tenantId) }, () => next());
  }
}

// 2. A small pool of tenant clients (model C) — never one pool per tenant forever
class TenantClientPool {
  private cache = new LRUCache<string, PrismaClient>({
    max: 50,
    dispose: (client) => client.$disconnect(),      // close idle tenants
  });

  clientFor(tenantId: string) {
    let c = this.cache.get(tenantId);
    if (!c) {
      c = new PrismaClient({ datasources: { db: { url: urlFor(tenantId) } } });
      this.cache.set(tenantId, c);
    }
    return c;
  }
}

// 3. Services never take tenantId as a parameter — they read the store
async findAppointments(date: Date) {
  const { prisma } = als.getStore()!;
  return prisma.appointment.findMany({ where: { date } });   // already scoped
}

// 4. Worker re-binds the context
new Worker('reports', async (job) => {
  const { tenantId, reportId } = job.data;
  return als.run({ tenantId, prisma: pool.clientFor(tenantId) }, () => build(reportId));
});
```

---

## 13. Maps to YOUR projects

| Project | Model | The sentence to say |
|---|---|---|
| **Clinic Cloud** | **Shared DB, `tenant_id` per row** | "Thousands of small clinics — per-tenant infrastructure would kill the unit economics. The tenant comes from a validated header with a subdomain fallback, and isolation is enforced in the data layer, not by remembering a `where` clause." |
| **Interview AI** | **Database per tenant** | "Universities ask about data isolation in procurement, and there are tens of them, not thousands. A control-plane database holds the encrypted connection strings; a tenant guard binds that tenant's Prisma client through AsyncLocalStorage. I get per-tenant backup, restore and deletion for free; I pay for it in migration orchestration and connection pooling, which I solved with an LRU client pool." |
| **Both** | Tenant context | "Resolved from the verified JWT, carried in AsyncLocalStorage, and re-bound inside every queue worker." |
| **Both** | Caching | "Every cache key is namespaced by tenant, so config can never leak across clinics." |
| **Both** | Onboarding | "Creating a tenant is an idempotent background workflow — create, migrate, seed, invite — not an insert." |

⭐ **Your best line:** "I have shipped both models, so I can talk about the trade-off from
experience rather than theory."

---

## 14. Model answers (say these out loud)

**Q: What is multi-tenancy and what are the models?** → §0 + §2's table.

**Q: Which model would you choose for a healthcare product?**
> "Database per tenant. The data is sensitive, customers ask about isolation in their security
> review, and per-tenant backup and restore is a real requirement. The cost is operational —
> migrations run per tenant and connection pooling needs care — but for that customer it is worth it."

**Q: How do you stop one tenant seeing another's data?** ⭐ → §5's three layers. Finish with "a
missing where clause should be a bug, not a breach."

**Q: Where does the tenant ID come from?** → §3. "From the verified token, never from the body."

**Q: How does the tenant reach the database layer?** → §4 AsyncLocalStorage, plus the worker re-bind.

**Q: How do you run a migration for 200 tenants?** → §6. Resumable, per-tenant version, batched,
expand-and-contract.

**Q: One tenant is making everything slow. What do you do?** → §9.

**Q: How do you onboard a new customer?** → §10's workflow, as an idempotent background job.

**Q: How would you move a big customer from the shared database to their own?**
> "Create their database, run migrations, copy their rows, then do a short switch: set them
> read-only, copy the final changes, flip the tenant record to point at the new connection, verify,
> then release. Because the app looks the connection up per tenant, the application code does not
> change at all."

---

## 15. Rapid-fire one-liners

| Word | One line |
|---|---|
| **Tenant** | One customer organisation, with many users |
| **Pooled model** | Everyone shares tables; a `tenant_id` column separates them |
| **Silo model** | Each tenant gets their own database |
| **Hybrid** | Most tenants pooled; big customers siloed |
| **Tenant resolution** | Deciding whose data this request is, from the verified token |
| **AsyncLocalStorage** | A per-request box that carries the tenant deep into the code |
| **RLS** | Postgres rule that filters rows by tenant in the database itself |
| **IDOR** | Changing an ID in the URL to read someone else's data |
| **Noisy neighbour** | One tenant's load hurting the others |
| **PgBouncer** | Connection pooler that stops per-tenant pools exploding |
| **Expand and contract** | Safe 3-step schema change with no downtime |
| **Membership** | The row joining a user to a tenant, with a role |
| **Impersonation** | Support viewing a tenant — permissioned and audited |
| **Provisioning** | The workflow that creates a new tenant |
| **Data residency** | Which country a tenant's data must stay in |

---

## 16. Self-check

- [ ] Explain multi-tenancy with the apartment/houses example
- [ ] Name the 3 models with one pro and one con each
- [ ] Say which model you would pick for health data, and why
- [ ] List 4 places the tenant ID can come from, and the one that is banned
- [ ] Explain AsyncLocalStorage in 3 lines
- [ ] Explain why a worker needs to re-bind the tenant
- [ ] Describe the 3 layers that make a leak impossible
- [ ] Write the Postgres RLS policy roughly from memory
- [ ] Explain migrating 200 tenants safely
- [ ] Explain the connection pool problem in DB-per-tenant
- [ ] List everything that needs a tenant prefix (cache, S3, logs, search)
- [ ] Describe onboarding a tenant as a resumable workflow
- [ ] Explain memberships and tenant switching

---

## 17. Traps — how people lose this round

1. **Taking the tenant ID from the request body or a header the client controls.**
2. **Relying on developers to remember `where: { tenantId }`.** Automate it.
3. **Forgetting the tenant in a background job.** No request = no context.
4. **A cache key without the tenant.** One clinic gets another clinic's config.
5. **Forgetting S3, search index and logs.** Isolation is not only the database.
6. **`findUnique({ where: { id } })` with no tenant check** — the classic IDOR hole.
7. **Returning 403 instead of 404** for another tenant's record. 403 confirms it exists.
8. **One connection pool per tenant** in the silo model → Postgres runs out of connections.
9. **Non-resumable migrations.** Failure at tenant 47 leaves you in an unknown state.
10. **Provisioning inside the HTTP request.** It times out halfway and leaves a broken tenant.
11. **Deleting rows but keeping files.** Not a real deletion, and a compliance problem.
12. **No audit log for impersonation.**
13. **Saying "we just add a tenant_id column" and stopping there.** That is the start, not the answer.

---

## 18. Scenario questions — "what will you do if…"

The shape is always: **say the cause → fix it now → stop it happening again.**

---

**S1. A clinic reports they can see another clinic's patient in a search result.**
> "That is a P1 security incident, not a bug. First I stop the bleeding — disable that endpoint or
> roll back the release. Then I find the query: almost always a new endpoint that queries directly
> and skipped the tenant filter, or a raw SQL query that bypassed the data layer.
> The fix is not just that line. I add the filter in the data layer so it applies everywhere, add a
> test that tries to read across tenants for that resource, and check the logs to see whether anyone
> actually accessed data they should not have — because that decides if we must notify the customer."

**S2. A user changes the ID in the URL and gets someone else's record.**
> "IDOR. The query used `findUnique({ where: { id } })`, which ignores the tenant.
> Every read must be scoped: `where: { id, tenantId }`. And I return **404**, not 403 — a 403 tells
> them the record exists somewhere. Long term the automatic tenant filter makes this impossible to
> write."

**S3. Your background worker wrote data into the wrong tenant's database.**
> "The worker ran without tenant context, or with the previous job's context. There is no HTTP
> request in a worker, so nothing sets it automatically.
> The fix is that the tenant ID travels in the job payload and the handler re-binds the context
> before any database call. I also assert it at the top of the handler — if there is no tenant in
> the store, throw immediately instead of silently using a default client."

**S4. You have 200 tenant databases. The migration failed on tenant 47.**
> "First: is the app still working? Tenants 1–46 are on the new schema, the rest are on the old one,
> so I need the code to work with both — that is why I use expand-and-contract instead of a
> breaking change.
> Then I look at why 47 failed — usually bad data, like a duplicate that blocks a new unique index.
> I keep a migration version per tenant, so I fix that tenant's data and re-run only the ones behind.
> The runner must be resumable; it must never start again from tenant 1."

**S5. One clinic uploads 50,000 records and the whole product becomes slow.**
> "Noisy neighbour. Immediate: find the queries or jobs from that tenant and throttle them —
> per-tenant rate limit, and a concurrency cap so their jobs cannot take every worker.
> Prevention: per-tenant limits by plan, a statement timeout on the database, and bulk imports go
> through the queue in batches instead of one huge request. If they are a big paying customer, this
> is also the moment to move them to their own database."

**S6. Postgres is refusing new connections. You run database-per-tenant.**
> "Connection pool explosion. Each tenant client keeps its own pool, so tenants × pool size passed
> the Postgres limit.
> Immediate: reduce pool size per client and restart the app. Proper fix: keep clients in an LRU
> cache so only active tenants hold connections, close idle ones, and put PgBouncer in transaction
> mode in front so many app connections share a few real ones."

**S7. A big customer says: "we want our data in our own database, and in Europe."**
> "Both are supported by the same design. I create their database — in the EU region for residency —
> run migrations, copy their rows, and then a short switch: read-only, copy the delta, point their
> tenant record at the new connection, verify, release.
> The application code does not change, because the connection is looked up per tenant. I would also
> record the region on the tenant so new work always goes to the right place."

**S8. Support asks to log in as a customer to reproduce a bug.**
> "Impersonation, but with rules. It is a separate permission, not a normal admin role. The session
> is time limited and marked as impersonated, every action is written to an audit log with the staff
> member, the tenant and the reason, and by default it is read-only. The customer should be able to
> see that it happened."

**S9. A tenant cancels and asks you to delete everything.**
> "First an export, because that is usually in the contract. Then soft delete so it is reversible
> for a short window, then hard delete after the agreed number of days.
> Deletion means everything: database rows or the whole database, S3 files under their prefix, cache
> keys, search index documents, queued jobs, and backups after their retention period. I write a
> deletion job that lists each of those and is idempotent, so it can be retried."

**S10. A tenant restored from backup — but only that one tenant.**
> "In database-per-tenant this is easy: restore their database, nothing else is touched.
> In the shared model it is hard, because a full restore would roll back every other customer. I
> would restore the backup into a separate database, then copy back only that tenant's rows, in
> dependency order, and inside a transaction.
> This is exactly why sensitive customers get their own database."

**S11. The interviewer asks: design multi-tenancy for a new product from scratch.**
> "I would ask three questions first: how sensitive is the data, how many tenants are expected, and
> will any customer demand physical isolation or a specific region.
> With many small tenants and normal data, I start pooled — shared tables with a tenant ID, enforced
> by row level security. I design the tenant lookup as a layer from day one, so moving a big
> customer to their own database later is a configuration change, not a rewrite."

**S12. A new developer joins. How do you stop them causing a leak in week one?**
> "I do not rely on them knowing. The data layer applies the tenant filter automatically, the
> database enforces it with row level security, and there are cross-tenant tests that fail the build
> if an endpoint leaks. Their raw SQL would need review, so raw SQL is rare and flagged.
> Safety should come from the system, not from memory."
