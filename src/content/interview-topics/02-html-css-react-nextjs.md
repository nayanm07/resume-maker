# 02 — HTML, CSS, React & Next.js

> Easy English. Short lines. Say them out loud.
> **Time:** ~6 hours · **Pairs with:** [01 — JS & TS](01-javascript-typescript.md),
> [18/04 — basic tasks](18-coding-round/04-basic-tasks.md) (React tasks), and
> `../URBAN_MONEY_REACT_ROUND.md` (your live-coding practice problems)
> ⭐ This file is the **concepts round** — "explain re-renders / `useEffect` / SSR vs SSG". For live
> coding practice, use the other two.

---

## How this file is organised — basic → advanced

**Every topic:** explanation → deeper detail → **interview questions** → **scenarios**.

| Level | Topics | Time | You can answer… |
|---|---|---|---|
| **1. HTML** | 1 Semantic HTML · 2 Forms · 3 Accessibility · 4 Loading & SEO basics | 45 min | "Why semantic tags? `defer` vs `async`?" |
| **2. CSS** | 5 Box model & display · 6 Position · 7 **Flexbox & Grid** · 8 Responsive · 9 Specificity · 10 Styling approaches | 1.5 h | "Center a div. Flex or grid? How does specificity work?" |
| **3. React core** | 11 Components & JSX · 12 **State vs props & re-renders** · 13 Lists & keys · 14 **Hooks** · 15 Forms | 2 h | "Why did this re-render? What are the hook rules?" |
| **4. React advanced** | 16 **Performance** · 17 Context & state management · 18 Data fetching · 19 Code splitting & error boundaries | 1 h | "When do you use `useMemo`? Context vs Redux?" |
| **5. Next.js** | 20 App Router · 21 **Server vs Client Components** · 22 **SSR/SSG/ISR/CSR** · 23 Data, caching & server actions · 24 SEO, images, deploy | 1.5 h | "SSR vs SSG vs ISR? What runs on the server?" |
| **Wrap-up** | 25 Your projects · 26 Rapid-fire · 27 Self-check · 28 Traps | 30 min | |

**If you only have 1 hour:** §0, §7, §12, §14, §16, §21, §22.

---

## 0. The 30-second answer

> 💬 **"Tell me about your front-end work."**
>
> "I build with React and TypeScript — web dashboards and React Native apps. My day-to-day concerns are
> the same three things: **what causes a re-render**, **where state should live**, and **how server data
> is cached**.
>
> Server data I treat as a cache, not state — RTK Query or React Query — so loading, errors and
> refetching come for free. UI state stays local, and anything genuinely global goes in a store.
>
> With Next.js I use the App Router: Server Components for anything that just renders data, Client
> Components only where there is interaction, and I pick the rendering mode per page — static for
> marketing, server-rendered for dashboards, ISR where content changes a few times a day."

---
---

# LEVEL 1 — HTML

---

## 1. Semantic HTML

**Semantic = the tag says what the thing *is*, not how it looks.**

```html
<!-- ❌ div soup -->
<div class="header"><div class="nav">…</div></div>
<div class="main"><div class="article">…</div></div>

<!-- ✅ semantic -->
<header><nav>…</nav></header>
<main>
  <article>
    <h1>Appointment policy</h1>
    <section>…</section>
  </article>
  <aside>Related</aside>
</main>
<footer>…</footer>
```

**Why it matters — three reasons:**
1. **Screen readers** can jump between landmarks — a blind user can skip straight to `<main>`.
2. **SEO** — search engines understand structure, and one `<h1>` per page matters.
3. **Less CSS and fewer bugs** — a `<button>` is already focusable, clickable with Enter and Space, and
   announced as a button. A clickable `<div>` needs all of that added by hand.

| Use | Not |
|---|---|
| `<button>` for actions | `<div onClick>` |
| `<a href>` for navigation | `<span onClick>` |
| `<ul>/<li>` for lists | `<div>` per row |
| `<table>` for tabular data | `<div>` grid for real tables |
| Heading levels in order (h1 → h2 → h3) | Picking headings by font size |

### Interview questions

**Q: Why use semantic HTML?** → the three reasons, leading with accessibility and the free button
behaviour.

**Q: `<button>` vs a clickable `<div>`?**
> "A button is focusable, works with Enter and Space, is announced as a button, and participates in forms.
> A div needs `tabindex`, key handlers and `role` to fake all of it — and someone always forgets one."

---

## 2. Forms and inputs

```html
<form>
  <label for="phone">Phone</label>
  <input id="phone" name="phone" type="tel" inputmode="numeric"
         pattern="[0-9]{10}" required autocomplete="tel" />

  <label for="notes">Notes</label>
  <textarea id="notes" maxlength="500"></textarea>

  <button type="submit">Book</button>
</form>
```

**Points that come up:**
- ⭐ **`<label for="id">`** — makes the label clickable and tells a screen reader what the field is.
- The right `type` gives mobile users the right keyboard: `tel`, `email`, `number`, `date`, `search`.
- Built-in validation (`required`, `pattern`, `min`) is free and instant — but **the server must still
  validate**, since anyone can bypass the browser.
- `autocomplete` makes forms much faster to fill; use the standard names.
- `button type="submit"` vs `type="button"` — the default inside a form is submit, which is why forms
  sometimes reload unexpectedly.

### Interview questions

**Q: How do you make a form accessible?** → labels tied by `for`/`id`, real `<button>`, errors announced
(`aria-live` or `role="alert"`), logical tab order, and don't rely on colour alone.

---

## 3. Accessibility (a11y) — the practical minimum

| Rule | What to do |
|---|---|
| **Images** | `alt` describing the content; `alt=""` for decoration |
| **Keyboard** | Everything clickable must be reachable with Tab and work with Enter |
| **Focus visible** | Never `outline: none` with nothing in its place |
| **Contrast** | 4.5:1 for normal text (WCAG AA) |
| **Labels** | Every input has one; icon-only buttons need `aria-label` |
| **Live updates** | `role="alert"` / `aria-live` so screen readers announce errors |
| **Semantic first** | Use the right element before reaching for ARIA |

⭐ **The rule to quote:** *"No ARIA is better than bad ARIA."* A real `<button>` beats
`<div role="button" tabindex="0">` every time.

### Interview questions

**Q: How do you check accessibility?**
> "Keyboard-only pass through the main flow, an axe or Lighthouse scan, and checking contrast. Those three
> catch most real problems. Semantic HTML prevents most of them in the first place."

---

## 4. Loading, performance and SEO basics

### Script loading

```html
<script src="app.js"></script>              <!-- blocks HTML parsing ❌ -->
<script src="app.js" defer></script>        <!-- ✅ loads in parallel, runs after parsing, in order -->
<script src="analytics.js" async></script>  <!-- loads in parallel, runs whenever ready, no order -->
```
**`defer` for your app code; `async` for independent third-party scripts.**

### Images

```html
<img src="doctor.jpg" alt="Dr Rao" width="320" height="240"
     loading="lazy" decoding="async"
     srcset="doctor-320.jpg 320w, doctor-640.jpg 640w" sizes="(max-width: 600px) 320px, 640px" />
```
- ⭐ Always set **width and height** (or an aspect ratio) — otherwise the page jumps when the image loads
  (that is **layout shift**).
- `loading="lazy"` for below-the-fold images; **never** for the main hero image.
- `srcset` serves a smaller file to phones.

### Core Web Vitals (name them)

| Metric | Means | Fix |
|---|---|---|
| **LCP** | How long until the biggest thing appears | Optimise the hero image, server response, fewer blocking requests |
| **INP** | How fast the page responds to a tap | Less JavaScript on the main thread, break up long tasks |
| **CLS** | How much the layout jumps | Image dimensions, reserve space for ads and banners |

### SEO basics

Title and meta description, one `<h1>`, semantic structure, `alt` text, clean URLs, canonical tag,
Open Graph tags for sharing, `sitemap.xml` and `robots.txt`, and **server-rendered HTML** for content
pages ([§22](#22-rendering-modes--ssr-ssg-isr-csr)).

### Interview questions

**Q: `defer` vs `async`?** → the three lines above.

**Q: What are Core Web Vitals?** → the table.

**Q: Why does the page jump while loading?** → missing image dimensions, fonts swapping, content injected
above existing content. "That is CLS."

---
---

# LEVEL 2 — CSS

---

## 5. The box model and display

```
┌─────────── margin (outside, pushes others away) ───────────┐
│  ┌──────── border ────────┐                                │
│  │  ┌───── padding ─────┐ │                                │
│  │  │     content       │ │                                │
```

```css
* { box-sizing: border-box; }   /* ⭐ width includes padding and border — always do this */
```
With the default `content-box`, a `width: 200px` box with 20px padding is actually 240px wide, and
layouts break. `border-box` makes width mean what you expect.

### Display values

| Value | Behaviour |
|---|---|
| `block` | Full width, stacks vertically (`div`, `p`, `h1`) |
| `inline` | Flows in text; width/height and vertical padding are ignored (`span`, `a`) |
| `inline-block` | Flows in a line, but respects width and height |
| `flex` / `grid` | Layout containers (§7) |
| `none` | Removed from the page (vs `visibility: hidden`, which keeps the space) |

**Margin collapse:** two vertical margins next to each other merge into the larger one — a classic
surprise. Flex and grid containers do not collapse margins, which is one more reason to use them.

### Interview questions

**Q: Explain the box model and `box-sizing`.** → the diagram + why `border-box`.

**Q: `display: none` vs `visibility: hidden` vs `opacity: 0`?**
> "`none` removes it from layout entirely. `hidden` keeps the space but it is invisible and not
> clickable. `opacity: 0` keeps the space and it is **still clickable** — a real source of bugs."

---

## 6. Position

| Value | Positioned relative to | Takes space? |
|---|---|---|
| `static` | Normal flow (default) | Yes |
| `relative` | Itself — nudged | Yes (⭐ and it becomes the anchor for absolute children) |
| `absolute` | The nearest positioned ancestor | ❌ No |
| `fixed` | The viewport | ❌ No |
| `sticky` | Scrolls, then sticks at a threshold | Yes |

```css
.card { position: relative; }                 /* the anchor */
.badge { position: absolute; top: 8px; right: 8px; }   /* corner badge */
.header { position: sticky; top: 0; z-index: 10; }     /* ⭐ needs a top/bottom value to work */
```

⚠️ **`z-index` only works on positioned elements** (or flex/grid children), and it is compared **within a
stacking context** — a child can never escape its parent's stacking order. That is why a modal inside a
`transform`ed card can be trapped behind other content; the fix is a **portal** (§19).

### Interview questions

**Q: `absolute` vs `fixed` vs `sticky`?** → the table.

**Q: My `z-index: 9999` is still behind something. Why?** → stacking contexts: a parent with `transform`,
`opacity` or `filter` creates one, and children cannot escape it.

---

## 7. ⭐ Flexbox and Grid

### Flexbox — one direction at a time

```css
.row {
  display: flex;
  flex-direction: row;        /* or column */
  justify-content: space-between;   /* along the main axis */
  align-items: center;              /* across the other axis */
  gap: 12px;                        /* ⭐ use gap, not margins */
  flex-wrap: wrap;
}
.item { flex: 1; }            /* grow to share the space: flex-grow shrink basis */
```

**The mental model:** pick a direction (`row` or `column`); `justify-content` spaces items **along** it,
`align-items` aligns them **across** it.

### Grid — two directions

```css
.layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));   /* ⭐ responsive with no media query */
  gap: 16px;
}

.page {
  display: grid;
  grid-template-areas: "sidebar header" "sidebar main";
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
```

**Flex or grid?** ⭐ "Flex for one dimension — a toolbar, a row of buttons, a card's contents. Grid for
two dimensions — a page layout or a card gallery. In practice I use grid for the page and flex inside the
components."

### Centering — know all the ways

```css
.parent { display: flex; justify-content: center; align-items: center; }   /* ⭐ the usual answer */
.parent { display: grid; place-items: center; }                            /* shortest */
.child  { position: absolute; inset: 0; margin: auto; }                    /* works for fixed sizes */
.child  { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }  /* old faithful */
```

### Interview questions

**Q: Flexbox vs Grid?** → the quote above.

**Q: How do you centre a div?** → give two ways and say which you would pick.

**Q: What does `flex: 1` mean?** → "`flex-grow: 1; flex-shrink: 1; flex-basis: 0%` — take an equal share
of the free space."

---

## 8. Responsive design

```css
/* ⭐ mobile-first: base styles are for phones, then add bigger screens */
.card { padding: 12px; }

@media (min-width: 768px)  { .card { padding: 20px; } }
@media (min-width: 1200px) { .card { padding: 32px; } }
```

| Unit | Relative to | Use for |
|---|---|---|
| `px` | Nothing (fixed) | Borders, tiny details |
| `rem` ⭐ | The **root** font size | Spacing and type — scales with user settings |
| `em` | The **element's** font size | Padding that should follow its own text size |
| `%` | The parent | Widths |
| `vh` / `vw` | The viewport | Full-screen sections (⚠️ `100vh` is awkward on mobile — use `dvh`) |
| `clamp(min, ideal, max)` | ⭐ | Fluid type: `font-size: clamp(1rem, 2.5vw, 1.5rem)` |

**Other tools:** `max-width` with `margin: auto` for readable content, `aspect-ratio`, container queries
(`@container`) for component-level responsiveness, and `prefers-color-scheme` for dark mode.

### Interview questions

**Q: Why mobile-first?**
> "The base case stays simple and phones — the weakest devices — load the least CSS. Adding complexity
> upward with `min-width` is easier to reason about than removing it downward."

**Q: `rem` or `px` for font sizes?** → "`rem`, because it respects the user's browser font setting. A
visually impaired user who sets a bigger default gets a bigger site; `px` ignores them."

---

## 9. Specificity and the cascade

**When two rules target the same element, which wins?**

1. **Importance** — `!important` beats everything (avoid it).
2. **Specificity** — count: inline style (1,0,0,0) > id (0,1,0,0) > class / attribute / pseudo-class
   (0,0,1,0) > element / pseudo-element (0,0,0,1).
3. **Order** — if specificity ties, the **last** rule wins.

```css
#sidebar .link     { color: red; }    /* 0,1,1,0 — wins */
.nav .menu .link   { color: blue; }   /* 0,0,3,0 */
```

**Modern tools:** `:where()` has **zero** specificity (great for resets), `:is()` takes the highest of its
arguments, and **cascade layers** (`@layer`) let you order whole groups of styles deliberately.

**Inheritance:** text properties (`color`, `font`, `line-height`) inherit; box properties (`margin`,
`padding`, `border`) do not.

### Interview questions

**Q: How does CSS specificity work?** → the 3 steps with the counting.

**Q: Why is `!important` a problem?** → "It wins regardless of structure, so the only way to beat it is
another `!important`. Teams end up in an arms race. I fix the selector instead."

---

## 10. Styling approaches

| Approach | How | Trade-off |
|---|---|---|
| **Plain CSS / BEM** | `.card__title--active` | No tooling; naming discipline required |
| **CSS Modules** | `styles.card` — scoped per file | ⭐ Simple, no runtime, works great with Next.js |
| **Tailwind** | `class="flex gap-2 p-4"` | Very fast to build, consistent spacing; markup gets long |
| **CSS-in-JS** (styled-components, emotion) | Styles in JS | Dynamic styling; runtime cost, and awkward with Server Components |
| **Design system** (MUI, shadcn/ui) | Ready components | Fast and accessible; less control |

> 💬 **If asked which you prefer:** "Tailwind or CSS Modules for product work — both are predictable, have
> no runtime cost, and scope well. I avoid runtime CSS-in-JS in new Next.js apps because it does not fit
> Server Components. The important thing is one approach per codebase, not three."

### Interview questions

**Q: Tailwind — good or bad?**
> "Good for teams and speed: no naming debates, consistent spacing, dead CSS is removed automatically. The
> cost is noisy markup, so repeated patterns become components. It is a trade I would make for a product
> with several developers."

---
---

# LEVEL 3 — REACT CORE

---

## 11. Components and JSX

```jsx
function PatientCard({ patient, onSelect }) {        // props in, UI out
  return (
    <article className="card" onClick={() => onSelect(patient.id)}>
      <h3>{patient.name}</h3>
      {patient.phone && <p>{patient.phone}</p>}      {/* conditional */}
    </article>
  );
}
```

**JSX is not HTML** — it compiles to function calls. So:
- `className`, not `class`; `htmlFor`, not `for`.
- `{}` holds any JavaScript expression (not statements — no `if` inside JSX; use `&&`, a ternary, or
  compute above).
- One root element, or a fragment `<>…</>`.
- ⚠️ `{0 && <Badge/>}` renders **`0`** on the screen — use `{count > 0 && …}`.

**The mental model:** ⭐ **UI is a function of state.** You never touch the DOM; you change state and
describe what the UI should look like for that state.

### Interview questions

**Q: What is JSX?**
> "Syntax that compiles to `React.createElement` calls — a JavaScript description of the UI. The browser
> never sees JSX."

**Q: What is the virtual DOM?**
> "React builds a lightweight tree in memory, compares it with the previous one (reconciliation), and
> applies only the real differences to the DOM. The point is not raw speed — it is that I can describe the
> whole UI for a state and let React work out the minimal update."

---

## 12. ⭐⭐ State, props and what causes a re-render

### State vs props

| | **Props** | **State** |
|---|---|---|
| Comes from | The parent | Inside the component |
| Changeable? | Read-only | Changed with the setter |
| Causes a re-render | When the parent re-renders with new props | When you set it |

### What actually causes a re-render (know this list cold)

A component re-renders when:
1. Its **own state** changes (`setState`).
2. Its **parent re-renders** — ⭐ by default, children re-render too, even if their props are identical.
3. A **context value it consumes** changes.
4. A hook it uses triggers an update (for example a store subscription).

⚠️ **Not** because an object was mutated. `items.push(x)` keeps the same reference, so React sees nothing.

```jsx
// ❌ mutating — React may not re-render
items.push(newItem);
setItems(items);

// ✅ new array
setItems((prev) => [...prev, newItem]);
```

### Updating state correctly

```jsx
setCount(count + 1);              // ⚠️ uses the value captured in this render
setCount((c) => c + 1);           // ✅ always based on the latest — use this in loops/handlers

setUser((u) => ({ ...u, name }));  // objects: spread then override
```

**State updates are asynchronous and batched** — reading `count` right after `setCount` gives the old
value. React re-renders once with the final result.

### Where should state live?

| Situation | Put it |
|---|---|
| Only one component needs it | In that component |
| Two siblings need it | **Lift it** to their closest parent |
| Half the app needs it | A store (Redux Toolkit, Zustand) or context |
| It comes from the server | ⭐ A data cache (RTK Query / React Query), **not** `useState` |
| It can be calculated from other state | ⭐ Do not store it — **derive** it |

```jsx
// ❌ duplicate state that can drift out of sync
const [items, setItems] = useState([]);
const [filtered, setFiltered] = useState([]);

// ✅ derive it during render
const filtered = items.filter((i) => i.name.includes(query));
```

### Interview questions

**Q: Why did my component re-render?** → the 4 causes, leading with "the parent re-rendered".

**Q: Why is `setState` asynchronous?**
> "React batches updates so several `setState` calls in one event cause one re-render. That is also why I
> use the function form when the new value depends on the old one."

**Q: Props vs state?** → the table, plus "props flow down; state is owned".

### Scenarios

**S1. A list does not update on screen even though the data clearly changed.**
> "Almost always mutation. The array or object was changed in place, so the reference is the same and
> React sees no change — especially with `memo` or a `useEffect` dependency on it.
> Fix: always create a new array or object (`[...prev, item]`, `{ ...prev, field }`). If the state is
> deeply nested, that is a sign to flatten it or use Immer."

---

## 13. Lists and keys

```jsx
{patients.map((p) => <PatientCard key={p.id} patient={p} />)}     // ⭐ stable, unique id
```

**Why keys matter:** they tell React which item is which between renders. With a correct key, inserting
at the top moves existing DOM nodes. With the **index** as key, React thinks item 0 *changed* — so it
re-renders everything, and worse, **input values and focus end up on the wrong row**.

| ✅ Good key | ❌ Bad key |
|---|---|
| A database id | The array index (if the list can reorder, filter or grow at the top) |
| A stable composite (`${tenant}-${id}`) | `Math.random()` — a new key every render destroys the DOM |

### Interview questions

**Q: Why does React need keys?** → identity between renders; the index trap with inputs and focus.

**Q: When is the index acceptable as a key?** → "A static list that never reorders, filters or has items
added in the middle. If I am unsure, I use an id."

---

## 14. ⭐⭐ Hooks

### The rules of hooks

1. **Only at the top level** — never inside an `if`, a loop, or after an early `return`.
2. **Only in components or custom hooks.**

**Why:** React tracks hooks **by call order**. A hook inside an `if` changes that order between renders,
and state gets assigned to the wrong hook.

### `useState`

```jsx
const [open, setOpen] = useState(false);
const [form, setForm] = useState({ name: '', phone: '' });
const [items, setItems] = useState(() => expensiveInit());   // ⭐ lazy initial value, runs once
```

### `useEffect` — the one people get wrong

```jsx
useEffect(() => {
  const controller = new AbortController();

  fetch(`/api/patients/${id}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setPatient)
    .catch((e) => { if (e.name !== 'AbortError') setError(e); });

  return () => controller.abort();      // ⭐ cleanup: runs before the next effect and on unmount
}, [id]);                                // ⭐ dependencies: re-run when id changes
```

| Dependency array | Means |
|---|---|
| `[]` | Run once after the first render |
| `[id]` | Run when `id` changes |
| *(omitted)* | Run after **every** render — usually a bug |

**What effects are for:** talking to the outside world — fetching, subscriptions, timers, manual DOM
work, logging.
⭐ **What they are NOT for:** calculating values from state (derive during render), or syncing one state
to another (that is a duplicate-state smell).

**Cleanup matters** for: aborting requests, `clearInterval`, removing event listeners, closing sockets.
Without it you get memory leaks and "setState on an unmounted component" warnings.

⚠️ **Strict Mode in development runs effects twice** (mount → unmount → mount) on purpose, to expose
missing cleanup. It does not happen in production.

### `useRef`

```jsx
const inputRef = useRef(null);          // a DOM node
inputRef.current?.focus();

const renders = useRef(0);              // a value that survives renders WITHOUT causing one
renders.current++;
```
**Rule:** state is for things the UI shows; a ref is for things it does not — a timer id, the previous
value, a DOM node.

### `useMemo` and `useCallback`

```jsx
const sorted = useMemo(() => [...items].sort(byDate), [items]);          // remember a VALUE
const handleSelect = useCallback((id) => onSelect(id), [onSelect]);       // remember a FUNCTION
```
Both exist to keep a **stable reference** or skip an **expensive calculation**. ⚠️ They are not free —
they add memory and comparison work. Use them when you have measured a problem, or when a child is
`memo`-wrapped and needs stable props (§16).

### `useContext` and `useReducer`

```jsx
const theme = useContext(ThemeContext);

const [state, dispatch] = useReducer(reducer, initialState);   // many related fields, clear transitions
dispatch({ type: 'slotSelected', slotId });
```
`useReducer` is better than several `useState`s when updates involve multiple fields together, or when
"what can happen next" is a state machine.

### Custom hooks — reuse logic, not UI

```jsx
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
```
Any function starting with `use` that calls hooks. ⭐ This is **the** way to share stateful logic between
components.

### Interview questions

**Q: What are the rules of hooks and why?** → top level only; React matches hooks by call order.

**Q: When do you use `useEffect`?** → "For side effects with the outside world. Not for deriving values —
that happens during render."

**Q: `useMemo` vs `useCallback` vs `useRef`?** → "Memo caches a value, callback caches a function, ref
holds a mutable value that does not trigger renders."

**Q: Why does my effect run twice?** → Strict Mode in development, deliberately, to reveal missing
cleanup.

### Scenarios

**S2. An effect fetches in a loop, hammering the API.**
> "The dependency array contains something new every render — an object or array literal, or a function
> defined inline — so the effect re-runs, sets state, re-renders, and goes again.
> Fix: depend on primitives (`id`, not the whole object), memoise the dependency, or move the object
> outside the component. The lint rule for exhaustive deps usually points at it."

**S3. A search box fires a request on every keystroke, and old responses overwrite new ones.**
> "Two problems: no debounce, and no cancellation. I debounce the value by about 300 ms, and abort the
> previous request with an `AbortController` in the effect cleanup — otherwise a slow earlier response can
> land after the newer one and show stale results."

---

## 15. Forms

```jsx
function BookingForm({ onSubmit }) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();                                  // ⭐ stop the page reload
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!/^\d{10}$/.test(form.phone)) next.phone = 'Phone must be 10 digits';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setErrors({ form: err.message });                  // show the server's error
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" value={form.name} onChange={update} />
      {errors.name && <p role="alert">{errors.name}</p>}

      <button disabled={saving}>{saving ? 'Saving…' : 'Book'}</button>   {/* ⭐ no double submit */}
    </form>
  );
}
```

**Controlled vs uncontrolled**

| | Controlled | Uncontrolled |
|---|---|---|
| Value lives in | React state | The DOM |
| Read with | `value` + `onChange` | A `ref` |
| Good for | Live validation, dependent fields | Simple or very large forms |

⭐ For big forms, **React Hook Form** keeps inputs uncontrolled for performance and handles validation
with Zod — the same schema you use on the server ([01 §22](01-javascript-typescript.md)).

### Interview questions

**Q: Controlled vs uncontrolled inputs?** → the table.

**Q: What do you always include in a form?** → "`preventDefault`, validation before sending, the submit
button disabled while saving, server errors displayed, and labels tied to inputs."

---
---

# LEVEL 4 — REACT ADVANCED

---

## 16. ⭐ Performance

### The order to work in

1. **Measure** — React DevTools Profiler. Find what re-renders and how long it takes.
2. **Fix the cause** — usually: everything lives in one big state, or a new object is created every render.
3. **Then** reach for `memo`, `useMemo`, `useCallback`.

### `React.memo`

```jsx
const PatientRow = React.memo(function PatientRow({ patient, onSelect }) { … });
```
`memo` skips the re-render **if the props are shallow-equal**. ⚠️ But an inline function or object prop is
new every render, so `memo` does nothing:

```jsx
// ❌ memo is useless — a new function each render
<PatientRow patient={p} onSelect={(id) => select(id)} />

// ✅ stable reference
const handleSelect = useCallback((id) => select(id), [select]);
<PatientRow patient={p} onSelect={handleSelect} />
```

### The levers, with when to use them

| Lever | Use when |
|---|---|
| **`memo` + stable props** | A long list of rows, or an expensive subtree |
| **`useMemo`** | A genuinely expensive calculation, or a prop that must be reference-stable |
| **`useCallback`** | A function passed to a `memo`'d child or used in a dependency array |
| **Move state down** ⭐ | Only one small part changes — keep the state there instead of at the top |
| **Split context** | One context per concern, so a theme change does not re-render the data tree |
| **Virtualise** | Lists over a few hundred rows (`react-window`, TanStack Virtual) |
| **Code split** | Big routes and heavy libraries (`lazy` + `Suspense`) |
| **Debounce input** | Search boxes, filters |

⭐ **The best fix is usually structural, not a memo:** "If one input re-renders the whole page, the state
is too high. Moving it into the component that uses it beats memoising twenty children."

**React 19 note:** the React Compiler can add memoisation automatically. Worth mentioning as a direction —
but still explain the manual tools, because that is what the question is about.

### Interview questions

**Q: How do you find and fix a performance problem in React?** → the 3-step order, then the levers.

**Q: Should you wrap everything in `memo`?**
> "No. Memo adds a comparison and memory cost, and it does nothing if props are new objects each render.
> I profile first, then memoise the specific expensive subtree — and often the real fix is moving state
> down or splitting context."

### Scenarios

**S4. Typing in a search box makes the whole page lag.**
> "Every keystroke sets state at the top, so the entire tree re-renders — including a big table.
> Three fixes, in order: move the input's state into the input component and lift only the debounced
> value; debounce the filtering; and memoise the table rows with stable props. If the list is huge, I
> virtualise it. I confirm each change with the Profiler rather than guessing."

---

## 17. Context and state management

### Context is for **passing**, not for performance

```jsx
const ThemeContext = createContext('light');

<ThemeContext.Provider value={theme}>…</ThemeContext.Provider>
const theme = useContext(ThemeContext);
```

⚠️ **Every consumer re-renders when the context value changes** — and if you pass an inline object
`value={{ user, setUser }}`, that is a new object every render, so **everything** re-renders.
Fixes: `useMemo` the value, and **split** contexts (auth separate from theme separate from data).

### Choosing a state tool

| Need | Tool |
|---|---|
| One component's UI state | `useState` |
| Related fields / a state machine | `useReducer` |
| Rarely-changing global value (theme, current user) | **Context** |
| Lots of shared client state | **Redux Toolkit** or **Zustand** |
| **Server data** ⭐ | **RTK Query / React Query** — not a store |
| URL-ish state (filters, page) | ⭐ The **URL** itself — shareable and survives refresh |

> 💬 **The answer to give:** "Most 'global state' problems are really server-cache problems. Once server
> data moved to RTK Query, my Redux store shrank to a small amount of genuine UI state — and loading,
> error and refetch handling came for free."

### Interview questions

**Q: Context vs Redux?**
> "Context is a transport mechanism for values that rarely change. Redux (or Zustand) is a store with
> devtools, middleware and selectors, which matters when state changes often and in many places. Using
> context for high-frequency state means every consumer re-renders."

**Q: Where do you keep server data?** → the quote above.

---

## 18. Data fetching patterns

| Approach | Note |
|---|---|
| `useEffect` + `fetch` | Fine for one simple screen; you write loading, error, cancel, refetch yourself |
| **RTK Query / React Query** ⭐ | Caching, dedupe, refetch on focus, invalidation, optimistic updates |
| **Server Components** (Next.js) | Fetch on the server, send HTML — no client loading state at all (§21) |

```jsx
// RTK Query — the whole screen's data layer in a few lines
const { data, isLoading, error, refetch } = useGetPatientsQuery({ clinicId, page });
```

**Things to mention:**
- **Cache key** = the query + args, so two components asking for the same thing share one request.
- **Invalidation** — after a mutation, invalidate the tag and the list refetches itself.
- **Optimistic update** — show the change immediately, roll back if the server rejects it.
- Always handle **loading, error and empty** states; that is what reviewers look for.

### Interview questions

**Q: Why not just `useEffect` and `fetch`?**
> "Because you end up rebuilding a cache: dedupe, refetch on focus, invalidation after mutations,
> cancellation, retries. A data library already solved that, and it removes most of my Redux code."

---

## 19. Code splitting, Suspense and error boundaries

```jsx
const Reports = lazy(() => import('./Reports'));          // loaded only when needed

<Suspense fallback={<Spinner />}>
  <Reports />
</Suspense>
```

```jsx
class ErrorBoundary extends React.Component {             // ⭐ must be a class
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { Sentry.captureException(error, { extra: info }); }
  render() {
    return this.state.error ? <p>Something went wrong.</p> : this.props.children;
  }
}
```

⚠️ **An error boundary does not catch:** errors in event handlers, async code (`setTimeout`, promises), or
server-side rendering. Those need try/catch and a global `unhandledrejection` listener.

**Portals** render a child outside the parent's DOM position — the fix for modals trapped by `overflow`
or a stacking context (§6):
```jsx
ReactDOM.createPortal(<Modal />, document.body);
```

### Interview questions

**Q: What is an error boundary and what does it not catch?** → the code + the three gaps.

**Q: When do you code-split?** → "Per route by default, plus any heavy library — a chart pack, a PDF
viewer, a rich text editor — so the first load stays small."

---
---

# LEVEL 5 — NEXT.JS

---

## 20. What Next.js adds, and the App Router

**React is a library for building UI. Next.js is the framework around it:** routing, server rendering,
data fetching, bundling, image optimisation, API routes and deployment.

### App Router vs Pages Router

| | **App Router** (`app/`) — current | **Pages Router** (`pages/`) — older |
|---|---|---|
| Components | **Server Components by default** | All client components |
| Data fetching | `async` components, `fetch` | `getServerSideProps` / `getStaticProps` |
| Layouts | Nested `layout.tsx`, preserved on navigation | One `_app.tsx` |
| Loading / errors | `loading.tsx`, `error.tsx` per route | Manual |
| Streaming | ✅ Built in | ❌ |

### The file conventions

```
app/
  layout.tsx          shared shell (nav, providers) — wraps everything below
  page.tsx            the route's UI            → /
  loading.tsx         shown while the page streams
  error.tsx           error UI for this subtree (a client component)
  not-found.tsx       404
  appointments/
    page.tsx                                     → /appointments
    [id]/page.tsx     dynamic route              → /appointments/55
    api/route.ts      a route handler (GET/POST)
```

### Interview questions

**Q: Why use Next.js instead of plain React?**
> "Server rendering for SEO and first-paint speed, routing and layouts, data fetching on the server,
> image and font optimisation, API routes, and a deployment story. With a plain SPA I would assemble all
> of that myself."

---

## 21. ⭐⭐ Server Components vs Client Components

**In the App Router, components are Server Components by default.** They run **on the server only**,
and their JavaScript is **never sent to the browser**.

```tsx
// app/appointments/page.tsx — a SERVER component
export default async function AppointmentsPage() {
  const appointments = await db.appointment.findMany();   // ⭐ direct database access, no API needed
  return <AppointmentList items={appointments} />;
}
```
```tsx
'use client';                                   // ⭐ this file (and its imports) run in the browser

export function SearchBox({ onSearch }) {
  const [q, setQ] = useState('');               // hooks need a client component
  return <input value={q} onChange={(e) => setQ(e.target.value)} />;
}
```

| | **Server Component** | **Client Component** |
|---|---|---|
| Runs | On the server | Server (for the first HTML) **and** browser |
| Can use hooks / state / events | ❌ No | ✅ Yes |
| Can access the database and secrets | ✅ Yes | ❌ Never |
| Ships JavaScript to the browser | ❌ No — smaller bundle | ✅ Yes |
| Can use `window` / `localStorage` | ❌ No | ✅ Yes |

**The rule to say:** ⭐ "Server Components for anything that just fetches and renders. `'use client'` only
where there is interaction — a form, a dropdown, a chart with hover. Keep client components as leaves, so
the interactive island is small."

⚠️ **Traps:**
- A server component **cannot** pass a function as a prop to a client component (functions cannot be
  serialised) — pass data, or use a **server action**.
- Adding `'use client'` to a layout turns the **whole subtree** into client components.
- `useState` or `onClick` in a server component is an immediate error — that error message is how most
  people learn this.

### Interview questions

**Q: Server vs Client Components?** → the table + the rule.

**Q: How do you decide where `'use client'` goes?**
> "As low in the tree as possible — on the small interactive piece, not the page. If a page is mostly
> static with one dropdown, only the dropdown is a client component."

### Scenarios

**S5. Someone put `'use client'` at the top of the root layout "to fix an error".**
> "That makes the entire app client-rendered — the bundle grows, server-only data access breaks, and the
> benefit of Server Components is gone.
> The real fix is to find the one component that needed hooks or an event handler and mark **that**. I
> would move providers like a theme or store into a small `providers.tsx` client component and keep the
> layout itself on the server."

---

## 22. Rendering modes — SSR, SSG, ISR, CSR

| Mode | When the HTML is made | Good for | In the App Router |
|---|---|---|---|
| **SSG** (static) | At **build** time | Marketing pages, docs, blogs | The default when there is no dynamic data |
| **ISR** (incremental) ⭐ | At build, then **re-generated** after N seconds | Content that changes a few times a day | `export const revalidate = 60` |
| **SSR** (server) | On **every request** | Dashboards, personalised or always-fresh pages | `export const dynamic = 'force-dynamic'`, or using cookies/headers |
| **CSR** (client) | In the **browser** after load | Highly interactive app screens behind a login | A client component fetching data |

**How to choose — say it this way:**

> "Per page, by how fresh the data must be and whether it needs SEO.
> A public clinic page: static or ISR — fast and crawlable.
> A logged-in dashboard: server-rendered or client-fetched, because it is per-user and SEO is irrelevant.
> A pricing page that changes weekly: ISR with a revalidate window, so users get static speed without a
> rebuild."

⭐ **Streaming** is the extra piece: with `loading.tsx` and `Suspense`, the shell is sent immediately and
slow sections stream in — so a slow query does not block the whole page.

### Interview questions

**Q: SSR vs SSG vs ISR vs CSR?** → the table, then the per-page quote.

**Q: What is hydration?**
> "The server sends HTML, then React attaches event listeners to that existing markup in the browser. A
> **hydration mismatch** happens when the server and client render different output — a `Date.now()`, a
> random value, or reading `window` during render."

### Scenarios

**S6. "Text content did not match" hydration errors in production.**
> "The server and the browser rendered different HTML. Usual causes: `new Date()` or random values in
> render, reading `localStorage` or `window` during the first render, or browser-only locale formatting.
> Fix: compute those after mount in an effect, or render the value only on the client. And keep anything
> genuinely time-based out of the first paint."

---

## 23. Data, caching and server actions

### Fetching and caching

```tsx
// in a Server Component
const res = await fetch(`${API}/clinics/9`, { next: { revalidate: 60 } });  // cache for 60s (ISR)
const res = await fetch(url, { cache: 'no-store' });                        // always fresh
const res = await fetch(url, { next: { tags: ['clinics'] } });              // tag for invalidation
```
⚠️ **Caching defaults have changed between Next.js versions** (Next 15 made `fetch` uncached by default).
⭐ The safe thing to say: *"I set the caching behaviour explicitly per fetch rather than relying on the
default, because the defaults have changed between versions."*

**Invalidation after a write:**
```ts
revalidateTag('clinics');          // everything tagged 'clinics' refetches
revalidatePath('/appointments');   // that route re-renders
```

### Server actions

```tsx
// app/appointments/actions.ts
'use server';

export async function bookAppointment(formData: FormData) {
  const slotId = String(formData.get('slotId'));
  await db.appointment.create({ data: { slotId } });   // runs on the server
  revalidatePath('/appointments');
}
```
```tsx
<form action={bookAppointment}>…</form>    {/* works even before JavaScript loads */}
```

⭐ **Why it matters:** a form can talk to the server without you writing an API route or a fetch call.
⚠️ **Security:** a server action is a **public endpoint**. Validate the input and check authorisation
inside it — exactly like a controller ([11](11-auth-and-security.md)).

### Route handlers (API routes)

```ts
// app/api/patients/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const patients = await service.list(searchParams.get('q'));
  return Response.json(patients);
}
```
Use these when something **other than your own UI** calls you — a mobile app, a webhook, a partner.

### Middleware

Runs **before** a request is handled, at the edge: redirects, auth checks, locale, tenant from the
subdomain. Keep it light — it runs on every matched request.

### Interview questions

**Q: What is a server action, and when would you use one instead of an API route?**
> "A function marked `'use server'` that a form or a client component can call directly — no API route, no
> fetch. I use actions for my own UI's mutations, and route handlers when something external needs an
> endpoint: a mobile app, a webhook, a partner integration."

**Q: How do you keep data fresh in Next.js?** → `revalidate` for time-based, `revalidateTag`/`Path` after
mutations, `no-store` for per-request data.

---

## 24. SEO, images, fonts and deployment

```tsx
// app/appointments/page.tsx
export const metadata = {
  title: 'Appointments | GoClinic',
  description: 'Book and manage clinic appointments.',
  openGraph: { title: 'GoClinic', images: ['/og.png'] },
};

export async function generateMetadata({ params }) {        // dynamic pages
  const clinic = await getClinic(params.id);
  return { title: `${clinic.name} | GoClinic` };
}
```

| Feature | What it does |
|---|---|
| **`next/image`** | Resizes, serves modern formats, lazy-loads, prevents layout shift (needs width/height) |
| **`next/font`** | Self-hosts the font at build time — no layout shift, no third-party request |
| **`next/link`** | Client-side navigation with prefetching |
| **Metadata API** | Titles, descriptions, Open Graph, canonical |
| **sitemap / robots** | `app/sitemap.ts`, `app/robots.ts` |

**Deployment:** Vercel is the easiest (it is their framework). Otherwise a Node server (`next start`) in
Docker behind Nginx, or `output: 'standalone'` for a small image. ⚠️ A fully static export (`output:
'export'`) gives up SSR, ISR and server actions.

**Environment variables:** anything prefixed `NEXT_PUBLIC_` is **shipped to the browser** — never put a
secret there.

### Interview questions

**Q: How do you handle SEO in Next.js?** → server-rendered or static HTML, the metadata API,
`generateMetadata` for dynamic pages, sitemap and robots, semantic headings, and `next/image` for CLS.

**Q: What is the trap with `NEXT_PUBLIC_`?** → "It is inlined into the client bundle. Secrets stay
server-side only."

---
---

# WRAP-UP

---

## 25. Maps to YOUR projects

| Area | What to say |
|---|---|
| **Dashboards** | "React with TypeScript; server data through RTK Query so caching, refetch and invalidation are handled, and the store holds only real UI state." |
| **Re-render discipline** | "State lives as low as possible; lists are memoised with stable props; long tables are virtualised." |
| **Forms** | "Validation before submit, button disabled while saving, server errors surfaced, labels tied to inputs." |
| **Real-time UI** | "Socket updates patch the cache, and on reconnect the client re-fetches rather than trusting the stream ([09 §9](09-realtime-websockets.md))." |
| **React Native** | "The same mental model — components, hooks, RTK Query — with native navigation and FlatList performance work ([03](03-react-native-mobile.md))." |
| **Next.js** | "App Router: Server Components for data pages, client islands for interaction, ISR for content that changes a few times a day." |

---

## 26. Rapid-fire

### HTML / CSS
| Word | One line |
|---|---|
| **Semantic HTML** | The tag says what it is — accessibility and SEO |
| **`label for`** | Ties a label to an input |
| **`defer` / `async`** | Run after parsing, in order / whenever ready |
| **LCP / INP / CLS** | Biggest paint / responsiveness / layout jump |
| **`box-sizing: border-box`** | Width includes padding and border |
| **Margin collapse** | Adjacent vertical margins merge |
| **Flex** | One-dimension layout; `justify` along, `align` across |
| **Grid** | Two-dimension layout; `auto-fill` + `minmax` for responsive cards |
| **`gap`** | Spacing between flex/grid children |
| **Position sticky** | Scrolls then sticks; needs `top` |
| **Stacking context** | Why `z-index` sometimes "fails" |
| **Specificity** | inline > id > class > element; ties go to the last rule |
| **`rem` vs `px`** | Respects the user's font size vs fixed |
| **`clamp()`** | Fluid sizing with a min and max |
| **Mobile-first** | Base styles for phones, add with `min-width` |

### React
| Word | One line |
|---|---|
| **JSX** | Compiles to `createElement` calls |
| **Virtual DOM** | In-memory tree, diffed to minimal DOM updates |
| **Props vs state** | Passed in, read-only / owned, changeable |
| **Re-render causes** | Own state, parent render, context, hook update |
| **Immutability** | New object/array, or React sees no change |
| **Key** | Identity between renders; never the index for dynamic lists |
| **Rules of hooks** | Top level only, components only — order matters |
| **`useEffect` cleanup** | Abort, clear timers, remove listeners |
| **Strict Mode double render** | Development-only, reveals missing cleanup |
| **`useRef`** | Mutable value that does not re-render |
| **`memo` / `useMemo` / `useCallback`** | Skip re-render / cache a value / cache a function |
| **Derived state** | Calculate during render instead of storing |
| **Lifting state** | Move it to the closest common parent |
| **Context** | Transport for rarely-changing values |
| **Error boundary** | Catches render errors; not async ones |
| **Portal** | Render outside the parent DOM node |
| **Virtualisation** | Render only visible rows |

### Next.js
| Word | One line |
|---|---|
| **App Router** | `app/` with layouts, loading, error files |
| **Server Component** | Runs on the server, ships no JavaScript |
| **`'use client'`** | Makes a component (and its imports) run in the browser |
| **SSG / ISR / SSR / CSR** | Build time / revalidated / per request / in the browser |
| **`revalidate`** | Seconds before a static page is regenerated |
| **`revalidateTag` / `revalidatePath`** | Invalidate after a mutation |
| **Streaming** | Send the shell first, stream slow parts |
| **Hydration** | Attaching React to server HTML |
| **Server action** | `'use server'` function callable from a form |
| **Route handler** | `app/api/.../route.ts` — a real endpoint |
| **Middleware** | Runs before the request; redirects, auth, tenant |
| **`next/image`** | Optimised, lazy, no layout shift |
| **`NEXT_PUBLIC_`** | Exposed to the browser — never secrets |

---

## 27. Self-check

**HTML / CSS**
- [ ] Explain semantic HTML and why `<button>` beats a clickable div
- [ ] Say the accessibility minimum (labels, keyboard, contrast, focus)
- [ ] Explain `defer` vs `async`, and name the 3 Core Web Vitals
- [ ] Explain the box model and why `border-box`
- [ ] Centre a div three ways
- [ ] Say when you use flex and when grid
- [ ] Build a responsive card grid with no media query
- [ ] Explain specificity and why `!important` is a trap

**React**
- [ ] Name the 4 causes of a re-render
- [ ] Explain why mutating state does not update the UI
- [ ] Explain keys and the index trap
- [ ] State the rules of hooks and why they exist
- [ ] Write `useEffect` with dependencies and cleanup, and say what effects are *not* for
- [ ] Explain `memo` / `useMemo` / `useCallback` and when each is pointless
- [ ] Say where different kinds of state should live
- [ ] Explain why server data belongs in a cache, not a store
- [ ] Explain error boundaries and their gaps

**Next.js**
- [ ] Explain Server vs Client Components, and where `'use client'` goes
- [ ] Explain SSG, ISR, SSR and CSR, and choose per page
- [ ] Explain hydration and a hydration mismatch
- [ ] Explain server actions vs route handlers
- [ ] Say how to invalidate cached data after a write
- [ ] Say the `NEXT_PUBLIC_` rule

---

## 28. Traps — how people lose this round

**HTML / CSS**
1. Clickable `<div>`s instead of buttons.
2. `outline: none` with no focus style.
3. Images with no width and height → layout shift.
4. `!important` to win a specificity fight.
5. Not knowing why `z-index` fails (stacking contexts).
6. Desktop-first CSS, then fighting it with `max-width` queries.
7. `px` font sizes everywhere, ignoring user settings.

**React**
8. **Mutating state** and expecting a re-render.
9. **Index as key** in a list that reorders or filters.
10. `useEffect` to compute values that should be derived during render.
11. Missing cleanup — leaked intervals, listeners, requests.
12. Objects or functions in the dependency array → an effect loop.
13. `memo` with inline props, so it does nothing.
14. Memoising everything "for performance" without measuring.
15. Server data in `useState` + `useEffect`, rebuilding a cache by hand.
16. Duplicate state that can drift (storing both `items` and `filteredItems`).
17. All state at the top of the tree, so every keystroke re-renders the app.
18. Calling hooks conditionally.

**Next.js**
19. `'use client'` at the root, turning the whole app into a SPA.
20. Passing a function from a server component to a client component.
21. Using `window` or `localStorage` during render → hydration mismatch.
22. Relying on fetch caching defaults instead of setting them explicitly.
23. Secrets in `NEXT_PUBLIC_` variables.
24. A server action with no validation or authorisation check — it is a public endpoint.
25. Choosing SSR for everything "to be safe", losing static speed where it was free.
