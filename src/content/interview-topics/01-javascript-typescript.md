# 01 — JavaScript & TypeScript Core

> Easy English. Short lines. Say them out loud.
> **Time:** ~5 hours · **Pairs with:** [18/01 — JS logic questions](18-coding-round/01-js-logic.md) (the
> coding drills), [04 — Node & NestJS](04-nodejs-nestjs.md) (the event loop in depth)
> ⭐ This file is the **concepts round** — the "explain closures / `this` / generics" questions. For
> writing code, use the coding bank.

---

## How this file is organised — basic → advanced

**Every topic:** explanation → deeper detail → **interview questions** → **scenarios**.

| Level | Topics | Time | You can answer… |
|---|---|---|---|
| **1. JS fundamentals** | 1 Types & coercion · 2 `var`/`let`/`const`, hoisting · 3 **Scope & closures** · 4 **`this`** · 5 Copying & equality | 1.5 h | "What is a closure? What is `this` here?" |
| **2. JS deeper** | 6 **Prototypes** & classes · 7 Functions & modern syntax · 8 Array methods & immutability · 9 Modules · 10 Map/Set, iterators, generators | 1 h | "How does inheritance work in JS?" |
| **3. Async JS** | 11 Promises · 12 async/await & error handling · 13 Patterns you should know | 1 h | "Explain promise states. `Promise.all` vs `allSettled`?" |
| **4. TypeScript basics** | 14 Why TS · 15 Types vs interfaces · 16 `any`/`unknown`/`never` · 17 **Narrowing** · 18 **Generics** | 1 h | "`any` vs `unknown`? Write a generic function." |
| **5. TypeScript advanced** | 19 **Utility types** · 20 Mapped & conditional types · 21 `keyof`/`typeof`/`satisfies` · 22 Typing real APIs · 23 tsconfig & migration | 45 min | "Build `Omit` yourself. How do you type an API response?" |
| **Wrap-up** | 24 Your projects · 25 Rapid-fire · 26 Self-check · 27 Traps | 30 min | |

**If you only have 1 hour:** §0, §3, §4, §11, §16, §17, §19.

---

## 0. The 30-second answer

> 💬 **"How comfortable are you with JavaScript and TypeScript?"**
>
> "JavaScript is my main language — closures, the event loop, prototypes, async patterns. I write
> everything in **TypeScript with `strict` on**, because most of the bugs it catches are the ones that
> used to reach production: undefined values, wrong shapes, missed cases in a union.
>
> The way I use types is at the **edges**: validated DTOs for requests, typed API responses, and
> discriminated unions for state — so the compiler tells me when I forget to handle a case. Inside the
> code I let inference do the work rather than writing types everywhere."

---
---

# LEVEL 1 — JAVASCRIPT FUNDAMENTALS

---

## 1. Types and coercion

### The 8 types

| Primitive (7) | Object (1) |
|---|---|
| `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint` | everything else: objects, arrays, functions, dates |

**Primitives are copied by value. Objects are copied by reference.**
```js
let a = 1; let b = a; b++;            // a is still 1
let x = { n: 1 }; let y = x; y.n++;   // x.n is now 2 — same object
```

### `null` vs `undefined`

| | Meaning |
|---|---|
| **`undefined`** | The value was never set — a missing variable, parameter or property |
| **`null`** | Deliberately empty — "we know there is nothing here" |

⚠️ `typeof null === 'object'` — a famous old bug in the language.

### Coercion — the rules worth knowing

```js
'5' + 3      // '53'   — + with a string joins
'5' - 3      // 2      — other operators convert to number
[] + {}      // '[object Object]'
true + 1     // 2
null == undefined   // true   (special case)
null == 0           // false
'' == 0             // true
NaN === NaN         // false  → use Number.isNaN()
```

**The rule to say:** ⭐ "Use `===` always. `==` does type conversion with rules nobody remembers, and the
only place `==` is genuinely useful is `x == null`, which checks for `null` **or** `undefined` in one go."

### Truthy and falsy

**Falsy:** `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. **Everything else is truthy** —
including `[]` and `{}` (unlike Python).

```js
if (count) …            // ⚠️ skips when count is 0 — probably a bug
if (count != null) …    // ✅ "has a value"
value ?? 'default'      // only null/undefined fall through
value || 'default'      // ⚠️ also replaces 0 and ''
```

### Interview questions

**Q: `null` vs `undefined`?** → the table. "`undefined` is the language saying nothing is there; `null` is
me saying it."

**Q: `==` vs `===`?** → "`===` compares type and value; `==` converts first. I use `===` everywhere, and
`== null` only as a shorthand for null-or-undefined."

**Q: `??` vs `||`?** → "`||` falls back on any falsy value, so a `0` or an empty string is replaced. `??`
falls back only on `null` and `undefined`. For counts and text inputs, `??` is what you want."

---

## 2. `var`, `let`, `const` and hoisting

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function | **Block** | **Block** |
| Re-declare | ✅ | ❌ | ❌ |
| Re-assign | ✅ | ✅ | ❌ |
| Hoisted | Yes, as `undefined` | Yes, but in the **TDZ** | Same |

**Hoisting** = declarations are moved to the top of their scope before the code runs.
**TDZ (temporal dead zone)** = the period where a `let`/`const` exists but cannot be touched yet.

```js
console.log(a);   // undefined   — var is hoisted and initialised
var a = 5;

console.log(b);   // ReferenceError — let is hoisted but in the TDZ
let b = 5;
```

⚠️ **`const` does not freeze the object** — it stops re-assigning the name:
```js
const user = { name: 'A' };
user.name = 'B';     // ✅ allowed
user = {};           // ❌ TypeError
Object.freeze(user); // shallow freeze — nested objects are still mutable
```

**Function declarations are fully hoisted; function expressions are not:**
```js
foo();                          // ✅ works
function foo() {}
bar();                          // ❌ TypeError: bar is not a function
var bar = function () {};
```

### Interview questions

**Q: Explain hoisting and the TDZ.** → the code above.

**Q: Does `const` make an object immutable?** → "No — only the binding. Use `Object.freeze` for a shallow
freeze, or just avoid mutating."

---

## 3. ⭐ Scope and closures (the most asked JS concept)

### The simple idea

**A closure is a function that remembers the variables from where it was created**, even after that
outer function has finished.

```js
function makeCounter() {
  let count = 0;                       // private — nothing outside can touch it
  return {
    increment: () => ++count,
    get: () => count,
  };
}

const c1 = makeCounter();
const c2 = makeCounter();
c1.increment(); c1.increment(); c2.increment();
console.log(c1.get(), c2.get());       // 2  1  — separate memories
```

**Why it exists:** JavaScript keeps the variables alive as long as an inner function still refers to them.

### Where you actually use closures

| Use | Example |
|---|---|
| **Private state** | The counter above; a module's internal cache |
| **Function factories** | `makeMultiplier(2)` |
| **Callbacks that remember context** | `setTimeout(() => save(id), 1000)` |
| **`debounce` / `throttle` / `memoize`** ⭐ | The timer or cache lives in the closure ([18/02](18-coding-round/01-js-logic.md)) |
| **Module pattern** | Everything private except what you return |

### The loop trap

```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));   // 3 3 3
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j));   // 0 1 2
```
`var` has **one** variable for the whole loop; `let` creates a **new binding each turn**.

⚠️ **The cost:** a closure keeps its variables in memory. A closure over a huge object, stored in a
long-lived array or listener, is a classic **memory leak** ([04 §21](04-nodejs-nestjs.md)).

### Interview questions

**Q: What is a closure? Give a real use.** → the definition + counter + "debounce is a closure over the
timer".

**Q: Why does the `var` loop print 3 3 3?** → one shared variable vs a new binding per iteration.

**Q: Can a closure cause a memory leak?**
> "Yes — the variables it captures cannot be garbage collected while the function is reachable. A
> listener that closes over a big object and is never removed keeps it alive forever."

---

## 4. ⭐ `this` — the other most asked concept

**`this` depends on HOW a function is called, not where it is written.** (Except arrow functions.)

### The four rules, in order

| # | Call style | `this` is |
|---|---|---|
| 1 | `new Foo()` | The new object |
| 2 | `fn.call(obj)` / `apply` / `bind` | Whatever you passed |
| 3 | `obj.method()` | `obj` (the thing before the dot) |
| 4 | `fn()` alone | `undefined` in strict mode / modules; the global object otherwise |

```js
const clinic = {
  name: 'GoClinic',
  getName() { return this.name; },
};

clinic.getName();                 // 'GoClinic'   — rule 3
const fn = clinic.getName;
fn();                             // ❌ undefined / TypeError — rule 4, `this` was lost
fn.call(clinic);                  // 'GoClinic'   — rule 2
const bound = clinic.getName.bind(clinic);
bound();                          // 'GoClinic'   — bound forever
```

### Arrow functions have no `this`

An arrow function uses the `this` of **where it was written** (lexical). That is why it is the fix for
callbacks:

```js
class Timer {
  seconds = 0;
  startBroken() { setInterval(function () { this.seconds++; }, 1000); }  // ❌ wrong this
  startFixed()  { setInterval(() => { this.seconds++; }, 1000); }        // ✅ class instance
}
```
⚠️ **Do not** use an arrow function as an object method if you need `this` to be the object — it will not
be.

### `call` vs `apply` vs `bind`

| | Does |
|---|---|
| `call(obj, a, b)` | Calls now, arguments listed |
| `apply(obj, [a, b])` | Calls now, arguments as an array |
| `bind(obj)` | Returns a **new function** with `this` fixed — call it later |

### Interview questions

**Q: What is `this` in JavaScript?** → the 4 rules, then "arrow functions take it from the surrounding
scope".

**Q: Why does `this` become undefined when you pass a method as a callback?** → rule 4 — the object is
gone, only the function was passed. Fix with `bind` or an arrow.

**Q: `call` vs `apply` vs `bind`?** → the table.

---

## 5. Copying objects and comparing

```js
const original = { name: 'A', address: { city: 'Pune' } };

const shallow = { ...original };                 // top level copied, address is SHARED
shallow.address.city = 'Mumbai';                 // ⚠️ changes original too

const deep = structuredClone(original);          // ✅ real deep copy (modern, built in)
const jsonCopy = JSON.parse(JSON.stringify(original));   // ⚠️ loses Date, undefined, Map, functions
```

**Comparing:** objects compare by **reference**, never by content.
```js
{ a: 1 } === { a: 1 }      // false
const x = { a: 1 }; x === x // true
```
For content comparison you write a `deepEqual` ([18/01 Q31](18-coding-round/01-js-logic.md)) or use a library.

### Interview questions

**Q: How do you deep clone an object?** → `structuredClone` first; explain what the JSON trick loses;
mention circular references.

**Q: Why does `{a:1} === {a:1}` return false?** → two different objects in memory; `===` compares
references.

### Scenarios

**S1. Editing a form changed the original data in the list too.**
> "The state was copied with a spread, which is shallow, so the nested object is still the same
> reference. Editing the copy edited the original.
> Fix: copy the nested level too — `{ ...item, address: { ...item.address } }` — or `structuredClone`
> for deep data. In React this matters even more, because mutating existing state can also mean the UI
> does not re-render."

---
---

# LEVEL 2 — JAVASCRIPT DEEPER

---

## 6. Prototypes and classes

### The simple idea

**Every object has a hidden link to another object — its prototype.** If a property is not on the
object, JavaScript looks at the prototype, then *its* prototype, until it finds it or reaches `null`.
That chain is **prototypal inheritance**.

```js
const arr = [1, 2];
arr.map(...)          // map is not on arr — it is on Array.prototype
```

```js
function Doctor(name) { this.name = name; }
Doctor.prototype.greet = function () { return `Dr ${this.name}`; };   // shared by ALL instances

const d = new Doctor('Rao');
d.greet();                         // found on the prototype
Object.getPrototypeOf(d) === Doctor.prototype;   // true
```

⭐ **Why methods live on the prototype:** 10,000 instances share **one** copy of the function instead of
each carrying its own.

### Classes are prototypes with nicer syntax

```js
class Doctor {
  #license;                                   // real private field
  constructor(name) { this.name = name; }
  greet() { return `Dr ${this.name}`; }       // goes on Doctor.prototype
  static fromRow(row) { return new Doctor(row.name); }   // called on the class
}

class Surgeon extends Doctor {
  constructor(name, speciality) {
    super(name);                              // ⭐ must call super first
    this.speciality = speciality;
  }
  greet() { return `${super.greet()} (${this.speciality})`; }
}
```

**`class` is syntax sugar** — underneath it is still prototypes. Say that; it is the follow-up question.

### `__proto__` vs `prototype`

| | Meaning |
|---|---|
| `Foo.prototype` | The object that instances of `Foo` will inherit from |
| `obj.__proto__` / `Object.getPrototypeOf(obj)` | The actual link on this object |

### Interview questions

**Q: How does inheritance work in JavaScript?** → the prototype chain; classes are sugar over it.

**Q: Why put methods on the prototype?** → one shared function instead of one per instance.

**Q: Composition or inheritance?**
> "Composition by default. Deep class hierarchies get rigid — a change at the top breaks everything
> below. I use small functions and objects that are combined, and reach for inheritance only for a clear
> 'is-a' relationship."

---

## 7. Functions and modern syntax

```js
// default, rest, spread
function book(id, { notify = true, ...rest } = {}) {}
const merged = { ...defaults, ...options };          // later wins
const all = [...a, ...b];

// destructuring, with rename and default
const { name: doctorName, fee = 0 } = doctor;
const [first, ...others] = list;

// optional chaining and nullish
const city = patient?.address?.city ?? 'unknown';
patient.save?.();                                    // call only if it exists

// template literals
const msg = `Hi ${name}, you owe ₹${amount / 100}`;
```

| Arrow function | Normal function |
|---|---|
| No own `this` (lexical) | `this` depends on the call |
| No `arguments` object | Has `arguments` |
| Cannot be used with `new` | Can be a constructor |
| Implicit return: `x => x * 2` | Needs `return` |

⚠️ To return an object from an arrow, wrap it: `() => ({ ok: true })` — otherwise `{}` is read as a block.

### Interview questions

**Q: Arrow vs normal function?** → the table, with the `this` point first.

**Q: What is the spread operator used for?** → copying arrays/objects (shallow), merging, passing
arguments — and "rest is the same syntax collecting instead of spreading".

---

## 8. Array methods and immutability

| Method | Returns | Mutates? |
|---|---|---|
| `map`, `filter`, `slice`, `concat` | A **new** array | ❌ No |
| `reduce`, `find`, `some`, `every`, `includes` | A value | ❌ No |
| `push`, `pop`, `splice`, `sort`, `reverse` | Varies | ⚠️ **Yes** |
| `toSorted`, `toReversed`, `with` (new) | A new array | ❌ No |

```js
const sorted = [...items].sort((a, b) => a.fee - b.fee);   // ⭐ copy first — sort mutates
```

**`reduce` in one line:** walk the list, carry an accumulator, return the final value. Use it for sums,
grouping and building lookup objects — not for things a `map` or `filter` says more clearly.

**Immutability matters** because React and Redux compare by reference: mutating existing state often
means no re-render, and it makes changes hard to trace.

### Interview questions

**Q: Which array methods mutate?** → the table. "`sort` and `reverse` surprise people — always copy first."

**Q: `map` vs `forEach`?** → "`map` returns a new array and should be used for transforming; `forEach`
returns nothing and is for side effects. And `forEach` ignores `async` callbacks."

---

## 9. Modules

```js
// named exports — many per file
export const createApp = () => {};
import { createApp } from './app.js';

// default export — one per file
export default class Server {}
import Server from './server.js';

// re-export (a barrel file)
export * from './patients';
```

| | CommonJS (`require`) | ESM (`import`) |
|---|---|---|
| Loading | Synchronous, at runtime | Static, resolved before running |
| Conditional import | `if (x) require(...)` works | `await import(...)` for dynamic |
| Tree-shaking | Hard | ✅ Yes |
| In Node | Default in `.js` | `"type": "module"` or `.mjs` |

⭐ **Named vs default:** named exports rename badly by accident and are easier to auto-import and
tree-shake. Most teams prefer named exports, with default reserved for a single main thing.

### Interview questions

**Q: ESM vs CommonJS?** → the table ([04 §2](04-nodejs-nestjs.md) has more).

**Q: What is tree-shaking?** → "The bundler removes exports nobody imports. It needs static ESM imports —
it cannot do it with dynamic `require`."

---

## 10. Map, Set, iterators and generators

```js
const seen = new Set([1, 2, 2]);          // {1, 2} — unique
seen.has(2);                               // O(1)

const byId = new Map();                    // ⭐ keys of ANY type, remembers insertion order
byId.set(patient, 'note');                 // an object as a key — impossible with {}

const cache = new WeakMap();               // keys can be garbage collected — no memory leak
```

| | Object | Map |
|---|---|---|
| Keys | Strings and symbols only | **Anything** |
| Order | Mostly insertion (integers first) | Insertion order, guaranteed |
| Size | `Object.keys(o).length` | `map.size` |
| Best for | Records and JSON | Lookups, caches, dynamic keys |

**Generators** produce values lazily:
```js
function* idGenerator() {
  let id = 1;
  while (true) yield id++;          // pauses here each time
}
const ids = idGenerator();
ids.next().value;                   // 1
```
Use for streaming large data, paginating an API, and anywhere you do not want the whole list in memory.

### Interview questions

**Q: Object or Map?** → the table. "Map for a dictionary that changes, especially with non-string keys."

**Q: What is a WeakMap for?** → "Attaching data to an object without keeping that object alive — the entry
disappears when the object is garbage collected. Good for caches keyed by object."

---
---

# LEVEL 3 — ASYNC JAVASCRIPT

---

## 11. Promises

### The three states

```
pending  ──resolve──►  fulfilled
         ──reject───►  rejected        (settled = fulfilled or rejected, and it can never change again)
```

```js
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve('done'), 100);
});

p.then((v) => v.toUpperCase())       // returns a NEW promise
 .then(console.log)
 .catch(handleError)                 // catches anything above it
 .finally(cleanup);                  // always runs, does not change the value
```

⭐ **Chaining works because `then` returns a new promise**, resolved with whatever the callback returns —
and if that is a promise, it waits for it.

### The four combinators

| | Resolves when | Rejects when | Use |
|---|---|---|---|
| **`all`** | All succeed | ⚠️ **Any** fails (fail fast) | Load 3 things a page needs |
| **`allSettled`** | All finish | Never | Send 50 notifications; report results |
| **`race`** | First **settles** | First settles as a rejection | Timeouts |
| **`any`** | First **succeeds** | All fail (`AggregateError`) | First mirror that responds |

### Interview questions

**Q: What are the promise states?** → the diagram + "once settled, it never changes".

**Q: `Promise.all` vs `allSettled`?** → the table. "`all` is right when I need everything; `allSettled`
when partial success is acceptable and I want to know what failed."

---

## 12. async/await and error handling

```js
async function loadDashboard(clinicId) {
  try {
    const [stats, appointments] = await Promise.all([        // ⭐ parallel, not sequential
      getStats(clinicId),
      getAppointments(clinicId),
    ]);
    return { stats, appointments };
  } catch (err) {
    logger.error({ err, clinicId }, 'dashboard failed');
    throw new AppError('COULD_NOT_LOAD', { cause: err });    // ⭐ keep the original
  }
}
```

**Facts to say:**
- An `async` function **always returns a promise**.
- `await` pauses **that function**, not the thread — other work continues.
- `try/catch` around `await` catches rejections; a `.then` chain needs `.catch`.
- ⚠️ `forEach(async …)` does not wait — use `for...of` or `Promise.all`.
- An unhandled rejection crashes Node by default ([04 §5](04-nodejs-nestjs.md)).

### Sequential vs parallel — the most common review comment

```js
// ❌ 600 ms — each waits for the previous
const a = await getA();
const b = await getB();

// ✅ 300 ms — they run together
const [a, b] = await Promise.all([getA(), getB()]);
```
Only await in sequence when the second call **needs** the first result.

### Interview questions

**Q: Is `await` blocking?**
> "It pauses that function until the promise settles, but the thread is free — other requests and timers
> keep running. It only looks synchronous."

**Q: How do you handle errors in async code?** → `try/catch`, wrap with `cause`, never swallow, and one
central handler at the top ([04 §9](04-nodejs-nestjs.md)).

### Scenarios

**S2. A page that loads 5 independent things takes 3 seconds.**
> "Five sequential `await`s — each one waits for the previous, so the times add up. They are independent,
> so `Promise.all` makes it as slow as the slowest one instead of the sum.
> If one may fail without breaking the page, `allSettled` and render what arrived. And I would check
> whether the backend can return it in one call."

---

## 13. Async patterns worth naming

| Pattern | One line | Where |
|---|---|---|
| **Debounce** | Run after the user stops typing | Search boxes |
| **Throttle** | Run at most once every N ms | Scroll, resize |
| **Retry with backoff** | Try again, waiting longer each time | Flaky APIs |
| **Timeout** | `Promise.race` with a timer | Any external call |
| **Concurrency limit** | Only N at a time | Bulk API calls |
| **Abort** | `AbortController` cancels a request | The user typed again, or left the screen |
| **In-flight dedupe** | Share one promise for the same key | Ten components asking for the same data |

All of these are written out with code in
[18/01 — JS logic](18-coding-round/01-js-logic.md) and [18/04 — basic tasks](18-coding-round/04-basic-tasks.md).

⭐ Naming these confidently signals production experience — they are the difference between "I can call an
API" and "I have shipped an app that calls flaky APIs".

---
---

# LEVEL 4 — TYPESCRIPT BASICS

---

## 14. Why TypeScript

**TypeScript is JavaScript plus types, checked before the code runs.** The types disappear at build time
— the browser and Node only ever see JavaScript.

| What it gives you | Example |
|---|---|
| Catch bugs early | `patient.naem` fails to compile instead of returning `undefined` at 2 AM |
| Real autocomplete | The editor knows every field and method |
| Safe refactoring | Rename a field and every use is flagged |
| Documentation | The signature says what goes in and what comes out |

⚠️ **Types are not checked at runtime.** Data from an API, a request body or `JSON.parse` is only
*claimed* to be that type. That is why validation at the edges (Zod, class-validator) still matters —
⭐ a very good thing to say.

### Interview questions

**Q: What does TypeScript give you over JavaScript?** → the table + "and none of it exists at runtime".

**Q: If the API returns something different from your type, what happens?**
> "Nothing stops it — the type was only a promise. The compiler believed me. That is why I validate at
> the boundary with Zod or a DTO, and derive the type from the schema so validation and type stay in
> sync."

---

## 15. Types vs interfaces, unions and literals

```ts
type Status = 'booked' | 'completed' | 'cancelled';      // literal union — better than an enum
type Id = string | number;                                // union
type WithTimestamps = { createdAt: Date; updatedAt: Date };

interface Patient {
  id: string;
  name: string;
  phone?: string;                  // optional
  readonly clinicId: string;       // cannot be reassigned
}

interface Doctor extends Patient {}                       // interfaces extend
type Staff = Patient & WithTimestamps;                    // types intersect with &
```

| | `interface` | `type` |
|---|---|---|
| Objects | ✅ | ✅ |
| Unions, tuples, primitives | ❌ | ✅ |
| Extends | `extends` | `&` |
| **Declaration merging** | ✅ (two declarations combine) | ❌ |

**Which to use:** ⭐ "Either is fine — I use `interface` for object shapes that might be extended, and
`type` for unions, tuples and anything computed. The important thing is being consistent."

### Enums — and why a union is usually better

```ts
enum Status { Booked = 'booked', Cancelled = 'cancelled' }   // generates real JS code

type Status = 'booked' | 'cancelled';                        // ⭐ zero runtime cost
const STATUS = { booked: 'booked', cancelled: 'cancelled' } as const;
type Status2 = typeof STATUS[keyof typeof STATUS];
```
Numeric enums are also loose — `Status.Booked = 5` type-checks against any number in older versions.
Most modern codebases prefer the literal union.

### Interview questions

**Q: `type` or `interface`?** → the table + "consistent, and unions need `type`".

**Q: Why avoid enums?** → "They emit runtime code, numeric enums are not fully type-safe, and a literal
union does the same job with nothing generated. `as const` objects cover the cases where I need values."

---

## 16. `any`, `unknown`, `never` — and strict mode

| Type | Meaning | Use |
|---|---|---|
| **`any`** | Turn checking **off** | ⚠️ Almost never — one `any` spreads through the code |
| **`unknown`** ⭐ | "I do not know yet" — you must narrow before using it | API responses, `catch` values, `JSON.parse` |
| **`never`** | This cannot happen | Exhaustive checks, functions that always throw |
| **`void`** | Returns nothing | Callbacks |

```ts
function parse(json: string): unknown {
  return JSON.parse(json);                  // honest — we do not know the shape
}

const data = parse(body);
// data.name                                // ❌ compile error — good
if (isPatient(data)) data.name;             // ✅ after narrowing

try { … } catch (err) {                     // err is `unknown` under strict settings
  const message = err instanceof Error ? err.message : String(err);
}
```

**`strict: true` is the setting that matters.** It turns on `strictNullChecks` (so `string` cannot be
`null`), `noImplicitAny`, and more. ⭐ Most of the value of TypeScript comes from that one flag.

### Interview questions

**Q: `any` vs `unknown`?**
> "`any` switches off checking and spreads silently. `unknown` says the value exists but its shape is not
> known yet — I must narrow it first. For anything crossing a boundary, `unknown` plus validation is the
> safe pattern."

**Q: What does `strict` turn on and why do you use it?** → strict null checks and no implicit `any`;
"null and undefined bugs are most of what TypeScript actually prevents".

---

## 17. ⭐ Narrowing and type guards

TypeScript follows your `if` statements and narrows the type as it goes.

```ts
function describe(value: string | number | null) {
  if (value === null) return 'nothing';       // value: null
  if (typeof value === 'string') return value.toUpperCase();   // value: string
  return value.toFixed(2);                    // value: number
}
```

| Technique | Example |
|---|---|
| `typeof` | primitives |
| `instanceof` | classes, `Error` |
| `in` | `if ('phone' in contact)` |
| Truthiness | `if (patient)` |
| **Discriminated union** ⭐ | a shared literal field like `type` |
| **Custom type guard** | `function isPatient(x: unknown): x is Patient` |

### Discriminated unions + exhaustive checks — the best pattern in TypeScript

```ts
type Event =
  | { type: 'booked'; slotId: string }
  | { type: 'cancelled'; reason: string }
  | { type: 'paid'; amountPaise: number };

function handle(e: Event): string {
  switch (e.type) {
    case 'booked':    return `Booked ${e.slotId}`;       // only this branch has slotId
    case 'cancelled': return `Cancelled: ${e.reason}`;
    case 'paid':      return `Paid ₹${e.amountPaise / 100}`;
    default: {
      const exhaustive: never = e;                        // ⭐ add a new event type → compile error here
      return exhaustive;
    }
  }
}
```

⭐ **Why this is the answer to give:** add a fourth event and the compiler shows **every** place that
forgot to handle it. That is a whole class of bugs the language prevents for you.

**Custom type guard:**
```ts
function isApiError(x: unknown): x is { code: string; message: string } {
  return typeof x === 'object' && x !== null && 'code' in x && 'message' in x;
}
```

### Interview questions

**Q: What is a discriminated union and why is it useful?** → the example + the `never` exhaustive check.

**Q: What is a type guard?** → "A function returning `x is T`. After it returns true, TypeScript treats
the value as that type in that branch."

### Scenarios

**S3. A new order status was added and three screens silently broke.**
> "The status was a plain `string`, so nothing forced anyone to handle the new case.
> Fix: make it a literal union and use a `switch` with a `never` check in the default. Adding a status
> then fails the build in every place that does not handle it — the compiler becomes the checklist
> instead of a human."

---

## 18. ⭐ Generics

### The idea

**A generic is a type parameter — a placeholder filled in at the call site.** It keeps the connection
between input and output instead of falling back to `any`.

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

first([1, 2, 3]);          // number | undefined
first(['a']);              // string | undefined
```

### Constraints and defaults

```ts
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

pluck(patients, 'name');    // string[] — and 'naem' is a compile error ⭐

interface Paginated<T = unknown> {          // default type parameter
  data: T[];
  total: number;
  nextCursor?: string;
}

type PatientPage = Paginated<Patient>;
```

### Generics in real code

```ts
// a typed API helper — the caller decides the response type
async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;           // ⚠️ still a promise, not proof — validate if it matters
}

const patients = await apiGet<Patient[]>('/patients');
```

**Where you meet them daily:** `Array<T>`, `Promise<T>`, `Record<K, V>`, `Map<K, V>`, React's
`useState<T>`, and repository classes like `Repository<Patient>`.

### Interview questions

**Q: What are generics and why use them?**
> "A type parameter, so a function or class works with many types **without losing type information**.
> `first<T>(items: T[]): T` keeps the element type, where returning `any` would throw it away."

**Q: What does `K extends keyof T` mean?**
> "K must be one of T's property names. It is how a `pluck` or `pick` helper only accepts real keys and
> returns the right value type — a typo becomes a compile error."

---
---

# LEVEL 5 — TYPESCRIPT ADVANCED

---

## 19. ⭐ Utility types (know these by heart)

```ts
interface Patient { id: string; name: string; phone: string; clinicId: string }

Partial<Patient>              // all optional            → update DTOs
Required<Patient>             // all required
Readonly<Patient>             // nothing can be reassigned
Pick<Patient, 'id' | 'name'>  // only those fields       → a list response
Omit<Patient, 'clinicId'>     // everything except       → a public response
Record<string, Patient>       // a lookup object
Exclude<Status, 'cancelled'>  // remove from a union
Extract<Status, 'booked'>     // keep only these
NonNullable<string | null>    // string
ReturnType<typeof createUser> // the return type of a function
Parameters<typeof createUser> // its parameters as a tuple
Awaited<Promise<Patient>>     // Patient — unwraps promises
```

**Build them yourself** (a very common exercise):
```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyOmit<T, K extends keyof any> = MyPick<T, Exclude<keyof T, K>>;
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
```

### Interview questions

**Q: Name some utility types and when you use them.** → `Partial` for update DTOs, `Omit` for public
responses, `Pick` for list views, `Record` for lookups, `ReturnType` to avoid duplicating a type.

**Q: Write `Omit` yourself.** → the code above; explain `keyof`, mapped types and `Exclude`.

---

## 20. Mapped and conditional types

```ts
// MAPPED — transform every property
type Nullable<T> = { [K in keyof T]: T[K] | null };
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
// Getters<Patient> → { getId(): string; getName(): string; ... }

// CONDITIONAL — a type that chooses
type IsArray<T> = T extends any[] ? 'array' : 'not array';
type Unwrap<T> = T extends Promise<infer U> ? U : T;      // ⭐ infer captures the inner type

// DEEP — recursion
type DeepReadonly<T> = { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K] };
```

**The three words to say:** **mapped types** (`[K in keyof T]`), **conditional types**
(`T extends X ? A : B`), and **`infer`** (capture a type from inside another).

⚠️ **Do not over-engineer.** A clever 20-line type that nobody can read is worse than a plain interface.
Say that — it shows judgement.

### Interview questions

**Q: What is `infer`?** → "It captures a type inside a conditional type — for example pulling `U` out of
`Promise<U>`. `ReturnType` and `Awaited` are built on it."

---

## 21. `keyof`, `typeof`, `as const` and `satisfies`

```ts
const ROLES = ['admin', 'doctor', 'reception'] as const;   // ⭐ readonly tuple of literals
type Role = typeof ROLES[number];                          // 'admin' | 'doctor' | 'reception'

type PatientKey = keyof Patient;                           // 'id' | 'name' | 'phone' | 'clinicId'

const config = {
  retries: 3,
  mode: 'production',
} satisfies Record<string, string | number>;               // ⭐ checked, but keeps the literal types
// config.mode is 'production', not string
```

| Keyword | Does |
|---|---|
| `keyof T` | The union of T's property names |
| `typeof value` | The **type** of a runtime value |
| `as const` | Freeze to literal types instead of widening to `string` |
| `satisfies` | Check a value against a type **without** losing its specific type |
| `as` | A cast — ⚠️ you are telling the compiler to trust you |

⚠️ **`as` is not a conversion.** `data as Patient` does not check anything at runtime; it only silences
the compiler. Use validation instead where the data comes from outside.

---

## 22. Typing real API work ⭐

```ts
import { z } from 'zod';

const PatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().regex(/^\d{10}$/),
  createdAt: z.coerce.date(),
});

type Patient = z.infer<typeof PatientSchema>;        // ⭐ the type comes FROM the schema

export async function getPatient(id: string): Promise<Patient> {
  const res = await fetch(`/api/patients/${id}`);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return PatientSchema.parse(await res.json());      // ✅ validated at runtime AND typed
}
```

⭐ **The point to make:** "One schema gives me both the runtime validation and the static type, so they
can never drift apart. Writing an `interface` and hoping the API matches is exactly the gap TypeScript
does not cover."

**Other real patterns:**
```ts
type ApiResult<T> =                                   // discriminated union for results
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type CreatePatientDto = Omit<Patient, 'id' | 'createdAt'>;     // input from output
type UpdatePatientDto = Partial<CreatePatientDto>;             // everything optional
```

### Interview questions

**Q: How do you type API responses safely?** → the Zod answer, with `z.infer`.

**Q: How do you avoid writing the same shape three times?** → derive: `Omit` for the create DTO,
`Partial` for the update DTO, and `z.infer` for the entity.

---

## 23. tsconfig and migrating JavaScript to TypeScript

```jsonc
{
  "compilerOptions": {
    "strict": true,                       // ⭐ the one that matters
    "target": "ES2022",
    "module": "NodeNext",
    "noUncheckedIndexedAccess": true,     // arr[0] is T | undefined — catches real bugs
    "noUnusedLocals": true,
    "skipLibCheck": true,                 // faster builds; skips checking .d.ts files
    "outDir": "dist"
  }
}
```

**Migrating an existing JavaScript project — the order:**
1. `allowJs: true`, add TypeScript alongside; nothing breaks.
2. Rename files to `.ts` **one folder at a time**, starting with the leaves (utils, types).
3. Add types at the **boundaries** first — API responses, database models, function signatures.
4. Use `unknown` and `// @ts-expect-error` with a comment for the hard spots; never blanket `any`.
5. Turn on `strict` **last**, fix the errors, and keep it on.

⚠️ **`// @ts-ignore` vs `// @ts-expect-error`:** the second one fails the build once the error is gone,
so it cannot rot. Prefer it.

### Interview questions

**Q: How would you migrate a JavaScript codebase to TypeScript?** → the 5 steps. "Gradually, boundaries
first, strict last — and never a global `any`."

---
---

# WRAP-UP

---

## 24. Maps to YOUR projects

| Where | What to say |
|---|---|
| **NestJS backends** | "TypeScript everywhere with `strict`. DTOs validate at the edge, and the type and validation come from the same definition." |
| **Multi-tenancy** | "The request context is a typed store, so `tenantId` is never `string \| undefined` deep in the code." |
| **API responses** | "Response types are derived from the entity with `Omit`, so internal fields cannot leak by accident." |
| **State machines** | "Appointment and call status are literal unions with exhaustive `switch`es — adding a status breaks the build where it is unhandled." |
| **React Native** | "Typed navigation params and typed RTK Query endpoints, so a wrong route param is a compile error." |
| **Async everywhere** | "Closures for debounce and caching, `Promise.all` for independent calls, `AbortController` for cancelled searches." |

---

## 25. Rapid-fire

### JavaScript
| Word | One line |
|---|---|
| **Primitive vs object** | Copied by value vs by reference |
| **`undefined` vs `null`** | Never set vs deliberately empty |
| **Coercion** | Automatic type conversion — use `===` |
| **Falsy** | `false, 0, '', null, undefined, NaN` |
| **Hoisting** | Declarations move up; `let`/`const` sit in the TDZ |
| **Closure** | A function remembering the variables where it was created |
| **`this`** | Depends on how a function is called; arrows take the outer one |
| **`bind`** | Returns a new function with `this` fixed |
| **Prototype chain** | Where JS looks when a property is missing |
| **Class** | Syntax sugar over prototypes |
| **Shallow vs deep copy** | Spread copies one level; `structuredClone` copies all |
| **Pure function** | Same input, same output, no side effects |
| **Promise states** | pending → fulfilled / rejected, once |
| **`all` / `allSettled` / `race` / `any`** | All / all results / first settled / first success |
| **Microtask** | Promise callbacks — before the next timer |
| **Event loop** | Runs queued callbacks phase by phase ([04 §4](04-nodejs-nestjs.md)) |
| **Debounce / throttle** | Wait for quiet / limit the rate |
| **AbortController** | Cancels a request |
| **Tree-shaking** | Removing unused exports at build time |
| **WeakMap** | Keys can be garbage collected |
| **Generator** | `function*` + `yield` — lazy values |

### TypeScript
| Word | One line |
|---|---|
| **Structural typing** | Shapes match, names do not have to |
| **`strict`** | Null checks + no implicit `any` — the flag that matters |
| **`any` vs `unknown`** | Checking off vs "narrow me first" |
| **`never`** | Cannot happen — used for exhaustive checks |
| **Narrowing** | The compiler follows your `if`s |
| **Type guard** | `x is T` function |
| **Discriminated union** | Shared literal field + exhaustive `switch` |
| **Generic** | A type parameter filled at the call site |
| **`K extends keyof T`** | K must be a real property of T |
| **Utility types** | `Partial`, `Pick`, `Omit`, `Record`, `ReturnType`, `Awaited` |
| **Mapped type** | `{ [K in keyof T]: … }` |
| **Conditional type** | `T extends X ? A : B` |
| **`infer`** | Capture a type from inside another |
| **`as const`** | Keep literal types |
| **`satisfies`** | Check without widening |
| **`as`** | A cast — no runtime check |
| **`z.infer`** | Type derived from a Zod schema |
| **Declaration file** | `.d.ts` — types for JavaScript code |

---

## 26. Self-check

**JavaScript**
- [ ] Explain a closure and give 3 real uses
- [ ] Explain `this` with the 4 rules, and why arrows are different
- [ ] Explain hoisting and the TDZ
- [ ] Say which array methods mutate
- [ ] Explain shallow vs deep copy, and what the JSON trick loses
- [ ] Explain the prototype chain and that classes are sugar
- [ ] Explain promise states and the 4 combinators
- [ ] Say why `forEach(async …)` is a bug
- [ ] Turn 5 sequential awaits into parallel ones

**TypeScript**
- [ ] Say what TypeScript does **not** do (runtime checks)
- [ ] `type` vs `interface`, and why literal unions beat enums
- [ ] `any` vs `unknown` vs `never`
- [ ] Write a discriminated union with an exhaustive `never` check
- [ ] Write a generic function with `K extends keyof T`
- [ ] Use `Partial`, `Pick`, `Omit`, `Record`, `ReturnType` correctly
- [ ] Write `Omit` from scratch
- [ ] Explain `as const` and `satisfies`
- [ ] Explain how Zod gives you validation **and** the type
- [ ] Describe migrating a JS project to TS in 5 steps

---

## 27. Traps — how people lose this round

**JavaScript**
1. Explaining a closure as "a function inside a function" without saying it **remembers** the variables.
2. Saying `this` depends on where the function is written — it depends on **how it is called**.
3. Using an arrow function as an object method and expecting `this` to be the object.
4. Forgetting that spread is a **shallow** copy.
5. Mutating with `sort`/`reverse` and surprising the caller.
6. `forEach(async …)`, or sequential awaits for independent calls.
7. `if (count)` when `0` is valid — use `??` or `!= null`.
8. Claiming `==` is fine "if you know the rules".
9. Not knowing that an `async` function always returns a promise.

**TypeScript**
10. **`any` everywhere** — then TypeScript is only noise.
11. `as` casts instead of validating data from outside.
12. Writing an `interface` for an API response and never validating it.
13. Not turning on `strict`, then saying "TypeScript did not catch much".
14. Enums by habit, without knowing the trade-off.
15. Over-clever conditional types nobody on the team can read.
16. Duplicating the same shape as three separate interfaces instead of deriving them.
17. `// @ts-ignore` with no comment — it hides the error forever; `@ts-expect-error` at least expires.
