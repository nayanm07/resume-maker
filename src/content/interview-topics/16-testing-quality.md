# 16 — Testing & Code Quality

> Easy English. Short lines. Say them out loud.
> **Time:** ~4 hours · **Pairs with:** [14 — DevOps](14-cloud-devops.md) (CI gates), [10 — Multi-Tenant](10-multi-tenant-saas.md) (isolation tests), [13 — AI](13-ai-llm-voice.md) (evaluating LLM output)
> ⚠️ **The trap in this round is over-claiming.** "We have good coverage" loses. A precise, honest
> answer about *what* you test and *why* wins every time.

---

## How this file is organised — basic → advanced

**Every topic:** explanation → deeper detail → **interview questions** → **scenarios**.

| Level | Topics | Time | You can answer… |
|---|---|---|---|
| **1. Basics** | 1 Why test · 2 The pyramid · 3 Types of tests | 30 min | "Unit vs integration vs e2e?" |
| **2. Writing good tests** | 4 Anatomy of a good test · 5 Jest essentials · 6 Mocks, and what not to mock | 1 h | "Mock vs spy vs stub? What makes a test good?" |
| **3. Testing your stack** | 7 NestJS · 8 Database & concurrency · 9 Queues, time, webhooks, external APIs · 10 React & React Native · 11 AI features | 1 h | "How do you test a webhook? A race condition?" |
| **4. Advanced** | 12 TDD · 13 Contract tests · 14 Load testing · 15 Flaky tests · 16 Coverage & mutation testing | 45 min | "Is 100% coverage good? Why is this test flaky?" |
| **5. Code quality** | 17 Clean code · 18 Static analysis · 19 Code review · 20 Git workflow · 21 Refactoring & tech debt | 1 h | "What do you look for in a review? Merge vs rebase?" |
| **Wrap-up** | 22 Your honest position · 23 Rapid-fire · 24 Self-check · 25 Traps | 20 min | "How do you test your code?" |

**If you only have 1 hour:** §0, §2, §6, §8, §15, §19, §22.

---

## 0. The 30-second answer (memorise this)

> 💬 **"How do you test your code?"**
>
> "I test the paths where a silent failure is expensive: authentication and permissions, tenant
> isolation, payment webhook idempotency, and the booking concurrency logic. Those have unit and
> integration tests, and the database tests run against a real Postgres, because mocking the ORM hides
> exactly the bugs I am looking for.
>
> I do not have broad UI coverage. For the native Android call handling I tested manually across real
> devices, because those failures are device-specific and an emulator does not reproduce them.
>
> What I would add first: contract tests on the public API so a partner-breaking change fails in CI,
> and integration tests running on every pull request against a seeded test database."

⭐ It works because it is **specific**, shows **priorities**, and ends with a **plan**. Those are the
three things they are really testing.

---
---

# LEVEL 1 — BASICS

---

## 1. Why test at all?

**A test is a safety net.** You can change code tomorrow without being scared, because the net
catches you if you break something.

Tests give you four things:

| Benefit | Plain meaning |
|---|---|
| **Catch bugs early** | A bug found in CI costs minutes. In production it costs customers. |
| **Safe refactoring** | Change the inside, the tests prove the outside still works |
| **Documentation** | A test shows exactly how the code is supposed to behave |
| **Design feedback** | Code that is hard to test is usually badly designed — too many dependencies |

**But tests cost time.** Writing, running and maintaining them. So the real skill is not "test
everything". It is **testing the right things**.

> 💬 "I put tests where a bug would be silent and expensive — money, access control, tenant isolation,
> data integrity. A broken button is loud and cheap. A tenant leak is silent and catastrophic."

### Interview questions

**Q: Why do you write tests?**
> "So I can change code without fear. Tests catch regressions before users do, let me refactor safely,
> and document how the code should behave. And if something is hard to test, that tells me the design
> has too many hidden dependencies."

**Q: Do you test everything?**
> "No — I test by risk. The money path, auth, tenant isolation and data integrity get thorough tests.
> Simple glue code and UI layout get little, because a bug there is visible and cheap to fix."

---

## 2. The testing pyramid

```
          /\        E2E            few · slow · brittle · highest confidence
         /  \
        /____\      Integration    some · medium speed · tests real wiring
       /      \
      /________\    Unit           many · fast · isolated · cheapest
```

| Level | Tests | Example in your stack |
|---|---|---|
| **Unit** | One function or class, dependencies faked | Slot availability rules, rubric score maths, backoff schedule, signature verification |
| **Integration** | Several parts + real infrastructure | A service against a real Postgres; guard + controller together |
| **E2E** | The whole system through its public door | `supertest` against the HTTP API; Detox for the app |

**Why a pyramid shape?** Unit tests are fast and cheap, so have many. E2E tests are slow and break
easily, so have few — just the critical journeys.

### The testing trophy (a modern variation)

Kent C. Dodds' **testing trophy** puts the biggest layer at **integration**, not unit:
"Write tests. Not too many. Mostly integration."

**Why:** most real bugs are in how pieces fit together, not inside one pure function.

> 💬 "For a backend like mine I lean toward the trophy: many integration tests against a real database,
> unit tests for pure business rules, and a handful of end-to-end tests for the critical flows."

⭐ Knowing both shapes, and choosing one for a reason, is a stronger answer than reciting the pyramid.

### The golden rule

**Test behaviour, not implementation.**

A test that checks *what* the code does survives refactoring. A test that checks *how* it does it
(which private method was called, in what order) breaks every time you tidy the code — and then people
stop trusting the tests.

### Interview questions

**Q: What is the testing pyramid?**
> "Many fast unit tests at the bottom, fewer integration tests in the middle, and a few slow end-to-end
> tests at the top. The shape reflects cost — the higher up, the slower and more brittle. For backends I
> often weight integration more heavily, the 'testing trophy', because most bugs live in the wiring."

**Q: What does "test behaviour, not implementation" mean?**
> "Assert on the output and the side effects the caller cares about, not on which internal methods ran.
> Then refactoring the inside does not break the test, and the test only fails when behaviour is actually
> wrong."

---

## 3. Types of tests — the full list

| Type | Question it answers | Example |
|---|---|---|
| **Unit** | Does this one piece work? | `calculateScore()` returns 7 for this rubric |
| **Integration** | Do these pieces work together? | Booking service + real Postgres |
| **E2E** | Does the whole journey work? | Log in → book → pay → confirmation |
| **Contract** | Does the API still match what clients expect? | OpenAPI diff in CI (§13) |
| **Smoke** | Is the deployed app basically alive? | After deploy: `/health`, log in, list appointments |
| **Regression** | Did an old bug come back? | A test written for each fixed bug |
| **Snapshot** | Did the output change unexpectedly? | A rendered component or an API response |
| **Load / performance** | Does it hold up under traffic? | 500 users booking at once (§14) |
| **Security** | Can it be abused? | Cross-tenant access, SQL injection, auth bypass |
| **Acceptance / UAT** | Does it do what the business asked? | The clinic owner tries the new flow |
| **Manual / exploratory** | What did we not think of? | A person trying to break it on a real device |

⭐ **A regression test per bug** is a great habit to mention: "Every bug I fix gets a test that fails
before the fix and passes after. That bug can never quietly come back."

### Interview questions

**Q: Unit vs integration vs E2E?**
> "A unit test checks one piece in isolation. An integration test checks pieces working together with
> real infrastructure like the database. An end-to-end test runs a whole user journey through the public
> interface. They trade speed and precision for confidence as you go up."

**Q: What is a smoke test?**
> "A tiny set of checks right after a deploy — is it up, can I log in, does the main page load — to
> catch a broken release in the first minute."

**Q: What is a regression test?**
> "A test that proves an old bug stays fixed. I write one for every bug: it fails before the fix and
> passes after."

### Scenarios

**S1. The same bug has come back three times in six months.**
> "Nobody wrote a regression test when it was fixed, so nothing stops it returning. I would write a test
> that reproduces the bug exactly — it must fail on the broken code — then fix it and keep the test in CI.
> I would also ask why it keeps coming back: usually two places do the same logic and only one was
> fixed, which is a design problem to solve, not just a test to add."

---
---

# LEVEL 2 — WRITING GOOD TESTS

---

## 4. Anatomy of a good test

### Arrange – Act – Assert (AAA)

Every test has three parts. Keep them visually separate.

```ts
it('rejects a booking when the slot is already taken', async () => {
  // Arrange — set up the world
  const slot = await createSlot({ status: 'booked' });

  // Act — do the ONE thing being tested
  const result = bookingService.book({ slotId: slot.id, patientId: 'p1' });

  // Assert — check the outcome
  await expect(result).rejects.toThrow(ConflictException);
});
```

Also called **Given – When – Then**.

### Name the test like a sentence

| ❌ Bad | ✅ Good |
|---|---|
| `test1` | `rejects a booking when the slot is already taken` |
| `booking works` | `sends a confirmation after a successful payment` |
| `handles error` | `returns 404 when the appointment belongs to another tenant` |

When it fails, the name alone should tell you what broke.

### FIRST — qualities of a good test

| Letter | Meaning |
|---|---|
| **Fast** | Milliseconds for unit tests. Slow tests stop being run. |
| **Independent** | No test depends on another running first. Any order works. |
| **Repeatable** | Same result every time, on any machine. No real clock, no real internet. |
| **Self-validating** | Pass or fail on its own — nobody reads logs to decide. |
| **Timely** | Written close to the code, not months later. |

### Other rules

- **One behaviour per test.** If the name needs "and", it is probably two tests.
- **No logic in tests** — no `if`, no loops that hide what is being checked.
- **Test the edges:** empty list, zero, null, the maximum, the boundary (exactly 24 hours).
- **Test the unhappy path** as much as the happy one — errors are where bugs hide.
- **Clean up** — every test leaves the world as it found it.

### Interview questions

**Q: What makes a good unit test?**
> "It is fast, independent, repeatable and clear. It follows arrange-act-assert, tests one behaviour, is
> named like a sentence so a failure explains itself, and checks behaviour rather than implementation. It
> covers the edge cases and the error paths, not only the happy path."

---

## 5. Jest essentials

### Matchers you use every day

```ts
expect(total).toBe(500);                      // exact (primitives)
expect(user).toEqual({ id: 1, name: 'A' });   // deep equality (objects)
expect(list).toHaveLength(3);
expect(list).toContain('confirmed');
expect(obj).toMatchObject({ status: 'paid' }); // partial match
expect(fn).toThrow(BadRequestException);
expect(value).toBeNull();
expect(mockFn).toHaveBeenCalledWith('clinic-9', expect.any(String));
expect(mockFn).toHaveBeenCalledTimes(1);
```

⚠️ `toBe` vs `toEqual`: `toBe` checks it is the **same thing**; `toEqual` checks it **looks the
same**. Objects need `toEqual`.

### Async tests

```ts
await expect(service.book(dto)).resolves.toMatchObject({ status: 'booked' });
await expect(service.book(dto)).rejects.toThrow(ConflictException);
```
⚠️ **Forgetting `await`** makes the test pass before the promise finishes — a test that can never fail.

### Setup and teardown

```ts
beforeAll(async () => { await db.connect(); });       // once per file
beforeEach(async () => { await db.truncateAll(); });  // before every test
afterEach(() => jest.restoreAllMocks());              // undo spies and mocks
afterAll(async () => { await db.disconnect(); });
```

### Fake timers — test time without waiting

```ts
jest.useFakeTimers();
retryWithBackoff(send);
jest.advanceTimersByTime(30_000);          // jump 30 seconds instantly
expect(send).toHaveBeenCalledTimes(4);
jest.useRealTimers();
```

Also `jest.setSystemTime(new Date('2026-09-21T09:00:00Z'))` to freeze "now" — essential for anything
with reminders, expiry or "today".

### Interview questions

**Q: `toBe` vs `toEqual`?**
> "`toBe` checks identity — the same value or the same object reference. `toEqual` checks structure — two
> different objects with the same content are equal. For objects and arrays I use `toEqual`."

**Q: How do you test code that depends on time?**
> "Fake timers. I freeze the system time and advance the clock manually, so a 24-hour reminder or a
> backoff schedule is tested instantly and gives the same result every run."

### Scenarios

**S2. A test passes even when you deliberately break the code.**
> "The test is not really checking anything. Usual causes: a missing `await`, so the test ends before the
> promise rejects; an assertion inside a callback that never runs; or everything mocked so the real code
> never executes. I fix it and then prove it: break the code, watch the test fail, fix the code, watch it
> pass. A test you have never seen fail is not trustworthy."

---

## 6. Mocks, stubs, spies — and what NOT to mock

### The test doubles, simply

| Double | What it is | Example |
|---|---|---|
| **Dummy** | Passed in but never used | An empty logger |
| **Stub** | Returns a fixed answer | `getRate()` always returns 18 |
| **Spy** | Watches a real function, records calls | Did `sendEmail` get called? |
| **Mock** | A fake that you also make assertions on | Fake SMS service; assert it was called once |
| **Fake** | A working, simpler version | In-memory repository instead of Postgres |

```ts
const fn = jest.fn().mockResolvedValue({ id: 1 });   // mock with a fake result
jest.spyOn(mailer, 'send');                           // spy on a real method
jest.mock('./sms.service');                           // replace a whole module
```

### ⭐ What NOT to mock

This is where real experience shows.

| Do not mock | Why | Instead |
|---|---|---|
| **Your database / ORM** | Mocking Prisma hides the bugs you care about — wrong query, missing index, constraint, transaction behaviour | A **real Postgres** in a container (Testcontainers or docker compose) |
| **What you are testing** | Then you test the mock | Mock only its dependencies |
| **Everything** | The test passes but proves nothing | Mock the edges, keep the middle real |
| **Types you do not own, directly** | Their API may not behave like your mock | Wrap them in your own small adapter, mock the adapter |

**Do mock:** external paid or slow services — payment gateway, WhatsApp, OpenAI, SMS, email, and the
clock.

> 💬 "I mock at the edges of the system — third-party APIs and time — and keep the middle real,
> including the database. A test against a mocked ORM only proves the code called the mock the way the
> mock expected."

### Interview questions

**Q: Mock vs stub vs spy?**
> "A stub just returns canned answers. A spy wraps a real function and records how it was called. A mock
> is a fake I also assert against — that it was called, how many times, with what. A fake is a simpler
> working implementation, like an in-memory repository."

**Q: Should you mock the database in tests?**
> "For unit tests of pure logic, there should be no database at all. For anything that touches data, no —
> I use a real Postgres in a container, because most data bugs are in the query, the constraint or the
> transaction, and a mock hides exactly those."

### Scenarios

**S3. All tests pass, but production crashes on a unique constraint error.**
> "The tests mocked the database, so the constraint never existed in the tests. The mock returned success
> for a duplicate insert that real Postgres rejects. Fix: integration tests against a real Postgres with
> the real migrations applied, and a test that inserts the duplicate and expects the conflict to be
> handled. That class of bug cannot be caught with a mocked ORM."

---
---

# LEVEL 3 — TESTING YOUR STACK

---

## 7. Testing NestJS

### Unit test a service with its dependencies swapped

```ts
const moduleRef = await Test.createTestingModule({
  providers: [
    BookingService,
    { provide: PaymentGateway, useValue: { createLink: jest.fn().mockResolvedValue('https://pay/1') } },
  ],
}).compile();

const service = moduleRef.get(BookingService);
```

Dependency injection is what makes this easy — you hand the service a fake instead of the real thing.
⭐ Good line: "Nest's DI is also my testing tool. Anything injected can be replaced in a test."

### Override guards, providers and config

```ts
Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(WhatsAppClient).useValue(fakeWhatsApp)   // no real messages sent
  .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
  .compile();
```

⚠️ Do **not** override the auth guard in the tests that are supposed to test auth.

### E2E test with supertest

```ts
const app = moduleRef.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));   // ⭐ same setup as main.ts
await app.init();

await request(app.getHttpServer())
  .post('/appointments')
  .set('Authorization', `Bearer ${tokenForClinic9}`)
  .send({ slotId })
  .expect(201);
```

⚠️ **Classic bug:** the test app is missing the global pipes, filters or interceptors that `main.ts`
adds, so validation "works" in production but is skipped in tests. Share one `configureApp(app)`
function between both.

### ⭐ The test worth naming out loud — tenant isolation

```ts
it('clinic 9 cannot read clinic 10 appointments', async () => {
  const apt = await seedAppointment({ tenantId: 'clinic-10' });

  await request(app.getHttpServer())
    .get(`/appointments/${apt.id}`)
    .set('Authorization', `Bearer ${tokenForClinic9}`)
    .expect(404);                 // 404, not 403 — do not confirm it exists
});
```

> 💬 "The tests I care most about are the isolation ones — log in as tenant A, request tenant B's record
> by ID, and assert it fails. That bug is silent and catastrophic, so it gets an automated test, not a
> code-review promise."

### Interview questions

**Q: How do you test a NestJS app?**
> "Services with `Test.createTestingModule`, replacing injected dependencies with fakes. Controllers and
> full request flows with supertest against a real app instance configured exactly like `main.ts`. And
> the most important ones are the security tests — auth, permissions and cross-tenant access."

### Scenarios

**S4. Validation works in production, but a test sending bad data returns 201.**
> "The test app was built without the global `ValidationPipe` that `main.ts` registers, so validation
> never ran in the test. I move all global setup — pipes, filters, interceptors, prefixes — into one
> shared function used by both `main.ts` and the test bootstrap, so tests always run the real
> configuration."

---

## 8. Database tests and concurrency

### Use a real database

- **Testcontainers** starts a throwaway Postgres in Docker for the test run.
- Or a `docker compose` test database in CI.
- Apply the **real migrations** (`prisma migrate deploy`), not a hand-made schema.

### Keep tests independent

| Approach | Note |
|---|---|
| **Truncate tables before each test** | Simple and reliable |
| **Wrap each test in a transaction, roll back after** | Very fast; tricky if the code opens its own transactions |
| **Unique data per test** (random IDs, a tenant per test) ⭐ | Lets tests run in parallel safely |

**Factories** beat big shared fixtures: `createAppointment({ status: 'booked' })` — sensible
defaults, override only what matters to this test.

### ⭐ The concurrency test (most candidates have never written one)

```ts
it('only one of 20 parallel bookings wins the last slot', async () => {
  const slot = await createSlot({ status: 'free' });

  const results = await Promise.allSettled(
    Array.from({ length: 20 }, (_, i) =>
      bookingService.book({ slotId: slot.id, patientId: `p${i}` }),
    ),
  );

  const won = results.filter((r) => r.status === 'fulfilled');
  expect(won).toHaveLength(1);                                   // exactly one
  expect(await prisma.appointment.count({ where: { slotId: slot.id } })).toBe(1);
});
```

> 💬 "I fire twenty bookings at the last slot in parallel against a real database and assert exactly one
> wins. That test proves the database constraint does its job — a mocked database could never show it."

### Migration tests

- Run migrations up on a copy of realistic data in CI.
- Check the **old code still works on the new schema** — that is what expand-and-contract promises
  ([14 §13](14-cloud-devops.md)).

### Interview questions

**Q: How do you test a race condition?**
> "Against a real database, I fire many requests in parallel at the same resource with
> `Promise.allSettled` and assert on the final state — exactly one booking exists, and the others got a
> conflict. Running it a few times in CI catches regressions in the locking."

**Q: How do you keep database tests independent?**
> "Each test creates its own data through factories — ideally under its own tenant ID so tests can run in
> parallel — and tables are truncated or the transaction is rolled back between tests. No test relies on
> another test's data."

### Scenarios

**S5. Tests pass alone but fail when the whole suite runs.**
> "Shared state. One test leaves data behind, or depends on data another test created, or they run in
> parallel on the same rows. Fixes: each test creates its own data through factories, ideally under a
> unique tenant ID; tables are cleaned between tests; mocks are restored in `afterEach`. Running the
> suite in random order helps find the hidden dependencies."

---

## 9. Testing queues, time, webhooks and external APIs

### Queues and workers

Test the **handler**, not BullMQ itself.

```ts
// the worker's logic is a plain function — easy to test
await processEvaluation({ data: { tenantId: 't1', interviewId: 'i1' } } as Job);
expect(await prisma.report.findUnique({ where: { interviewId: 'i1' } })).not.toBeNull();

// ⭐ idempotency: run it twice, same result
await processEvaluation(job);
await processEvaluation(job);
expect(await prisma.report.count({ where: { interviewId: 'i1' } })).toBe(1);
```

Also test: the tenant is re-bound inside the handler, and an `UnrecoverableError` is thrown for bad
input so it is not retried ([07](07-bullmq.md)).

### Webhooks — the test that proves idempotency

```ts
it('charges once even if the payment webhook arrives twice', async () => {
  const body = signedRazorpayEvent({ id: 'evt_1', type: 'payment.captured' });

  await request(app.getHttpServer()).post('/webhooks/razorpay').set(body.headers).send(body.raw).expect(200);
  await request(app.getHttpServer()).post('/webhooks/razorpay').set(body.headers).send(body.raw).expect(200);

  expect(await prisma.payment.count({ where: { providerRef: 'pay_1', status: 'paid' } })).toBe(1);
});

it('rejects a webhook with a bad signature', async () => {
  await request(app.getHttpServer()).post('/webhooks/razorpay')
    .set('x-razorpay-signature', 'wrong').send({}).expect(401);
});
```

### External APIs — do not call the real thing

| Tool | Use |
|---|---|
| **nock** | Intercept HTTP calls in Node tests |
| **MSW (Mock Service Worker)** | Same idea, works in Node and the browser — great for frontend |
| **An adapter + fake** ⭐ | Wrap each third party in your own small class; tests inject a fake |

Test the **failure modes** too: timeout, 500, 429 with `Retry-After`, malformed response. That is
where your retry and fallback code lives — and it is usually untested.

### Time-based features

Freeze the clock (`jest.setSystemTime`) for reminders, expiry, "today", timezones — and test around
boundaries: just before 24 hours, exactly 24 hours, midnight IST vs UTC.

### Interview questions

**Q: How do you test a webhook handler?**
> "Three tests: a valid signed event is processed; the same event sent twice has the effect only once;
> and a bad signature is rejected. The signature test uses the raw body, exactly like production."

**Q: How do you test code that calls a third-party API?**
> "The third party sits behind my own small adapter, and tests inject a fake. I test the happy path and,
> more importantly, the failures — timeout, 500, 429 and bad data — because that is where retry and
> fallback logic lives. For HTTP-level tests I use nock or MSW so nothing real is called."

### Scenarios

**S6. The retry logic for the WhatsApp API has never actually been tested.**
> "Failure paths are the least tested and the most important. I would fake the WhatsApp adapter to return
> a 429 with `Retry-After`, then a timeout, then a 500, and assert the retries, the backoff with fake
> timers, and that after the last attempt the job fails cleanly instead of looping. One of those tests
> usually finds a real bug."

---

## 10. Testing React and React Native

### What to test in the frontend

| Worth testing | Not worth much |
|---|---|
| Forms: validation, error messages, submit disabled while loading | Exact CSS and pixel layout |
| Critical flows: login, booking, payment | Every small presentational component |
| Custom hooks and state logic (reducers, RTK slices) | Third-party component internals |
| Loading, empty and error states | Snapshot tests of everything |

### React Testing Library — the idea

**Test the way a user uses it.** Find elements by role and label, not by class names or internal state.

```ts
render(<BookingForm />);
await userEvent.click(screen.getByRole('button', { name: /book/i }));
expect(await screen.findByText(/please choose a slot/i)).toBeInTheDocument();
```

Use **MSW** to fake the API, so components run their real data-fetching code.

⚠️ **Snapshot tests** are easy to write and easy to approve blindly. Keep them small and few.

### React Native and Detox

**Detox** runs the real app on an emulator or device and waits for the app to be idle, so it needs no
random `sleep`s.

**Worth it for:** the two or three flows that must never break — login and the core money path.
**Not worth it for:** broad UI coverage — it is slow, can be flaky in CI, and needs devices.

> 💬 "For the native Android call handling — call state, overlays, recording — I relied on manual testing
> across real OEM devices, because the failures are device-specific. An emulator will not reproduce a
> Xiaomi killing your background service."

⭐ That honest, specific sentence is better than claiming automated coverage you do not have.

### Interview questions

**Q: How do you test React components?**
> "With React Testing Library, the way a user would — find things by role and label, click, type, and
> assert what appears. The API is faked with MSW so the real data-fetching code runs. I focus on forms,
> critical flows and error states rather than layout."

**Q: How do you test a React Native app?**
> "Unit tests for logic and hooks, component tests with React Native Testing Library, and Detox for the
> two or three critical journeys. Native, device-specific behaviour gets manual testing on real devices,
> because emulators do not reproduce those failures."

---

## 11. Testing AI features

LLM output is **not deterministic**, so normal exact-match tests do not work. ([13 §13](13-ai-llm-voice.md))

| What | How |
|---|---|
| **Your code around the model** | Normal tests with a **fake LLM** that returns fixed responses — parsing, validation, retries, fallbacks |
| **Schema validation** | Feed malformed, missing-field and out-of-range outputs; assert they are rejected |
| **Prompt quality** | A **golden set** of real inputs, scored by rules or an LLM judge, run on every prompt change |
| **Retrieval** | Recall@k on known question → document pairs |
| **Safety** | A set of prompt-injection inputs that must not change behaviour |

> 💬 "I split AI testing in two. The code around the model is tested normally, with a fake model. The
> model's behaviour is evaluated with a golden set and a rubric, and that runs in CI whenever a prompt
> changes, so quality is measured, not guessed."

### Interview questions

**Q: How do you test something non-deterministic like an LLM feature?**
> "I separate the deterministic part from the model. Parsing, validation, retries and fallbacks are tested
> with a fake model returning fixed outputs, including broken ones. The model's quality is evaluated
> separately with a golden set and scoring, tracked over time, and run on every prompt change."

---
---

# LEVEL 4 — ADVANCED TESTING

---

## 12. TDD — Test-Driven Development

### The loop: Red → Green → Refactor

```
1. RED       write a test for the next small behaviour. Run it. It fails.
2. GREEN     write the simplest code that makes it pass.
3. REFACTOR  clean the code up. Tests stay green.
   repeat
```

**Why it helps:** you only write code that is needed, the design stays testable, and every behaviour
has a test from the start.

### When TDD works well, and when it does not

| ✅ Great for | ❌ Awkward for |
|---|---|
| Pure business rules (pricing, slot rules, scoring) | Exploring an unknown API or UI |
| Bug fixes — write the failing test first ⭐ | Spikes and prototypes you will throw away |
| Parsers, validators, calculations | Heavy UI layout work |

> 💬 "I do not do strict TDD for everything, but I always do it for bug fixes — the failing test comes
> first, so I know I reproduced the bug and I know it stays fixed. For well-defined business rules I often
> write the tests first because the rules are clear."

⭐ Honest and specific beats "I always do TDD".

**BDD (Behaviour-Driven Development)** — the same idea written as business scenarios:
`Given a free slot, When two patients book it, Then only one booking succeeds.`

### Interview questions

**Q: What is TDD and do you use it?** → the loop, then the honest quote.

---

## 13. Contract tests

### The problem

You change the API response. Your tests pass — they test *your* side. But the mobile app or a partner
breaks, because they expected the old shape.

### The fix

A **contract** is the agreed shape of requests and responses. A contract test checks both sides still
honour it.

| Approach | How |
|---|---|
| **OpenAPI diff in CI** ⭐ | Generate the spec from code, compare with `main`, fail the build on a breaking change |
| **Consumer-driven contracts (Pact)** | Each client publishes what it expects; the provider's CI verifies it |
| **Schema validation in tests** | E2E tests validate responses against the OpenAPI schema |

> 💬 "For the public partner API, a breaking change is the most expensive bug there is — it breaks
> someone else's production. So the OpenAPI spec is generated from code and diffed in CI, and removing or
> renaming a field fails the build."

### Interview questions

**Q: What is a contract test and why use it?**
> "It checks that the API still matches what its consumers rely on. Unit and integration tests only check
> my side, so a renamed field passes my tests and breaks a partner. Diffing the OpenAPI spec in CI, or
> consumer-driven contracts with Pact, catches that before release."

---

## 14. Load and performance testing

### What it answers

- How many requests per second can it handle?
- What is p95 latency at the expected load?
- **What breaks first** — and how does it fail?

### Types

| Type | Question |
|---|---|
| **Load test** | Does it handle the expected traffic? |
| **Stress test** | Where does it break when we push past that? |
| **Spike test** | What happens if traffic jumps 10× in a minute? |
| **Soak test** | Does it stay healthy for hours? (memory leaks, connection leaks) |

### Tools

**k6** ⭐ (JavaScript scripts — natural for a Node team), **Artillery**, **JMeter**, **Locust**.

```js
// k6
import http from 'k6/http';
export const options = { vus: 200, duration: '5m', thresholds: { http_req_duration: ['p(95)<300'] } };
export default () => http.get(`${__ENV.API}/clinics/9/slots?date=2026-09-22`, { headers: auth });
```

**Rules to say:**
- Test in a **production-like** environment with realistic data volume — an empty database is always fast.
- Watch the **database and the queue**, not just the API response time.
- Use **thresholds** so the test passes or fails on its own.
- Never load-test a third party you do not own — fake it.

### Interview questions

**Q: How would you load-test the booking API?**
> "With k6, against staging with production-like data. A load test at expected peak with a p95 threshold,
> then a spike test for a campaign, and a soak test for leaks. I watch database connections, CPU, queue
> depth and error rate — the API number alone does not tell me what will break."

### Scenarios

**S7. The app works fine in testing but falls over on launch day.**
> "It was never tested at real load, or with real data volume. Next time: a k6 load and spike test before
> launch against production-like data, watching the database and queue. For the incident now: find the
> first bottleneck — usually database connections or a slow query at scale — relieve it with caching, a
> connection pooler, and moving heavy work to a queue."

---

## 15. Flaky tests

**A flaky test** passes sometimes and fails sometimes, with no code change.

**Why it is dangerous:** people learn to click "re-run". Then a real failure gets re-run too, and the
test suite stops protecting anything.

### Common causes and fixes

| Cause | Fix |
|---|---|
| **Real time / timezones** | Freeze the clock; set `TZ=UTC` in CI |
| **Shared state / test order** | Independent data per test; clean up; random order |
| **Parallel tests on the same rows** | A unique tenant or ID per test |
| **Arbitrary `sleep`s** | Wait for a condition, not a fixed time (`findBy…`, polling helpers) |
| **Real network / third parties** | Fake them |
| **Race conditions in the code** | Sometimes the flaky test is right — the code really has a race ⭐ |
| **Random data without a seed** | Seed the random generator; log the seed on failure |
| **Resource limits in CI** | Timeouts too tight for slower CI machines |

### Policy that works

1. **Quarantine** a flaky test (skip it with a ticket) — do not leave it breaking every build.
2. **Fix within days**, or delete it. A quarantined test nobody fixes is a deleted test.
3. **Track flakiness** — many CI tools report tests that fail and then pass on retry.

⭐ Say this: "Before calling a test flaky, I check whether it found a real race condition."

### Interview questions

**Q: What causes flaky tests and how do you handle them?** → the table, the policy, and the
real-race-condition point.

### Scenarios

**S8. One test fails about once in ten CI runs. The team just re-runs it.**
> "That habit is more dangerous than the test. First I check whether it is exposing a real race — flaky
> tests sometimes are the only thing seeing a real bug. Then the usual suspects: time, shared data, test
> order, a `sleep`, or a real network call. I quarantine it with a ticket so it stops blocking the team,
> and fix it that week — or delete it. Re-running until green trains everyone to ignore red."

---

## 16. Coverage and mutation testing

### Coverage — what it does and does not tell you

| Type | Measures |
|---|---|
| **Line** | Which lines ran |
| **Branch** ⭐ | Whether both sides of each `if` ran — more useful than line |
| **Function** | Which functions were called |

**The key truth:** coverage shows what **ran**, not whether it was **checked**.
A test with no assertions can give 100% coverage.

> 💬 "Coverage is a useful map of what is *not* tested, but a poor target. 100% coverage with weak
> assertions is worthless. I would rather have 60% concentrated on money, auth and tenant isolation. If a
> team wants a number, I prefer a rule like 'coverage on changed code must not go down'."

⭐ **Goodhart's law:** when a measure becomes a target, it stops being a good measure.

### Mutation testing — testing your tests

A tool (**Stryker** for JS/TS) makes small changes to your code — `>` becomes `>=`, `true` becomes
`false` — and runs the tests.
- Tests **fail** → the mutant is "killed" → good, your tests noticed.
- Tests still **pass** → the mutant "survived" → your tests did not really check that logic.

It is slow, so use it on the critical modules, not the whole codebase.

### Interview questions

**Q: What coverage do you aim for?** → the quote. Never give a single magic number without the caveat.

**Q: What is mutation testing?**
> "It changes the code in small ways and checks that the tests fail. A surviving mutant shows logic that
> runs during tests but is never actually asserted. It measures test quality, not just test quantity."

### Scenarios

**S9. Management wants 90% coverage by next month.**
> "I would redirect the goal rather than refuse it. Chasing a number produces tests with weak assertions
> that make coverage go up and confidence stay flat. I would propose: high coverage and strong assertions
> on the risky modules — payments, auth, tenant isolation, booking — a rule that coverage on new code must
> not drop, and mutation testing on the critical modules to prove the tests actually check something."

---
---

# LEVEL 5 — CODE QUALITY

---

## 17. Clean code — the principles

### Naming and size

- **Names explain intent:** `isSlotAvailable`, not `check`; `appointmentsDueToday`, not `list2`.
- **Small functions that do one thing.** If you need "and" to describe it, split it.
- **Few parameters.** More than three → pass an object.
- **Early returns** instead of deep nesting.
- **Comments explain *why*, not *what*.** The code should say what.

### The principles to name

| Principle | Simple meaning |
|---|---|
| **DRY** — Don't Repeat Yourself | One piece of knowledge lives in one place |
| **KISS** — Keep It Simple | The simplest thing that works |
| **YAGNI** — You Aren't Gonna Need It | Do not build for imaginary future needs |
| **Separation of concerns** | Controller handles HTTP, service handles rules, repository handles data |
| **Composition over inheritance** | Combine small pieces instead of deep class trees |

⚠️ **DRY is about knowledge, not text.** Two pieces of code that *look* the same but change for
different reasons should stay separate. Merging them creates a wrong abstraction — and "a little
duplication is cheaper than the wrong abstraction".

### SOLID — one line each

| Letter | Principle | Plain meaning |
|---|---|---|
| **S** | Single Responsibility | One reason to change |
| **O** | Open/Closed | Add behaviour by adding code, not editing old code |
| **L** | Liskov Substitution | A subclass must work anywhere the parent works |
| **I** | Interface Segregation | Small, specific interfaces instead of one giant one |
| **D** | Dependency Inversion | Depend on abstractions; inject dependencies ⭐ — this is what Nest's DI gives you |

### Error handling quality

- Do not swallow errors (`catch {}` with nothing inside).
- Throw meaningful, typed errors — `ConflictException`, not `new Error('fail')`.
- Handle errors at the right layer — a global exception filter turns them into one API error shape.
- Log with context (request ID, tenant ID) — never secrets.

### Interview questions

**Q: What is clean code to you?**
> "Code the next person can understand and change safely. Clear names, small functions that do one thing,
> clear boundaries between layers, errors handled deliberately, and tests that explain the behaviour. The
> goal is not cleverness — it is making change cheap."

**Q: Explain SOLID.** → one line each, with Dependency Inversion tied to NestJS DI.

**Q: When is duplication OK?**
> "When two pieces look the same but change for different reasons. Forcing them into one abstraction
> couples things that should evolve separately. I remove duplication of *knowledge*, not of text."

---

## 18. Static analysis and automation

**Catch problems without running the code — automatically, every time.**

| Tool | What it catches |
|---|---|
| **TypeScript `strict`** ⭐ | Nulls, wrong types, missing cases — a whole category of tests you no longer write |
| **ESLint** | Bugs and bad patterns: floating promises, unused variables, `==` |
| **Prettier** | Formatting — so style is never discussed in code review |
| **Husky + lint-staged** | Run lint and format on changed files before each commit |
| **CI gates** | Lint, type-check and tests must pass before merge |
| **SonarQube / SonarCloud** | Code smells, duplication, complexity, security hotspots |
| **Dependabot / Renovate + `npm audit`** | Outdated and vulnerable dependencies |

⭐ **One ESLint rule worth naming:** `@typescript-eslint/no-floating-promises` — it catches a
forgotten `await`, which is one of the most common and silent Node bugs.

> 💬 "I let tools argue about style so humans can review logic. Prettier formats, ESLint catches bug
> patterns like floating promises, strict TypeScript removes a whole class of null bugs, and CI blocks
> the merge if any of it fails."

### Interview questions

**Q: How do you enforce code quality in a team?**
> "Automate everything that can be automated — Prettier, ESLint, strict TypeScript, tests — as a pre-commit
> hook and a required CI check. Then code review focuses on design, correctness and risk, not formatting."

---

## 19. Code review

### What to look for — in priority order

1. **Correctness** — does it do what it should? Edge cases? Error paths?
2. **Security** ⭐ — missing auth or permission check, **missing tenant scoping**, injection, secrets
   in code or logs.
3. **Data safety** — migrations backward compatible? Transactions where needed? Idempotent handlers?
4. **Performance** — N+1 queries, missing indexes, unbounded lists, work in a loop that should be a batch.
5. **Tests** — is the risky part tested? Would the test fail if the code were wrong?
6. **Readability** — names, structure, anything that needs a comment to understand.
7. **Style** — should already be handled by tools.

### How to give feedback well

- **Be kind and specific.** Talk about the code, not the person.
- **Ask, do not command:** "What happens if two requests arrive together here?"
- **Label importance:** `blocking:`, `suggestion:`, `nit:` — so the author knows what must change.
- **Praise good things** too.
- **Small PRs** get better reviews. A 2,000-line PR gets "LGTM".
- **Review promptly** — a PR waiting three days blocks a teammate.

### Receiving feedback

Do not take it personally, ask when unclear, and explain your reasoning when you disagree — then let the
better argument win.

### Interview questions

**Q: What do you look for in a code review?** → the priority list, with tenant scoping and N+1 named.

**Q: How do you handle disagreement in a code review?**
> "I explain my reasoning with specifics — a bug it would cause, a benchmark, a past incident — and listen
> to theirs. If it is a preference rather than a problem, I let it go. If we still disagree on something
> important, a quick call or a third opinion settles it faster than a long comment thread."

### Scenarios

**S10. You are reviewing a PR and find `findUnique({ where: { id } })` with no tenant check.**
> "That is a blocking comment — it is an IDOR: any user who guesses an ID can read another tenant's data.
> I would explain the risk, suggest scoping by tenant and returning 404, and ask for a test that proves
> cross-tenant access fails. Then I would raise the bigger point: this should not depend on reviewers
> spotting it — the data layer should apply the tenant filter automatically."

**S11. A teammate opens a 3,000-line pull request.**
> "A PR that size cannot be reviewed well — it will get a rubber stamp. I would ask to split it: the
> refactor separately from the behaviour change, the migration separately from the feature, maybe behind
> a feature flag so parts can merge early. If it truly cannot be split, I would ask for a walkthrough call
> and review the risky parts — data, auth, migrations — first."

---

## 20. Git workflow

### Branching

| Strategy | Meaning |
|---|---|
| **Feature branches + PRs** ⭐ | `feat/scheduled-calls`; small, reviewable, merged into `main` |
| **Trunk-based** | Very short-lived branches, merged daily, with feature flags |
| **Git Flow** | `develop`, `release`, `hotfix` branches — heavy, suits scheduled releases |

### Conventional commits and semantic versioning

```
feat: add scheduled calls endpoint
fix: prevent double booking on the last slot
chore: upgrade prisma
refactor: extract tenant resolver
```
They drive automatic changelogs and **semver**: `MAJOR.MINOR.PATCH` = breaking / feature / fix.

### Commands to be fluent with

| Command | Use |
|---|---|
| `git rebase -i` | Clean up your own commits before a PR |
| `git cherry-pick` | Take one commit onto another branch (hotfix) |
| `git revert` ⭐ | Undo a commit **with a new commit** — safe on shared branches |
| `git reset --hard` | Throw away commits — **only** on your own local work |
| `git bisect` ⭐ | Binary search through history to find the commit that introduced a bug |
| `git stash` | Park uncommitted work |
| `git reflog` | Recover "lost" commits after a bad reset or rebase |

### Merge vs rebase

| | **Merge** | **Rebase** |
|---|---|---|
| History | Keeps the real history, adds a merge commit | Linear, clean history |
| Rewrites commits? | No | **Yes** |
| Safe on shared branches? | ✅ Yes | ❌ Never rebase a branch others have pulled |

⭐ **The rule:** rebase your own local branch to tidy it; merge (or squash-merge) into shared branches.

### Interview questions

**Q: Merge vs rebase?** → the table and the rule.

**Q: `revert` vs `reset`?**
> "Revert creates a new commit that undoes an old one, so history stays intact — safe on shared branches.
> Reset moves the branch pointer and can throw commits away — fine for my own local work, dangerous on
> anything others have pulled."

**Q: How would you find which commit introduced a bug?**
> "`git bisect`. I mark a known good commit and a known bad one, and Git binary-searches between them. With
> a test that reproduces the bug, `git bisect run` finds the commit automatically."

### Scenarios

**S12. You force-pushed a rebased branch and a teammate's commits disappeared.**
> "Their commits are not really gone — `git reflog` on either machine can recover them. I would find the
> lost commits, restore them onto the branch, and push without force. Prevention: never rebase a branch
> others have pulled, use `--force-with-lease` instead of `--force` so a push fails if someone else pushed,
> and protect shared branches from force pushes."

**S13. A bad commit is already on `main` and deployed.**
> "`git revert` that commit — a new commit that undoes it — and deploy. I do not reset `main`, because
> everyone has already pulled it. If the commit included a migration, I check the old code still works on
> the new schema before reverting the code."

---

## 21. Refactoring and technical debt

### Refactoring

**Changing the structure of code without changing what it does.**

**The rule:** refactor **with tests around it**, in **small steps**, and **separately** from feature
changes — one PR for "restructure", one for "new behaviour". Mixing them makes both impossible to review.

Common refactors: extract function, rename, move logic from controller to service, replace a long
`if/else` chain with a lookup or strategy, remove dead code.

### Technical debt

**Taking a shortcut now that makes future change more expensive** — like a loan with interest.

| Kind | Example |
|---|---|
| **Deliberate** | "Ship with one server now, add a load balancer next quarter" — fine if written down |
| **Accidental** | Code written before we understood the problem |
| **Bit rot** | Old dependencies, dead code, outdated patterns |

**How to manage it — say these:**
1. **Make it visible** — a ticket with the cost of *not* fixing it.
2. **Pay it where you work** — the "boy scout rule": leave code a little better than you found it.
3. **Budget for it** — a regular share of each sprint, not a mythical "refactor month".
4. **Prioritise by pain** — fix debt in code that changes often; leave stable ugly code alone.

> 💬 "I treat tech debt like a loan — some is a good trade to ship faster, as long as it is written down
> with its interest. I pay it down where it hurts most: the code we change most often."

### Interview questions

**Q: How do you handle technical debt?** → the 4 points and the quote.

**Q: How do you refactor safely?**
> "Tests around the behaviour first, then small steps with tests green after each one, and never mixed
> with a behaviour change in the same PR. If there are no tests, I write characterisation tests that
> capture what the code does today before I touch it."

### Scenarios

**S14. You must change a 2,000-line legacy file with no tests.**
> "I would not start refactoring blind. First, characterisation tests — tests that record what the code
> does today, even the odd parts — around the area I am changing. Then small, safe refactors: extract the
> piece I need, test it, change it. I would not try to clean the whole file; I improve the part I touch
> and leave the rest better than I found it."

**S15. The product manager says there is no time for refactoring, ever.**
> "I would not ask for 'refactoring time' in the abstract. I would show the cost: 'this module caused 4 of
> our last 6 incidents and every change here takes 3 days instead of 1'. Then propose a small, specific fix
> attached to upcoming feature work, so it pays back immediately. Debt is easier to fund when it is
> described in business terms."

---
---

# WRAP-UP

---

## 22. Your honest position — maps to YOUR projects

| Area | What you test | The sentence to say |
|---|---|---|
| **Tenant isolation** | Cross-tenant read attempts return 404 | "Silent and catastrophic if broken, so it has an automated test, not a code-review promise" |
| **Auth & permissions** | Guards, roles, ownership checks | "Access-control regressions never announce themselves" |
| **Payments** | Webhook idempotency and signature checks | "The same event twice charges once; a bad signature is rejected" |
| **Booking** | Parallel bookings on the last slot | "Twenty parallel requests against a real database, exactly one wins" |
| **Queues** | Handlers run twice produce one result | "Every handler is idempotent, and the test proves it" |
| **Database** | Integration tests on real Postgres | "Mocking the ORM hides exactly the bugs I care about" |
| **Native Android** | Manual testing on real OEM devices | "The failures are device-specific; an emulator does not reproduce them" |
| **UI** | ⚠️ Not broad coverage | "I do not claim broad UI coverage — I prioritised by risk" |

**What you would add first (say this as a plan):**
1. **Contract tests** on the public partner API — OpenAPI diff in CI.
2. **Integration tests on every PR** against a seeded test database, not just locally.
3. **Detox** for the two critical app journeys.
4. **A regression test for every bug fixed** from now on.

⭐ The pattern that wins: **what I test → why → what I don't → what I'd add next.** Honest,
prioritised, and with a plan.

---

## 23. Rapid-fire — by level

### Basics
| Word | One line |
|---|---|
| **Unit test** | One piece in isolation |
| **Integration test** | Pieces together with real infrastructure |
| **E2E test** | A whole user journey |
| **Testing pyramid** | Many unit, some integration, few E2E |
| **Testing trophy** | Mostly integration tests |
| **Smoke test** | Is the deploy alive? |
| **Regression test** | The old bug stays fixed |
| **Contract test** | API still matches what clients expect |

### Writing tests
| Word | One line |
|---|---|
| **AAA** | Arrange, act, assert |
| **FIRST** | Fast, independent, repeatable, self-validating, timely |
| **`toBe` vs `toEqual`** | Same thing vs looks the same |
| **Fake timers** | Control time in tests |
| **Stub** | Returns canned answers |
| **Spy** | Records calls to a real function |
| **Mock** | A fake you assert against |
| **Fake** | A simpler working version |
| **Testcontainers** | Real database in Docker for tests |
| **Factory** | Builds test data with sensible defaults |

### Your stack
| Word | One line |
|---|---|
| **`Test.createTestingModule`** | Build a Nest module with fakes injected |
| **supertest** | Send real HTTP requests to the app in tests |
| **`Promise.allSettled`** | Fire parallel requests for a race-condition test |
| **nock / MSW** | Fake HTTP APIs in tests |
| **React Testing Library** | Test components the way users use them |
| **Detox** | E2E tests for React Native |
| **Golden set** | Fixed inputs to evaluate an LLM feature |

### Advanced
| Word | One line |
|---|---|
| **TDD** | Red → green → refactor |
| **BDD** | Given, when, then — in business language |
| **Pact** | Consumer-driven contract testing |
| **k6** | Load testing with JavaScript |
| **Load / stress / spike / soak** | Expected / breaking point / sudden jump / long duration |
| **Flaky test** | Passes and fails without code changes |
| **Quarantine** | Skip a flaky test with a ticket to fix it |
| **Branch coverage** | Both sides of every `if` ran |
| **Mutation testing** | Change the code, check the tests notice |
| **Goodhart's law** | A target stops being a good measure |

### Code quality
| Word | One line |
|---|---|
| **DRY / KISS / YAGNI** | No repeated knowledge / simple / not yet |
| **SOLID** | Five principles for maintainable classes |
| **Dependency inversion** | Depend on abstractions, inject dependencies |
| **ESLint / Prettier** | Bug patterns / formatting |
| **`no-floating-promises`** | Catches a forgotten `await` |
| **Husky** | Runs checks before commits |
| **Conventional commits** | `feat:`, `fix:`, `chore:` |
| **Semver** | MAJOR.MINOR.PATCH |
| **Revert vs reset** | Undo with a new commit vs move the pointer |
| **`git bisect`** | Find the commit that broke it |
| **`--force-with-lease`** | Safe force push |
| **Characterisation test** | Records what legacy code does today |
| **Tech debt** | A shortcut with interest |
| **Boy scout rule** | Leave code better than you found it |

---

## 24. Self-check

**Basics**
- [ ] Explain why you test, and why you do not test everything
- [ ] Draw the pyramid and explain the trophy
- [ ] Name 8 types of tests with one example each

**Writing tests**
- [ ] Write an AAA test with a sentence-style name
- [ ] Explain FIRST
- [ ] Explain stub, spy, mock and fake
- [ ] Say what you should NOT mock, and why

**Your stack**
- [ ] Write a Nest test that swaps a dependency
- [ ] Write the cross-tenant 404 test
- [ ] Write the 20-parallel-bookings concurrency test
- [ ] Write the webhook-twice idempotency test
- [ ] Explain how you test third-party failures
- [ ] Explain how you test an LLM feature

**Advanced**
- [ ] Explain TDD and when you use it
- [ ] Explain contract tests with the OpenAPI diff
- [ ] Explain load vs stress vs spike vs soak
- [ ] List 5 causes of flaky tests and your policy
- [ ] Explain why coverage is a poor target, and mutation testing

**Code quality**
- [ ] Explain DRY correctly (knowledge, not text) and SOLID in one line each
- [ ] List what you look for in a code review, in order
- [ ] Explain merge vs rebase and revert vs reset
- [ ] Explain how to refactor untested legacy code
- [ ] Deliver your honest testing position as a plan

---

## 25. Traps — how people lose this round

**Over-claiming**
1. **"We have good coverage"** with no specifics. Say what, why, and what not.
2. **Quoting a coverage percentage as proof of quality.**
3. **"We always do TDD"** — they will ask for an example.
4. **Claiming automated tests for native device behaviour** you tested manually.

**Testing mistakes**
5. **Mocking the database** and trusting the result.
6. **Testing implementation details**, so every refactor breaks tests.
7. **Forgetting `await`** — a test that can never fail.
8. **Tests that depend on each other** or on run order.
9. **Real clocks and real third-party calls** in tests.
10. **Only testing the happy path.**
11. **Test app configured differently from `main.ts`** — validation skipped in tests.
12. **Re-running flaky tests** until green instead of fixing them.
13. **Never having seen a test fail.**

**Code quality**
14. **Style debates in code review** — automate formatting.
15. **Huge PRs** that only get rubber-stamped.
16. **Rebasing a shared branch** or `reset --hard` on `main`.
17. **Merging refactoring and behaviour changes** in one PR.
18. **DRY taken too far** — the wrong abstraction.
19. **"Tech debt" described technically** instead of in business cost.

---

> **The one sentence to leave them with:** "I test by risk — the failures that are silent and expensive
> get automated tests against real infrastructure, and I am honest about where my coverage stops and what
> I would add next."
