# 17 — Python & FastAPI

> Easy English. Short lines. Say them out loud.
> **Time:** ~8 hours · **Pairs with:** [10 — Multi-Tenant](10-multi-tenant-saas.md), [07 — BullMQ](07-bullmq.md), [16 — Testing](16-testing-quality.md)
> ⚠️ **Read §0 first.** Your production work is TypeScript. The winning strategy is **translation**, not
> pretending — you already own the hard concepts (event loops, async, DI, typing, multi-tenancy).

---

## How this file is organised — basic → advanced

**Every topic:** explanation → deeper detail → **interview questions** → **scenarios**.

| Level | Topics | Time | You can answer… |
|---|---|---|---|
| **1. Python basics** | 1 Node → Python translation · 2 Data model & mutability · 3 Data structures · 4 Functions & scope | 1.5 h | "Mutable default argument? `is` vs `==`?" |
| **2. Intermediate Python** | 5 Decorators · 6 Classes · 7 Iterators & generators · 8 Exceptions & context managers · 9 Typing | 1.5 h | "Write a decorator. What is a generator?" |
| **3. Advanced Python** | 10 GIL, threads, processes, asyncio · 11 contextvars · 12 Memory & performance · 13 Tooling · 14 pytest | 1.5 h | "Explain the GIL. When threads vs processes vs asyncio?" |
| **4. FastAPI basics** | 15 NestJS → FastAPI · 16 App shape & routing · 17 Pydantic v2 · 18 Dependency injection · 19 `def` vs `async def` | 1.5 h | "How does `Depends` work? The #1 FastAPI bug?" |
| **5. FastAPI production** | 20 Auth · 21 Lifecycle, middleware, errors · 22 Multi-tenancy · 23 SQLAlchemy & Alembic · 24 Background work · 25 WebSockets & streaming · 26 Testing · 27 Deploying · 28 FastAPI vs alternatives | 2 h | "How would you port your NestJS app to FastAPI?" |
| **Wrap-up** | 29 Your position · 30 Rapid-fire · 31 Self-check · 32 Traps | 20 min | "How much Python do you have?" |

**If you only have 1 hour:** §0, §1, §2, §10, §15, §18, §19, §22.

---

## 0. ⚠️ How to position this in an interview

Be straight about it. The honest version is strong. The bluff is fatal.

> 💬 **"How much Python do you have?"**
>
> "My production experience is TypeScript — NestJS backends and React Native. I have written Python
> for tooling, and I have learned the backend stack properly, because the concepts transfer almost
> one-to-one.
>
> FastAPI's dependency injection is Nest's providers. Pydantic is `class-validator` plus DTOs.
> SQLAlchemy is Prisma. `contextvars` is `AsyncLocalStorage`. asyncio's event loop is Node's with
> different syntax.
>
> What I would need a couple of weeks for is the ecosystem's idioms and packaging — not the
> architecture. Where I would be useful on day one is the design: multi-tenancy, queues,
> idempotency, migrations."

**Never say** "Python and JavaScript are basically the same." The GIL, threading and the sync/async
split are exactly where they will probe — and this file prepares you for all three.

---
---

# LEVEL 1 — PYTHON BASICS

---

## 1. Node → Python translation table

| Node / TypeScript | Python | Note |
|---|---|---|
| `npm` / `package.json` | `pip` / `uv` / `poetry` + `pyproject.toml` | `uv` is the fast modern choice |
| `node_modules` | virtual environment (`.venv`) | Per-project isolation; **always** use one |
| `tsc` type check | `mypy` / `pyright` | Types are **never** enforced at runtime |
| `interface` / `type` | `TypedDict`, `Protocol`, `dataclass`, Pydantic model | |
| `undefined` / `null` | `None` | One null, not two |
| `Promise` | coroutine / `asyncio.Task` | ⚠️ Coroutines are **lazy** (§10) |
| `Promise.all` | `asyncio.gather` / `TaskGroup` | |
| `array.map/filter` | list comprehension | `[f(x) for x in xs if p(x)]` |
| `JSON.parse` / `stringify` | `json.loads` / `json.dumps` | |
| `try/catch/finally` | `try/except/else/finally` | Python adds `else` |
| `===` | `==` (value) / `is` (identity) | §2 |
| `this` | `self` — passed explicitly | |
| Jest | pytest | §14 |
| Express / NestJS | FastAPI | §15 |
| Prisma | SQLAlchemy 2.0 + Alembic | §23 |
| BullMQ | Celery / ARQ / Dramatiq | §24 |
| `class-validator` DTO | Pydantic model | §17 |
| **`AsyncLocalStorage`** ⭐ | **`contextvars.ContextVar`** | Your multi-tenancy story ports directly (§11) |
| `process.env` | `os.environ` / `pydantic-settings` | |
| ESLint + Prettier | **Ruff** (lint + format) | |

### Syntax differences that trip Node developers

- **Indentation is the syntax.** No `{}` blocks.
- `and`, `or`, `not` instead of `&&`, `||`, `!`.
- `True`, `False`, `None` are capitalised.
- **Truthy/falsy:** `[]`, `{}`, `""`, `0`, `None` are all false. (In JS `[]` is truthy!)
- `elif`, not `else if`.
- f-strings: `f"Hello {name}"` instead of `` `Hello ${name}` ``.
- Integer division: `7 // 2 == 3`; normal division `7 / 2 == 3.5`.
- **Integers never overflow** — Python ints grow as large as needed.

### Interview questions

**Q: How is Python different from JavaScript?**
> "Python is strongly typed at runtime — `'1' + 1` raises an error instead of coercing. It has one null,
> integers of any size, indentation as syntax, and a different concurrency story: a GIL, real threads
> and processes, and asyncio where coroutines are lazy. Types are optional hints checked by tools, not
> enforced when the code runs."

---

## 2. The data model — everything is an object

```python
x = 5
type(x)             # <class 'int'>
x.bit_length()      # 3 — even an int has methods
```

**Variables are labels, not boxes.** `a = b` makes two labels on the **same** object.

### Mutable vs immutable — the distinction that causes bugs

| Immutable (cannot change) | Mutable (can change in place) |
|---|---|
| `int`, `float`, `str`, `bool`, `tuple`, `frozenset`, `None` | `list`, `dict`, `set`, most objects |

```python
a = [1, 2]
b = a          # same list, two labels
b.append(3)
print(a)       # [1, 2, 3]  ← a changed too!

c = a.copy()   # shallow copy — a new outer list
import copy
d = copy.deepcopy(a)   # copies nested objects too
```

### ⚠️ The mutable default argument trap (guaranteed question)

```python
def add_item(item, items=[]):     # ❌ the list is created ONCE, when the function is defined
    items.append(item)
    return items

add_item(1)   # [1]
add_item(2)   # [1, 2]   ← surprise! the same list is reused

def add_item(item, items=None):   # ✅ the fix
    if items is None:
        items = []
    items.append(item)
    return items
```

**Why:** default values are evaluated **once, when `def` runs**, not on every call.

### `is` vs `==`

- `==` → **same value**? (calls `__eq__`)
- `is` → **same object** in memory?

```python
[1, 2] == [1, 2]    # True
[1, 2] is [1, 2]    # False — two different lists
x is None           # ✅ the correct way to check for None
```

⚠️ `256 is 256` is `True` but big numbers may not be — Python caches small integers (-5 to 256).
**Never use `is` to compare numbers or strings.** Only for `None`, `True`, `False`.

### Interview questions

**Q: What is the mutable default argument problem?** → the example and "evaluated once, at definition".

**Q: `is` vs `==`?**
> "`==` compares values, `is` compares identity — whether both names point to the same object. I use `is`
> only for singletons like `None`. Using it for numbers or strings sometimes works by accident, because
> of caching, and then breaks."

**Q: Mutable vs immutable — why does it matter?**
> "Immutable objects cannot change, so they are safe to share and can be dictionary keys. Mutable ones
> can change in place, so two names pointing at the same list both see the change — which causes bugs
> with shared defaults, and when passing lists into functions."

### Scenarios

**S1. A function that builds a list of tags keeps "remembering" tags from earlier requests.**
> "Classic mutable default argument — `def build(tags=[])`. The list is created once when the function is
> defined and shared by every call, so tags from one request leak into the next. In a web server that is
> also a data leak between users. Fix: default to `None` and create a new list inside. A linter like Ruff
> flags this pattern automatically."

---

## 3. Core data structures

| Type | Syntax | Ordered? | Mutable? | Lookup | Use |
|---|---|---|---|---|---|
| **list** | `[1, 2, 3]` | ✅ | ✅ | O(n) search | General sequence |
| **tuple** | `(1, 2)` | ✅ | ❌ | O(n) | Fixed records, dict keys, returning several values |
| **dict** | `{"a": 1}` | ✅ (insertion order) | ✅ | **O(1)** | Key → value |
| **set** | `{1, 2}` | ❌ | ✅ | **O(1)** membership | Uniqueness, fast "is it in?" |

⭐ **`x in my_list` is O(n); `x in my_set` is O(1).** Converting a list to a set before many lookups
is a classic performance fix.

### Useful standard-library tools

```python
from collections import defaultdict, Counter, deque, namedtuple

counts = Counter(["a", "b", "a"])          # {'a': 2, 'b': 1}
groups = defaultdict(list)                 # no KeyError for missing keys
groups["clinic-9"].append(appointment)
queue = deque()                            # O(1) append and pop from BOTH ends
queue.appendleft(x); queue.pop()
```

⚠️ `list.pop(0)` is O(n) — use `deque.popleft()` for queues.

### Comprehensions (you are expected to write these fluently)

```python
squares  = [x * x for x in range(10)]                     # list
evens    = [x for x in nums if x % 2 == 0]                # with a filter
by_id    = {u.id: u for u in users}                       # dict
unique   = {email.lower() for email in emails}            # set
total    = sum(a.amount for a in appointments)            # generator — no list built
```

Readable one-liners are good. A comprehension with three nested loops and conditions is not — use a
normal loop.

### Slicing and unpacking

```python
xs[1:4]      # items 1, 2, 3
xs[-1]       # last item
xs[::-1]     # reversed copy
first, *rest = [1, 2, 3]       # first = 1, rest = [2, 3]
a, b = b, a                    # swap
```

### Interview questions

**Q: List vs tuple?**
> "A list is mutable; a tuple is immutable. Tuples are for fixed records, can be dictionary keys, and are
> slightly lighter. Lists are for collections that change."

**Q: Why is a set lookup faster than a list lookup?**
> "A set is a hash table — it computes where the item would be and checks there, O(1). A list has to walk
> every element, O(n)."

---

## 4. Functions and scope

```python
def book(slot_id: str, *, notify: bool = True, **extra) -> dict:
    ...
```

| Syntax | Meaning |
|---|---|
| `*args` | Any number of extra **positional** arguments, as a tuple |
| `**kwargs` | Any number of extra **keyword** arguments, as a dict |
| `*` alone | Everything after it **must** be passed by name — clearer calls |
| `lambda x: x * 2` | A tiny one-expression function |

### Scope — LEGB

Python looks up a name in this order: **L**ocal → **E**nclosing → **G**lobal → **B**uilt-in.

```python
count = 0
def inc():
    global count        # needed to ASSIGN a global
    count += 1

def outer():
    n = 0
    def inner():
        nonlocal n      # needed to ASSIGN a variable from the enclosing function
        n += 1
    inner()
    return n
```

### Closures

A function that remembers variables from where it was created — same idea as JavaScript.

```python
def make_multiplier(k):
    def multiply(x):
        return x * k       # remembers k
    return multiply

double = make_multiplier(2)
double(5)   # 10
```

⚠️ **Late binding trap:** `[lambda: i for i in range(3)]` — all three return `2`, because `i` is
looked up when the lambda *runs*. Fix: `lambda i=i: i`.

### Interview questions

**Q: What are `*args` and `**kwargs`?**
> "`*args` collects extra positional arguments into a tuple; `**kwargs` collects extra named arguments into
> a dict. They are how decorators and wrappers pass everything through without knowing the signature."

**Q: Explain the LEGB rule.**
> "Python resolves a name by looking in the local scope, then any enclosing function, then the module's
> globals, then built-ins. To assign to an outer variable you need `nonlocal` or `global`."

---
---

# LEVEL 2 — INTERMEDIATE PYTHON

---

## 5. Decorators — Python's most-asked feature

### The simple idea

A decorator **wraps a function to add behaviour** — without changing the function itself.
Like putting a gift in wrapping paper: the gift is the same, the outside does something extra.

`@timer` above a function is just a short way to write `func = timer(func)`.

### Write one from memory

```python
import functools, time

def timer(func):
    @functools.wraps(func)                 # ⭐ keeps the original name and docstring
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            print(f"{func.__name__} took {time.perf_counter() - start:.3f}s")
    return wrapper

@timer
def build_report(clinic_id): ...
```

### A decorator that takes arguments — one more layer

```python
def retry(times: int = 3):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except ConnectionError:
                    if attempt == times:
                        raise
        return wrapper
    return decorator

@retry(times=5)
def call_whatsapp(): ...
```

### Async decorator

```python
def timer_async(func):
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        return await func(*args, **kwargs)
    return wrapper
```

⚠️ A normal decorator on an `async def` returns the coroutine without awaiting it — so timing or
try/except will not work. Async functions need an async wrapper.

**Built-in decorators you should know:** `@property`, `@staticmethod`, `@classmethod`,
`@functools.lru_cache`, `@functools.cache`, `@dataclass`.

**Where you see them:** FastAPI routes (`@app.get(...)`), pytest fixtures (`@pytest.fixture`),
Celery tasks (`@app.task`). ⭐ "Nest decorators are metadata that the framework reads; Python decorators
actually wrap and replace the function."

### Interview questions

**Q: What is a decorator? Write one.** → the timer example, explaining `functools.wraps`.

**Q: Why use `functools.wraps`?**
> "Without it, the wrapped function's name, docstring and signature become the wrapper's. That breaks
> logging, debugging and tools like FastAPI that read the signature."

**Q: How does a decorator with arguments work?**
> "It is a function that returns a decorator. `@retry(times=5)` first calls `retry(5)`, which returns the
> real decorator, which then wraps the function — so there are three nested levels."

---

## 6. Classes

```python
class Appointment:
    clinic_count = 0                          # class attribute — shared by all instances

    def __init__(self, id: str, status: str = "booked"):
        self.id = id                          # instance attribute
        self._status = status                 # "_" = private by convention only

    @property
    def status(self) -> str:                  # read like an attribute: apt.status
        return self._status

    @classmethod
    def from_row(cls, row: dict) -> "Appointment":   # alternative constructor
        return cls(row["id"], row["status"])

    @staticmethod
    def is_valid_status(s: str) -> bool:      # just a function kept in the class
        return s in {"booked", "cancelled"}

    def __repr__(self) -> str:                # how it prints when debugging
        return f"Appointment(id={self.id!r})"
```

| Kind | First argument | Use |
|---|---|---|
| Instance method | `self` | Works with one object |
| `@classmethod` | `cls` | Alternative constructors, works with the class |
| `@staticmethod` | none | A helper that just lives in the class |

⚠️ **Python has no real `private`.** `_name` means "please do not touch". `__name` triggers name
mangling, which only makes accidental access harder.

### Dunder ("magic") methods

| Method | Makes this work |
|---|---|
| `__init__` | Creating the object |
| `__repr__` / `__str__` | Debug print / user-friendly print |
| `__eq__`, `__hash__` | `==`, and use in sets/dict keys |
| `__len__`, `__getitem__`, `__iter__` | `len(x)`, `x[0]`, `for i in x` |
| `__enter__` / `__exit__` | `with x:` (§8) |
| `__call__` | Calling the object like a function |

⚠️ If you define `__eq__`, define `__hash__` too — or the object can no longer go in a set.

### Dataclasses — less boilerplate

```python
from dataclasses import dataclass, field

@dataclass(frozen=True)          # frozen = immutable and hashable
class Slot:
    doctor_id: str
    start: datetime
    tags: list[str] = field(default_factory=list)   # ⭐ safe mutable default
```
Gives you `__init__`, `__repr__` and `__eq__` for free.

### Inheritance and MRO

```python
class Base: ...
class Loggable(Base): ...
class Auditable(Base): ...
class Service(Loggable, Auditable): ...

Service.__mro__   # Service → Loggable → Auditable → Base → object
```

**MRO (Method Resolution Order)** is the order Python searches for a method with multiple
inheritance. `super()` follows the MRO, not simply "the parent".

**ABC and Protocol:** `abc.ABC` + `@abstractmethod` forces subclasses to implement a method.
`typing.Protocol` is **structural** — any class with the right methods fits, like a TypeScript interface.

### Interview questions

**Q: `@classmethod` vs `@staticmethod`?**
> "A classmethod receives the class, so it is used for alternative constructors and works correctly with
> subclasses. A staticmethod receives nothing — it is just a helper function grouped with the class."

**Q: What is a dataclass?**
> "A decorator that generates `__init__`, `__repr__` and `__eq__` from type-annotated fields. It removes
> boilerplate for classes that mainly hold data. For request validation I would use Pydantic instead,
> because a dataclass does not validate."

**Q: What is MRO?**
> "The order in which Python searches classes for a method when there is multiple inheritance. `super()`
> follows this order, which is why cooperative multiple inheritance works."

---

## 7. Iterators and generators

### Generator — a function that produces values lazily

```python
def read_rows(path):
    with open(path) as f:
        for line in f:
            yield parse(line)       # pause here, hand back one value

for row in read_rows("calls.csv"):  # one row in memory at a time
    process(row)
```

**Why:** a 5 GB file does not fit in memory. A generator gives one item at a time.

| | List | Generator |
|---|---|---|
| Memory | Everything at once | One item at a time |
| Reuse | Iterate many times | ⚠️ **Only once** — then empty |
| Syntax | `[x for x in xs]` | `(x for x in xs)` |

**Iterator protocol:** an object with `__iter__` and `__next__`; when finished, it raises
`StopIteration`. A `for` loop just calls `next()` until that happens.

**`yield from`** delegates to another generator. **`itertools`** has lazy tools: `islice`, `chain`,
`groupby`, `batched` (3.12+).

### Interview questions

**Q: What is a generator and when would you use one?**
> "A function with `yield` that produces values one at a time, pausing between them. I use it for large or
> endless data — reading a big file, streaming database rows, paginating an API — so memory stays flat."

### Scenarios

**S2. A nightly export job loads 3 million rows and gets killed for running out of memory.**
> "It builds one giant list. I change it to stream: fetch rows in batches or with a server-side cursor,
> yield them from a generator, and write each chunk to the output as it goes. Memory stays constant no
> matter how many rows. The same idea as streams in Node."

---

## 8. Exceptions and context managers

```python
try:
    result = charge(payment)
except TimeoutError:
    schedule_retry(payment)
except (ValueError, KeyError) as e:
    log.warning("bad payment data", exc_info=e)
    raise PaymentError("invalid payment") from e    # ⭐ keep the original cause
else:
    mark_paid(payment)          # runs only if NO exception happened
finally:
    release_lock(payment)       # always runs
```

**Rules:**
- Catch **specific** exceptions. Never a bare `except:` — it even catches Ctrl+C (`KeyboardInterrupt`).
- `raise ... from e` keeps the chain for debugging.
- Create your own exception classes for your domain: `class SlotTakenError(Exception): ...`
- **EAFP** — "easier to ask forgiveness than permission": try it and handle the error, instead of many
  `if` checks first. It is the Pythonic style.

### Context managers — `with`

**Guarantees cleanup**, even if an error happens. Like `try/finally`, but reusable.

```python
with open("report.pdf", "wb") as f:     # file is closed no matter what
    f.write(data)

with db.begin():                         # transaction committed, or rolled back on error
    ...
```

Write your own:

```python
from contextlib import contextmanager, asynccontextmanager

@contextmanager
def tenant_scope(tenant_id):
    token = current_tenant.set(tenant_id)
    try:
        yield
    finally:
        current_tenant.reset(token)      # ⭐ always restored

@asynccontextmanager
async def lifespan(app):                  # FastAPI startup/shutdown (§21)
    await db.connect()
    yield
    await db.disconnect()
```

### Interview questions

**Q: What does the `else` in `try/except/else` do?**
> "It runs only if no exception was raised. It keeps the 'success' code out of the `try`, so I do not
> accidentally catch exceptions from it."

**Q: What is a context manager?**
> "An object used with `with` that runs setup on entry and guaranteed cleanup on exit, even on error — files,
> locks, transactions, database sessions. I write them with `@contextmanager` and a `yield`."

---

## 9. Typing

**Type hints are optional and never enforced at runtime.** A checker (mypy, pyright) reads them.
Pydantic and FastAPI **do** use them at runtime to validate.

```python
from typing import Optional, Literal, TypedDict, Protocol, Callable, Any

def find(slot_id: str) -> Optional[Slot]: ...        # Slot or None
def find(slot_id: str) -> Slot | None: ...            # same, modern syntax (3.10+)

Status = Literal["booked", "cancelled", "completed"]  # like a TS string union

class SlotDict(TypedDict):                            # shape of a dict
    id: str
    start: str

class Notifier(Protocol):                             # structural — like a TS interface
    def send(self, to: str, msg: str) -> None: ...

Handler = Callable[[str, int], bool]                  # function type
```

**Generics:** `list[int]`, `dict[str, Slot]`; custom ones with `TypeVar`, or the new syntax
`def first[T](xs: list[T]) -> T:` (3.12+).

**`Any`** turns checking off — like `any` in TypeScript. Avoid it.

### Interview questions

**Q: Are Python type hints enforced?**
> "No — the interpreter ignores them. Tools like mypy or pyright check them before running, and libraries
> like Pydantic and FastAPI read them at runtime to validate data and generate docs. So in FastAPI they are
> effectively enforced at the API boundary."

**Q: `TypedDict` vs `dataclass` vs Pydantic model?**
> "A `TypedDict` only describes the shape of a plain dict for the type checker. A dataclass creates a real
> class with generated methods but no validation. A Pydantic model validates and converts data at runtime —
> the right choice for anything coming from outside, like request bodies."

---
---

# LEVEL 3 — ADVANCED PYTHON

---

## 10. ⭐ The GIL, threads, processes and asyncio

This is where they probe hardest. Know it well.

### The GIL — Global Interpreter Lock

**Simple picture:** a kitchen with many cooks but **one knife**. Only the cook holding the knife can
cut. Others can still wait for the oven (I/O) — but cutting (CPU work) happens one at a time.

- In standard Python (CPython), **only one thread runs Python code at a time**.
- The GIL is **released while waiting for I/O** — network, disk, database, sleep.
- So:
  - **I/O-bound work** (API calls, DB queries) → threads **do** help.
  - **CPU-bound work** (image processing, big calculations) → threads **do not** help. Use processes.

**Why does the GIL exist?** It makes memory management (reference counting) simple and safe, and keeps
single-threaded code and C extensions fast.

**Is it going away?** Python 3.13 added an optional **free-threaded build** (no GIL), still being
adopted. Normal CPython has the GIL. Mentioning this shows you are current.

### Choosing a concurrency model ⭐

| Model | Tool | Good for | Why |
|---|---|---|---|
| **asyncio** | `async/await` | **Many** I/O tasks — thousands of connections | One thread, very cheap tasks |
| **Threads** | `threading`, `ThreadPoolExecutor` | Some I/O, especially **blocking** libraries with no async version | GIL released during I/O |
| **Processes** | `multiprocessing`, `ProcessPoolExecutor` | **CPU-heavy** work | Each process has its own GIL → real parallelism |

> 💬 **The answer:** "I/O-bound and many connections — asyncio. I/O-bound with a blocking library — a
> thread pool. CPU-bound — processes, or better, a separate worker service. It is the same thinking as in
> Node: never do heavy CPU work on the event loop."

### asyncio basics

```python
import asyncio

async def fetch_slots(clinic_id: str) -> list[Slot]:
    await asyncio.sleep(0.1)          # non-blocking wait
    return [...]

async def main():
    # run concurrently — like Promise.all
    a, b = await asyncio.gather(fetch_slots("c1"), fetch_slots("c2"))

    # modern, safer version (3.11+): if one fails, the others are cancelled
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(fetch_slots("c1"))
        t2 = tg.create_task(fetch_slots("c2"))

    # a timeout
    async with asyncio.timeout(5):
        await call_llm()

asyncio.run(main())
```

### ⚠️ Difference from JavaScript #1 — coroutines are LAZY

```javascript
// JavaScript: the request starts IMMEDIATELY
const p = fetch(url);
```
```python
# Python: NOTHING runs yet — this just creates a coroutine object
c = fetch_slots("c1")
await c                              # now it runs
task = asyncio.create_task(c)        # or schedule it to start now
```

Forgetting `await` gives a warning: *"coroutine was never awaited"* — and the code silently did nothing.

### ⚠️ Difference #2 — blocking the loop is easier to do by accident

```python
async def handler():
    requests.get(url)          # ❌ blocking library — freezes EVERY request on this worker
    time.sleep(2)              # ❌ same

    await httpx.AsyncClient().get(url)          # ✅ async library
    await asyncio.sleep(2)                      # ✅
    await asyncio.to_thread(blocking_call)      # ✅ push a blocking call to a thread
```

In Node almost every library is async. In Python **many popular libraries are blocking**
(`requests`, old database drivers, many SDKs). One blocking call inside `async def` stops everything.

### Interview questions

**Q: What is the GIL?** → the knife picture, I/O vs CPU, and why it exists.

**Q: Threads vs processes vs asyncio — when?** → the table and the quote.

**Q: How is asyncio different from JavaScript's event loop?**
> "The model is the same — one thread, cooperative scheduling. Two differences matter: coroutines are lazy,
> so nothing runs until it is awaited or made into a task, and much of the Python ecosystem is blocking, so
> it is easy to freeze the loop with a normal library call. `asyncio.to_thread` is the escape hatch."

**Q: `gather` vs `TaskGroup`?**
> "Both run coroutines concurrently. `TaskGroup` is structured: if one task fails, the others are cancelled
> and all errors are reported together, so nothing is left running in the background."

### Scenarios

**S3. A FastAPI service handles 5 requests a second fine, but at 50 everything freezes.**
> "Something inside an `async def` is blocking the event loop — usually `requests`, a sync database driver,
> a sync SDK, or `time.sleep`. With one blocked call, every other request on that worker waits. I find it
> with the asyncio debug mode or a profiler, then switch to the async library, move the call to
> `asyncio.to_thread`, or declare the endpoint as plain `def` so FastAPI runs it in a thread pool (§19)."

**S4. Image resizing with threads is no faster than doing it one by one.**
> "Resizing is CPU work, and the GIL lets only one thread run Python code at a time, so threads cannot run
> it in parallel. Use a `ProcessPoolExecutor` so each process has its own interpreter — or, in a web app,
> move it to a background worker so it never touches the API processes."

---

## 11. `contextvars` — your `AsyncLocalStorage` ⭐

**The same idea as AsyncLocalStorage:** a value attached to the current request, visible anywhere deeper
in the code, never mixed with another request.

```python
from contextvars import ContextVar

current_tenant: ContextVar[str | None] = ContextVar("current_tenant", default=None)

# in middleware — set it for this request
token = current_tenant.set("clinic-9")
try:
    ...                                  # everything in this request sees clinic-9
finally:
    current_tenant.reset(token)          # ⭐ always restore

# anywhere deeper — no parameter passing
tenant = current_tenant.get()
```

**Why not a global variable?** One server handles many requests at once. A global would be overwritten
by the next request — a tenant data leak. Each asyncio task gets its **own copy** of the context.

⚠️ **Same trap as Node:** a background worker (Celery/ARQ) has **no request**, so the context is
empty. The tenant must travel in the job payload and be set again inside the task.

⚠️ **`threading.local` is not enough with asyncio** — many requests share one thread. Use `contextvars`.

### Interview questions

**Q: How would you carry the tenant ID through a FastAPI request?**
> "A `ContextVar`, set in a middleware or dependency from the verified token, and reset in a `finally`.
> It is the direct equivalent of AsyncLocalStorage in Node — each asyncio task has its own copy, so
> concurrent requests never see each other's tenant. Workers re-set it from the job payload."

---

## 12. Memory and performance

### How Python frees memory

1. **Reference counting** — each object counts how many names point to it; at zero it is freed
   immediately.
2. **Garbage collector** — finds **reference cycles** (A points to B, B points to A) that counting
   alone cannot free.

### Common performance wins

| Win | Why |
|---|---|
| Use a **set/dict** for lookups | O(1) instead of O(n) |
| **Generators** for big data | Constant memory |
| `"".join(parts)` for building strings | Not `+=` in a loop |
| **Built-ins and comprehensions** | Run in C — faster than manual loops |
| `functools.lru_cache` | Memoise pure functions |
| `__slots__` on classes with millions of instances | Less memory per object |
| **Profile first** — `cProfile`, `py-spy` | Measure, do not guess |
| Heavy maths → **NumPy / pandas** | Vectorised C code |

⭐ "Profile before optimising" is always the right first sentence.

### Interview questions

**Q: How does Python manage memory?**
> "Mostly reference counting — an object is freed as soon as nothing refers to it. A cyclic garbage
> collector handles reference cycles that counting cannot free. In long-running services, leaks usually
> come from caches or global lists that grow forever."

---

## 13. Tooling and packaging (know the names)

| Need | Tool |
|---|---|
| Isolated environment | `venv` / `.venv` — always, per project |
| Package + project manager | **`uv`** ⭐ (very fast, modern), `poetry`, `pip` + `requirements.txt` |
| Project config | `pyproject.toml` — like `package.json` |
| Lock file | `uv.lock` / `poetry.lock` — exact versions |
| Lint + format | **Ruff** ⭐ (replaces flake8, isort, and mostly black) |
| Type check | **mypy** / **pyright** |
| Tests | **pytest** |
| Python versions | `pyenv` or `uv python` |

⚠️ **Never `pip install` into the system Python.** Always a virtual environment — otherwise projects
break each other.

---

## 14. pytest

```python
import pytest

def test_rejects_taken_slot(booking_service, taken_slot):     # fixtures injected by name
    with pytest.raises(SlotTakenError):
        booking_service.book(taken_slot.id, patient_id="p1")

@pytest.fixture
def taken_slot(db):                        # fixtures can use other fixtures
    return SlotFactory(status="booked")

@pytest.mark.parametrize("status,ok", [("free", True), ("booked", False), ("blocked", False)])
def test_availability(status, ok):
    assert is_available(status) is ok

@pytest.mark.asyncio                       # with pytest-asyncio
async def test_fetch_slots():
    assert await fetch_slots("c1") == []
```

| pytest | Jest equivalent |
|---|---|
| Plain `assert` | `expect(...)` |
| **Fixtures** (dependency injection by argument name) | `beforeEach` + setup helpers |
| `yield` in a fixture | setup before, teardown after |
| Fixture `scope="session"` | `beforeAll` |
| `@pytest.mark.parametrize` | `it.each` |
| `monkeypatch` / `unittest.mock` | `jest.mock` / `jest.spyOn` |
| `conftest.py` | Shared setup file |

⭐ pytest fixtures are dependency injection — the same pattern as FastAPI's `Depends`.

### Interview questions

**Q: What are pytest fixtures?**
> "Reusable setup injected into a test by naming it as a parameter. A fixture can `yield` to run teardown
> after the test, can depend on other fixtures, and can be scoped to a function, module or whole session —
> for example one database container per session, a clean transaction per test."

---
---

# LEVEL 4 — FASTAPI BASICS

---

## 15. ⭐ NestJS → FastAPI translation (learn this first)

| NestJS | FastAPI | Note |
|---|---|---|
| `@Controller` + `@Get()` | `APIRouter` + `@router.get()` | |
| Module | Router, included with `app.include_router(...)` | No DI modules — simpler |
| Provider / `@Injectable` | A function or class used with **`Depends`** | §18 |
| DTO + `class-validator` | **Pydantic model** | Validates **and** converts types |
| `ValidationPipe` | Automatic — from the type hints | Errors become **422** automatically |
| Guard | A **dependency that raises** `HTTPException` | §18, §20 |
| Interceptor | Middleware, or a dependency with `yield` | §21 |
| Exception filter | `@app.exception_handler(...)` | §21 |
| `@nestjs/swagger` | **Built in** — `/docs` and `/redoc` for free | §17 |
| `OnModuleInit` / `OnModuleDestroy` | **`lifespan`** context manager | §21 |
| `AsyncLocalStorage` | `contextvars.ContextVar` | §11, §22 |
| Prisma + Prisma Migrate | SQLAlchemy 2.0 + Alembic | §23 |
| BullMQ | Celery / ARQ / Dramatiq | §24 |
| `@WebSocketGateway` | `@app.websocket(...)` | §25 |
| Jest + supertest | pytest + `TestClient` / `httpx.AsyncClient` | §26 |
| Express / Fastify underneath | **Starlette** underneath, served by **Uvicorn** | §27 |

> 💬 "FastAPI felt familiar because the ideas are the same as Nest: typed request models, dependency
> injection, generated OpenAPI docs. The difference is that it is lighter — no modules or decorators for
> DI; dependencies are just functions declared in the endpoint signature."

---

## 16. App shape and routing

```python
from fastapi import FastAPI, APIRouter, Path, Query, status

app = FastAPI(title="Clinic API", version="1.0.0")
router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(
    appointment_id: str = Path(...),                  # from the URL path
    include_patient: bool = Query(False),             # from ?include_patient=true
):
    ...

@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(body: AppointmentIn):   # a Pydantic model → from the JSON body
    ...

app.include_router(router, prefix="/v1")
```

### Where each parameter comes from — FastAPI reads the signature

| Declared as | Comes from |
|---|---|
| Name in the path `{appointment_id}` | Path |
| Simple type (`str`, `int`, `bool`) not in the path | Query string |
| A Pydantic model | JSON body |
| `Header()`, `Cookie()`, `Form()`, `File()` | Those sources |

⭐ **`response_model`** filters the output to exactly the declared fields — so an internal field (like a
password hash) is never returned by accident. That is the DTO rule from [12 §6](12-api-design.md).

### Interview questions

**Q: How does FastAPI know where a parameter comes from?**
> "From the function signature. Names in the path template are path parameters, simple types are query
> parameters, Pydantic models are the request body, and `Header`, `Cookie` or `File` mark the rest. It
> validates and converts each one, and returns 422 with details if something is wrong."

**Q: What does `response_model` do?**
> "It validates and filters what the endpoint returns, so only the declared fields go out, and it documents
> the response in OpenAPI. It stops internal fields from leaking just because they exist on the database
> object."

---

## 17. Pydantic v2 — the heart of FastAPI

### The simple idea

A Pydantic model is a **checked form**. Data comes in, Pydantic checks every field, converts types where
it safely can, and raises clear errors for anything wrong.

```python
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator, ConfigDict
from datetime import datetime

class AppointmentIn(BaseModel):
    model_config = ConfigDict(extra="forbid")          # ⭐ reject unknown fields

    slot_id: str
    patient_email: EmailStr
    notes: str | None = Field(default=None, max_length=500)
    starts_at: datetime

    @field_validator("starts_at")
    @classmethod
    def must_be_future(cls, v: datetime) -> datetime:
        if v <= datetime.now(v.tzinfo):
            raise ValueError("appointment must be in the future")
        return v

class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)    # ⭐ build from an ORM object
    id: str
    status: str
    starts_at: datetime
```

### The v2 methods you should know

| v2 | Old v1 name | Does |
|---|---|---|
| `Model.model_validate(data)` | `parse_obj` | Validate a dict / object |
| `obj.model_dump()` | `.dict()` | To a dict |
| `obj.model_dump_json()` | `.json()` | To a JSON string |
| `@field_validator` | `@validator` | Validate one field |
| `@model_validator` | `@root_validator` | Validate across fields (end date after start date) |
| `ConfigDict(from_attributes=True)` | `orm_mode = True` | Read from ORM objects |

**v1 → v2:** v2's core is written in **Rust**, so it is much faster. Most method names changed.

⭐ **`extra="forbid"`** protects against **mass assignment** — someone sending `"role": "admin"` gets a
validation error instead of the field silently being accepted ([11 §10](11-auth-and-security.md)).

⚠️ **Lax vs strict:** by default Pydantic converts `"5"` to `5`. Use `strict=True` on fields where
conversion would hide a client bug.

### Settings

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    database_url: str
    redis_url: str
    openai_api_key: str

settings = Settings()      # reads environment variables, validates, fails fast at startup
```

⭐ If a required variable is missing, the app **fails at startup** instead of crashing on the first
request. Say that.

### Interview questions

**Q: What does Pydantic do?**
> "It validates and converts data using type hints — request bodies, settings, anything from outside. It
> gives clear field-level errors, and FastAPI uses the models to generate the OpenAPI docs. v2 has a Rust
> core, so it is fast."

**Q: How do you stop a client setting fields they should not, like `role`?**
> "Separate input and output models, and `extra='forbid'` on the input model so unknown fields are
> rejected. The input model only contains fields the client is allowed to set."

---

## 18. ⭐ Dependency injection with `Depends`

### The simple idea

A **dependency** is a function FastAPI runs **before** your endpoint. Its result is passed in.
Like a receptionist who checks your ID and finds your file before you meet the doctor.

```python
from typing import Annotated
from fastapi import Depends, HTTPException, Header

async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session                    # ⭐ code after yield = cleanup, runs after the response

async def get_current_user(
    authorization: Annotated[str, Header()],
    db: Annotated[AsyncSession, Depends(get_db)],     # dependencies can use dependencies
) -> User:
    user = await verify_token(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

def require_role(role: str):                           # a dependency FACTORY
    async def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if role not in user.roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker

@router.delete("/{id}")
async def delete_appointment(
    id: str,
    user: Annotated[User, Depends(require_role("admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
): ...
```

### What to explain

1. **Guards are dependencies that raise.** No separate guard concept.
2. **`yield` dependencies** do setup and teardown — perfect for database sessions.
3. **Dependencies are cached per request** — `get_db` used three times in one request runs once.
4. **Router-level dependencies:** `APIRouter(dependencies=[Depends(get_current_user)])` protects every
   route in the router.
5. **Testing:** `app.dependency_overrides[get_db] = fake_db` swaps any dependency (§26).

> 💬 "In Nest, DI is a container of providers wired by modules. In FastAPI, dependencies are just functions
> declared in the endpoint signature, resolved per request and cached within it. Guards become
> dependencies that raise, and `yield` gives setup and teardown — which is exactly how I manage the
> database session."

### Interview questions

**Q: How does dependency injection work in FastAPI?** → the 5 points and the quote.

**Q: How do you share a database session per request?**
> "A `yield` dependency: it opens the session, yields it to the endpoint, and closes it after the response —
> even if there was an error. Because dependencies are cached per request, every function that asks for it
> gets the same session."

---

## 19. ⚠️ `def` vs `async def` — the #1 FastAPI bug

FastAPI treats them differently:

| You write | FastAPI runs it | Blocking code inside |
|---|---|---|
| `async def` | **On the event loop** | ❌ **Freezes every request** on that worker |
| `def` | **In a thread pool** | ✅ Fine — it blocks only its own thread |

### The rule

- Endpoint uses **async libraries** (`httpx.AsyncClient`, async SQLAlchemy, `asyncpg`) → **`async def`**.
- Endpoint uses **blocking libraries** (`requests`, sync SQLAlchemy, a sync SDK) → **plain `def`**.
- Mixed? Use `async def` and wrap the blocking part: `await asyncio.to_thread(sync_call)`.

```python
@app.get("/bad")
async def bad():
    return requests.get(URL).json()          # ❌ blocks the loop — the whole worker stalls

@app.get("/ok-sync")
def ok_sync():
    return requests.get(URL).json()          # ✅ runs in the thread pool

@app.get("/ok-async")
async def ok_async():
    async with httpx.AsyncClient() as c:     # ✅ truly async
        return (await c.get(URL)).json()
```

⚠️ The thread pool is limited (about 40 threads by default). Many slow `def` endpoints can exhaust it.
For high concurrency, go async end to end.

⭐ **Why this matters so much:** the bug does not show up in development with one user. It shows up in
production under load — everything becomes slow at once, with no errors.

### Interview questions

**Q: `def` or `async def` for a FastAPI endpoint?** → the table and the rule. This is the most
common FastAPI interview question.

### Scenarios

**S5. A new endpoint made the whole API slow — even endpoints that do not use it.**
> "Almost certainly an `async def` endpoint calling something blocking — `requests`, a sync database
> driver, `time.sleep`, or heavy CPU work. It holds the event loop, so every other request on that worker
> waits. Fix: switch to the async library, or make the endpoint plain `def` so it runs in the thread pool,
> or push the blocking part to `asyncio.to_thread`. CPU-heavy work goes to a background worker."

---
---

# LEVEL 5 — FASTAPI IN PRODUCTION

---

## 20. Auth

```python
from fastapi.security import OAuth2PasswordBearer
import jwt   # PyJWT

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")   # also adds the "Authorize" button in /docs

async def get_current_user(token: Annotated[str, Depends(oauth2)]) -> TokenUser:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret,
            algorithms=["HS256"],                 # ⭐ pin the algorithm — blocks "alg: none"
            audience="clinic-api",
        )
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token", headers={"WWW-Authenticate": "Bearer"})
    return TokenUser(id=payload["sub"], tenant_id=payload["tenant_id"], roles=payload["roles"])
```

**Passwords:** hash with **bcrypt** or **argon2** (`passlib` / `pwdlib` / `argon2-cffi`) — never plain
SHA-256 ([11 §2](11-auth-and-security.md)).

**The rules are the same as in Node:** short access tokens, refresh with rotation, tenant from the token
not the body, role **and** ownership checks, default deny.

### Interview questions

**Q: How do you implement JWT auth in FastAPI?**
> "A dependency using `OAuth2PasswordBearer` to read the bearer token, which decodes it with PyJWT with the
> algorithm and audience pinned, and returns the user or raises 401. Role checks are dependency factories
> that raise 403. I attach them at router level so new endpoints are protected by default."

---

## 21. Request lifecycle, middleware and errors

### The order a request goes through

```
Request
  → Middleware (outermost first: CORS, timing, request ID, tenant context)
  → Routing — find the endpoint
  → Dependencies resolved (auth, DB session, tenant) — may raise
  → Request body validated by Pydantic — may return 422
  → Endpoint runs
  → Response validated and filtered by response_model
  → Middleware (in reverse)
  → Response sent
  → Background tasks run
  → yield-dependency cleanup (close the DB session)
```

### Middleware

```python
@app.middleware("http")
async def request_id(request: Request, call_next):
    rid = request.headers.get("x-request-id") or uuid4().hex
    token = request_id_var.set(rid)
    try:
        response = await call_next(request)
    finally:
        request_id_var.reset(token)
    response.headers["x-request-id"] = rid
    return response
```

Built-in ones worth naming: `CORSMiddleware`, `GZipMiddleware`, `TrustedHostMiddleware`.

### Exception handlers — one error shape everywhere

```python
@app.exception_handler(SlotTakenError)
async def slot_taken(request: Request, exc: SlotTakenError):
    return JSONResponse(status_code=409, content={"code": "SLOT_TAKEN", "message": str(exc)})
```

Also override the default 422 handler if you want validation errors in your own error format
([12 §5](12-api-design.md)).

### Lifespan — startup and shutdown

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await create_redis()       # startup
    yield
    await app.state.redis.aclose()               # shutdown — graceful

app = FastAPI(lifespan=lifespan)
```

⚠️ `@app.on_event("startup")` is the old way and is deprecated — use `lifespan`.

### Interview questions

**Q: Walk me through the FastAPI request lifecycle.** → the list above.

**Q: Middleware or dependency — which do you use?**
> "Middleware for things that apply to every request and do not need route information — request IDs, CORS,
> timing, compression. Dependencies for things that are per-route, need typed data or should appear in the
> docs — auth, database session, permissions."

---

## 22. ⭐ Multi-tenancy in FastAPI — your story, ported

Same design as your NestJS systems ([10](10-multi-tenant-saas.md)), different syntax.

```python
current_tenant: ContextVar[str | None] = ContextVar("current_tenant", default=None)

async def tenant_context(user: Annotated[TokenUser, Depends(get_current_user)]):
    token = current_tenant.set(user.tenant_id)        # ⭐ from the verified token, never the body
    try:
        yield user.tenant_id
    finally:
        current_tenant.reset(token)

router = APIRouter(dependencies=[Depends(tenant_context)])   # every route is tenant-scoped
```

### Shared database (like Clinic Cloud) — automatic filtering

```python
@event.listens_for(Session, "do_orm_execute")
def add_tenant_filter(state):
    tenant = current_tenant.get()
    if tenant and state.is_select:
        state.statement = state.statement.options(
            with_loader_criteria(TenantScoped, lambda cls: cls.tenant_id == tenant, include_aliases=True)
        )
```

Every `select` on a tenant-scoped model gets `WHERE tenant_id = …` automatically — a forgotten filter is
a bug, not a breach. Postgres **Row Level Security** still works underneath as a second layer.

### Database per tenant (like Interview AI) — a session for the right database

```python
engines = LRUCache(maxsize=50)      # cachetools — ⭐ bounded; dispose engines when evicted

async def get_tenant_db(tenant_id: Annotated[str, Depends(tenant_context)]):
    engine = engines.get(tenant_id)
    if engine is None:
        engine = engines[tenant_id] = create_engine_for(tenant_id)   # URL from control-plane DB
    async with AsyncSession(engine) as session:
        yield session
```

### Workers

The tenant travels in the task payload and is set again inside the task — same rule as BullMQ.

> 💬 "Porting my multi-tenant design to FastAPI is mostly syntax: the tenant comes from the verified JWT
> in a dependency, lives in a `ContextVar` like AsyncLocalStorage, and either SQLAlchemy's loader criteria
> filter every query in the shared model, or the dependency hands out a session for that tenant's database
> from a bounded engine cache. Workers re-set the context from the job payload."

### Interview questions

**Q: How would you build multi-tenancy in FastAPI?** → the quote.

### Scenarios

**S6. After moving to async, some requests occasionally see another tenant's data.**
> "Something is holding tenant state outside the request context — a module-level variable, a
> `threading.local` (which is shared between requests on the same thread in asyncio), or a cached session
> reused across requests. Fix: tenant only in a `ContextVar`, set and reset per request; a new database
> session per request through a `yield` dependency; and a cross-tenant test that runs requests for two
> tenants concurrently."

---

## 23. SQLAlchemy 2.0 (async) + Alembic — the Prisma equivalent

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, selectinload
from sqlalchemy import select, update, ForeignKey, UniqueConstraint

engine = create_async_engine(settings.database_url, pool_size=10, max_overflow=5)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase): ...

class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (UniqueConstraint("slot_id"),)          # ⭐ one appointment per slot
    id: Mapped[str] = mapped_column(primary_key=True)
    tenant_id: Mapped[str] = mapped_column(index=True)
    slot_id: Mapped[str] = mapped_column(ForeignKey("slots.id"))
    status: Mapped[str]
    patient: Mapped["Patient"] = relationship()

# query — 2.0 style
rows = (await session.scalars(
    select(Appointment)
    .where(Appointment.status == "booked")
    .options(selectinload(Appointment.patient))              # ⭐ avoid N+1
)).all()
```

### ⚠️ The async N+1 trap

In sync SQLAlchemy, touching `appointment.patient` silently runs a query (lazy loading → N+1).
In **async** SQLAlchemy it **raises an error** (`MissingGreenlet`), because implicit I/O is not allowed.
**Fix:** load relationships explicitly with `selectinload` or `joinedload`.

### The double-booking answer, in SQLAlchemy

```python
async with session.begin():                                   # one transaction
    result = await session.execute(
        update(Slot)
        .where(Slot.id == slot_id, Slot.status == "free")     # ⭐ conditional update
        .values(status="booked")
    )
    if result.rowcount == 0:
        raise SlotTakenError()                                # the loser → 409
    session.add(Appointment(slot_id=slot_id, tenant_id=tenant, status="booked"))
```

Alternative: `select(Slot).where(...).with_for_update()` to lock the row first. The unique constraint
is the final guarantee either way.

### Alembic — Prisma Migrate for SQLAlchemy

```bash
alembic revision --autogenerate -m "add appointments"   # generate from model changes
alembic upgrade head                                     # apply (in CI/deploy, BEFORE new code)
alembic downgrade -1                                     # step back
```

⚠️ **Always read an autogenerated migration.** It can miss things (renames look like drop + add, which
**loses data**). Same expand-and-contract rules as always ([14 §13](14-cloud-devops.md)).

| Prisma | SQLAlchemy |
|---|---|
| `schema.prisma` | Python model classes |
| `prisma migrate dev` | `alembic revision --autogenerate` |
| `prisma migrate deploy` | `alembic upgrade head` |
| `include: { patient: true }` | `.options(selectinload(...))` |
| `$transaction` | `async with session.begin()` |

### Interview questions

**Q: How do you avoid N+1 queries in SQLAlchemy?** → explicit loading with `selectinload`/`joinedload`,
and "in async it raises instead of silently querying, which actually helps".

**Q: How do you prevent double booking in SQLAlchemy?** → the conditional update in a transaction, plus
the unique constraint.

**Q: What is Alembic and what do you watch for?**
> "SQLAlchemy's migration tool — like Prisma Migrate. I always review autogenerated migrations, because a
> rename is detected as a drop and an add, which would lose data. Migrations run before the new code and
> stay backward compatible."

---

## 24. Background work

| Option | What it is | Durable? | Use for |
|---|---|---|---|
| **`BackgroundTasks`** | Runs in the same process **after** the response | ❌ Lost if the process restarts | Tiny, non-critical work — a log line, a cache warm |
| **Celery** | Classic distributed task queue (Redis / RabbitMQ broker) | ✅ | Mature, retries, scheduling (Celery Beat), big ecosystem |
| **ARQ** | Async task queue on Redis | ✅ | Async-native apps — closest to BullMQ |
| **Dramatiq / RQ** | Simpler task queues | ✅ | Smaller setups |

```python
@router.post("/interviews/{id}/evaluate", status_code=202)
async def evaluate(id: str, tenant: Annotated[str, Depends(tenant_context)]):
    await arq_pool.enqueue_job("evaluate_interview", tenant_id=tenant, interview_id=id,
                               _job_id=f"eval:{id}")          # ⭐ dedupe, like BullMQ jobId
    return {"status": "queued"}
```

⚠️ **`BackgroundTasks` is not a queue.** No retries, no persistence, and it runs in the web process. An
LLM evaluation or an email that must be sent belongs in a real queue.

Everything from [07 — BullMQ](07-bullmq.md) still applies: idempotent handlers, retries with backoff,
tenant in the payload, send IDs not objects, monitor failures.

### Interview questions

**Q: `BackgroundTasks` or Celery?**
> "`BackgroundTasks` runs in the same process after the response — fine for small things you can afford to
> lose. Anything that must happen, needs retries or is slow — an LLM call, a payment follow-up, an email —
> goes to a real queue like Celery or ARQ."

### Scenarios

**S7. Confirmation emails sometimes never arrive after a deploy.**
> "They were sent with `BackgroundTasks`, which runs inside the web process. A deploy or restart killed the
> process before the task ran, and it was never persisted. Fix: a durable queue — Celery or ARQ — with
> retries and an idempotent handler, plus graceful shutdown so the web process finishes in-flight work."

---

## 25. WebSockets and streaming

```python
@app.websocket("/ws/calls")
async def calls_ws(ws: WebSocket, token: str = Query(...)):
    user = await verify_token(token)          # ⭐ authenticate at connect
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_json()
            await ws.send_json({"ack": msg["id"]})
    except WebSocketDisconnect:
        cleanup(user)

@app.get("/chat/stream")
async def stream(q: str):
    async def tokens():
        async for t in llm_stream(q):
            yield f"data: {t}\n\n"           # SSE format
    return StreamingResponse(tokens(), media_type="text/event-stream")
```

All the scaling rules from [09](09-realtime-websockets.md) still apply: Redis Pub/Sub to fan out across
workers, reconnect-and-reconcile, and tenant-scoped channels. FastAPI has no rooms built in — use a small
connection manager keyed by tenant, or Redis.

---

## 26. Testing FastAPI

```python
from fastapi.testclient import TestClient
import httpx, pytest

app.dependency_overrides[get_current_user] = lambda: TokenUser(id="u1", tenant_id="clinic-9", roles=["admin"])
app.dependency_overrides[get_db] = override_test_db           # ⭐ swap any dependency

def test_create_appointment():
    client = TestClient(app)
    r = client.post("/v1/appointments", json={...})
    assert r.status_code == 201

@pytest.mark.asyncio
async def test_async():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/v1/appointments")
        assert r.status_code == 200
```

⭐ `dependency_overrides` is the FastAPI version of Nest's `.overrideProvider()`.
Clear it after each test (`app.dependency_overrides.clear()`).

Same priorities as [16 — Testing](16-testing-quality.md): a real Postgres for data tests, the
cross-tenant 404 test, the parallel-booking test, webhook idempotency.

---

## 27. Running and deploying

| Word | Meaning |
|---|---|
| **ASGI** | The async server interface FastAPI uses (WSGI is the old sync one — Flask, classic Django) |
| **Uvicorn** | The ASGI server that runs the app |
| **Workers** | Separate processes; each has its own event loop and GIL |

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
# or: gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4
```

**How many workers?** Start around **one per CPU core** for async apps. More workers = more memory
and more database connections (workers × pool size).

⭐ **Why several workers?** One worker = one event loop on one core, and the GIL stops threads using more.
Multiple **processes** use all cores. In Kubernetes or ECS, often **one worker per container** and scale
containers instead.

**Docker:** a slim Python base image, `uv` or `pip install --no-cache-dir`, a non-root user, and the same
multi-stage idea as [14 §4](14-cloud-devops.md).

### Interview questions

**Q: How do you run FastAPI in production?**
> "Uvicorn as the ASGI server, with several worker processes — about one per core — behind Nginx or a load
> balancer. Each worker is a separate process with its own event loop, which is how a Python app uses
> multiple cores despite the GIL. I size database pools per worker, because connections multiply."

---

## 28. FastAPI vs the alternatives

| | **FastAPI** | **Django (+ DRF)** | **Flask** |
|---|---|---|---|
| Style | Modern, async, type-hint driven | "Batteries included" full framework | Minimal micro-framework |
| Async | ✅ Native | Partial, improving | Limited |
| Validation | Pydantic, automatic | Serializers | Add your own |
| Admin, ORM, auth built in | ❌ | ✅ **Admin panel**, ORM, auth | ❌ |
| Docs | OpenAPI **automatic** | Add-on | Add-on |
| Best for | APIs, ML/AI services, microservices | Full web products, admin-heavy apps | Small services, simple apps |

> 💬 "FastAPI for APIs and AI services — async, typed, automatic docs, and it maps directly to how I build
> with NestJS. Django when the product needs a lot built in — admin panel, ORM, auth — and speed of
> building CRUD matters more than async performance."

---
---

# WRAP-UP

---

## 29. Your position — maps to YOUR experience

| Area | Your Node experience | The Python sentence to say |
|---|---|---|
| **Multi-tenancy** | AsyncLocalStorage, shared DB and DB-per-tenant | "`ContextVar` from the verified token; loader criteria or a per-tenant session from an LRU engine cache" |
| **DI** | NestJS providers | "`Depends` — guards become dependencies that raise, `yield` for sessions" |
| **Validation** | class-validator DTOs | "Pydantic models with `extra='forbid'` and separate in/out models" |
| **ORM** | Prisma + migrations | "SQLAlchemy 2.0 async with explicit loading, Alembic migrations reviewed by hand" |
| **Queues** | BullMQ, idempotent workers | "ARQ or Celery, same rules: job ID dedupe, retries, tenant in the payload" |
| **Real-time** | Socket.IO + Redis adapter | "FastAPI WebSockets or SSE, fan-out through Redis Pub/Sub" |
| **AI** | RAG, LLM evaluation, voice | "Python is the native home for this — the same pipeline with the Python SDKs" |
| **Testing** | Jest + supertest | "pytest fixtures + `dependency_overrides` + `httpx.AsyncClient`" |

⭐ **The honest pitch:** "I know the architecture deeply from production. In Python I would need a short
ramp-up on the ecosystem's conventions, and I have already studied the parts that differ — the GIL, lazy
coroutines, and the `def` vs `async def` rule."

---

## 30. Rapid-fire

### Python
| Word | One line |
|---|---|
| **Mutable default** | Default created once at `def` — use `None` |
| **`is` vs `==`** | Same object vs same value |
| **Comprehension** | `[f(x) for x in xs if p(x)]` |
| **`*args` / `**kwargs`** | Extra positional / keyword arguments |
| **LEGB** | Local, enclosing, global, built-in |
| **Decorator** | Wraps a function to add behaviour |
| **`functools.wraps`** | Keeps the wrapped function's name and signature |
| **Dataclass** | Class with generated init/repr/eq |
| **MRO** | Method search order in multiple inheritance |
| **Generator** | `yield` — lazy, one item at a time, once |
| **Context manager** | `with` — guaranteed cleanup |
| **EAFP** | Try it and handle the error |
| **Type hints** | Not enforced at runtime; checked by mypy |
| **Protocol** | Structural type, like a TS interface |
| **GIL** | One thread runs Python code at a time |
| **I/O vs CPU bound** | Threads/asyncio help I/O; processes help CPU |
| **Lazy coroutine** | Does nothing until awaited |
| **`asyncio.to_thread`** | Run a blocking call off the loop |
| **TaskGroup** | Structured concurrency; failure cancels siblings |
| **ContextVar** | Per-request value — AsyncLocalStorage |
| **Reference counting** | Freed when nothing points to it |
| **uv / Ruff / mypy** | Packages / lint + format / type check |
| **pytest fixture** | Injected setup and teardown |

### FastAPI
| Word | One line |
|---|---|
| **Starlette / Uvicorn** | The toolkit underneath / the server |
| **ASGI vs WSGI** | Async vs sync server interface |
| **`response_model`** | Filters and documents the output |
| **Pydantic v2** | Validation and conversion, Rust core |
| **`extra='forbid'`** | Reject unknown fields (mass assignment) |
| **`model_validate` / `model_dump`** | In / out |
| **`from_attributes`** | Build a model from an ORM object |
| **pydantic-settings** | Validated config from env, fails at startup |
| **`Depends`** | Dependency injection by signature |
| **`yield` dependency** | Setup, then cleanup after the response |
| **`dependency_overrides`** | Swap dependencies in tests |
| **`def` vs `async def`** | Thread pool vs event loop |
| **lifespan** | Startup and shutdown |
| **Exception handler** | One error shape |
| **`selectinload`** | Avoid N+1 in SQLAlchemy |
| **`with_for_update`** | Row lock |
| **Alembic** | Migrations for SQLAlchemy |
| **`BackgroundTasks`** | After-response work, not durable |
| **Celery / ARQ** | Durable task queues |
| **Workers** | Processes — one event loop each |

---

## 31. Self-check

**Python**
- [ ] Give the honest "how much Python" answer from §0
- [ ] Explain and fix the mutable default argument
- [ ] Explain `is` vs `==` and when to use `is`
- [ ] Write a comprehension for list, dict and set
- [ ] Write a decorator with and without arguments, using `functools.wraps`
- [ ] Explain classmethod vs staticmethod, and what a dataclass gives you
- [ ] Explain a generator and when to use one
- [ ] Write a context manager with `@contextmanager`
- [ ] Explain the GIL with the kitchen example
- [ ] Choose asyncio vs threads vs processes for 3 cases
- [ ] Explain the two asyncio differences from JavaScript
- [ ] Explain `ContextVar` as AsyncLocalStorage

**FastAPI**
- [ ] Recite 10 rows of the NestJS → FastAPI table
- [ ] Explain where each parameter comes from
- [ ] Write a Pydantic model with a validator and `extra='forbid'`
- [ ] Write an auth dependency and a role-check factory
- [ ] Explain the `def` vs `async def` rule and its failure mode
- [ ] Recite the request lifecycle
- [ ] Explain multi-tenancy in FastAPI for both models
- [ ] Write the double-booking conditional update in SQLAlchemy
- [ ] Explain the async N+1 trap and the Alembic rename trap
- [ ] Say when to use `BackgroundTasks` vs a real queue
- [ ] Explain workers and the GIL in deployment
- [ ] Compare FastAPI, Django and Flask

---

## 32. Traps — how people lose this round

**Positioning**
1. **Bluffing Python production experience.** One question about the GIL exposes it.
2. **"Python and JavaScript are basically the same."**

**Python**
3. **Mutable default arguments.**
4. **`is` to compare numbers or strings.**
5. **Bare `except:`** — it catches Ctrl+C too.
6. **Threads for CPU-bound work.**
7. **Forgetting coroutines are lazy** — "coroutine was never awaited".
8. **`threading.local` for request state in async code.**
9. **Installing packages into the system Python.**
10. **Iterating a generator twice.**

**FastAPI**
11. **Blocking calls inside `async def`** — the #1 bug.
12. **One model for input and output** — leaks fields or allows mass assignment.
13. **`BackgroundTasks` for work that must happen.**
14. **Trusting Alembic autogenerate** without reading it.
15. **Lazy loading in async SQLAlchemy** — use `selectinload`.
16. **`@app.on_event`** instead of `lifespan`.
17. **Tenant in a module-level variable** instead of a `ContextVar`.
18. **Too many workers** — memory and database connections multiply.
19. **Forgetting `app.dependency_overrides.clear()`** between tests.

---

> **The one sentence to leave them with:** "The architecture I have built transfers directly — I would
> spend my ramp-up on Python's idioms, not on relearning how to build a reliable multi-tenant backend."
