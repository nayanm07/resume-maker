# 04 — Basic Coding Tasks (create an API, call an API, and more)

> Easy English. These are the **"build this in 30–60 minutes"** tasks from coding rounds and take-home
> tests. Each task: **the task → what they check → the solution → common mistakes.**
> Back to [the coding round guide](README.md).

| Section | Tasks |
|---|---|
| **A. Create an API** (Node / Express / NestJS) | K1–K7 |
| **B. Call an API** (fetch / axios) | K8–K13 |
| **C. React tasks** (show data from an API) | K14–K17 |
| **D. Small Node tasks** | K18–K20 |
| **How to do a take-home task** | The checklist at the end |

### What interviewers check in EVERY task

| ✅ They look for | ❌ They mark you down for |
|---|---|
| Correct **status codes** (201, 400, 404) | Returning 200 for everything |
| **Input validation** | Trusting whatever the client sends |
| **Error handling** — `try/catch`, clear messages | The server crashing on bad input |
| Clean, small functions and good names | One 200-line function |
| Loading and error states in the UI | Only the happy path |
| Talking through your decisions | Coding in silence |

---
---

# A. CREATE AN API

---

### K1. ⭐ Build a CRUD REST API with Express (in memory) — Easy (the most common task)
**Task:** an API for `patients` — list, get one, create, update, delete. No database; keep data in an array.

**What they check:** routes, status codes, validation, 404 handling, JSON responses.

```js
// npm install express
const express = require('express');
const app = express();
app.use(express.json());                        // ⭐ read JSON request bodies

let patients = [
  { id: 1, name: 'Ravi', phone: '9876500001' },
  { id: 2, name: 'Asha', phone: '9876500002' },
];
let nextId = 3;

// LIST — GET /patients
app.get('/patients', (req, res) => {
  res.json(patients);
});

// GET ONE — GET /patients/:id
app.get('/patients/:id', (req, res) => {
  const patient = patients.find((p) => p.id === Number(req.params.id));   // ⭐ params are strings
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  res.json(patient);
});

// CREATE — POST /patients
app.post('/patients', (req, res) => {
  const { name, phone } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'name is required' });
  }
  if (!/^\d{10}$/.test(phone || '')) {
    return res.status(400).json({ message: 'phone must be 10 digits' });
  }
  const patient = { id: nextId++, name: name.trim(), phone };
  patients.push(patient);
  res.status(201).json(patient);                // ⭐ 201 Created
});

// UPDATE — PATCH /patients/:id  (only the fields sent)
app.patch('/patients/:id', (req, res) => {
  const patient = patients.find((p) => p.id === Number(req.params.id));
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  const { name, phone } = req.body;             // ⭐ pick allowed fields — never Object.assign(req.body)
  if (name !== undefined) patient.name = name;
  if (phone !== undefined) patient.phone = phone;
  res.json(patient);
});

// DELETE — DELETE /patients/:id
app.delete('/patients/:id', (req, res) => {
  const before = patients.length;
  patients = patients.filter((p) => p.id !== Number(req.params.id));
  if (patients.length === before) return res.status(404).json({ message: 'Patient not found' });
  res.status(204).send();                       // ⭐ 204 No Content
});

// unknown routes
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// any error thrown in a route
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });   // never send the stack trace
});

app.listen(3000, () => console.log('API on http://localhost:3000'));
```

**Status codes used:** `200` OK · `201` created · `204` deleted · `400` bad input · `404` not found · `500` server error.

**Common mistakes:**
- Forgetting `express.json()` → `req.body` is `undefined`.
- Comparing `p.id === req.params.id` → `1 === '1'` is false. Convert with `Number()`.
- Returning `200` for create or for "not found".
- `Object.assign(patient, req.body)` → the client can overwrite `id` or any field (**mass assignment**).
- Forgetting `return` before `res.status(404)…` → "headers already sent" error.

### K2. Add pagination, search and sorting to the list — Easy/Medium
**Task:** `GET /patients?search=ra&page=2&limit=10&sort=name`

```js
app.get('/patients', (req, res) => {
  const search = String(req.query.search || '').toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));   // ⭐ cap the limit
  const sort = req.query.sort === 'name' ? 'name' : 'id';                    // ⭐ allow-list sort fields

  let result = patients.filter((p) => p.name.toLowerCase().includes(search));
  result = [...result].sort((a, b) => (a[sort] > b[sort] ? 1 : a[sort] < b[sort] ? -1 : 0));

  const total = result.length;
  const start = (page - 1) * limit;
  res.json({
    data: result.slice(start, start + limit),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});
```
**What they check:** query params are **strings** (convert them), a **maximum limit** so nobody asks for
a million rows, and only **allowed** sort fields.

### K3. ⭐ The same API in NestJS — Medium
**What they check:** controller / service split, DTO validation, proper exceptions.

```ts
// create-patient.dto.ts
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreatePatientDto {
  @IsString() @IsNotEmpty()
  name: string;

  @Matches(/^\d{10}$/, { message: 'phone must be 10 digits' })
  phone: string;
}
```
```ts
// patients.service.ts — the logic
@Injectable()
export class PatientsService {
  private patients: Patient[] = [];
  private nextId = 1;

  findAll() { return this.patients; }

  findOne(id: number) {
    const patient = this.patients.find((p) => p.id === id);
    if (!patient) throw new NotFoundException('Patient not found');   // → 404 automatically
    return patient;
  }

  create(dto: CreatePatientDto) {
    const patient = { id: this.nextId++, ...dto };
    this.patients.push(patient);
    return patient;
  }

  remove(id: number) {
    this.findOne(id);                                          // throws 404 if missing
    this.patients = this.patients.filter((p) => p.id !== id);
  }
}
```
```ts
// patients.controller.ts — only HTTP
@Controller('patients')
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Get() findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }   // ⭐ string → number

  @Post()
  create(@Body() dto: CreatePatientDto) { return this.service.create(dto); }          // 201 by default

  @Delete(':id') @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) { this.service.remove(id); }
}
```
```ts
// main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
```
**Say:** "The controller only handles HTTP, the service holds the logic, and the DTO validates input. With
`whitelist: true`, any field not in the DTO is removed, so nobody can sneak in extra fields."

### K4. Connect the API to a database (Prisma) — Medium
```prisma
// schema.prisma
model Patient {
  id        Int      @id @default(autoincrement())
  name      String
  phone     String   @unique
  createdAt DateTime @default(now())
}
```
```ts
@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  findAll(page = 1, limit = 10) {
    return this.prisma.patient.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async create(dto: CreatePatientDto) {
    try {
      return await this.prisma.patient.create({ data: dto });
    } catch (e) {
      if (e.code === 'P2002') throw new ConflictException('Phone already registered');  // unique error → 409
      throw e;
    }
  }
}
```
**What they check:** `await`, turning a duplicate into **409 Conflict** instead of a 500, and pagination.

### K5. Middleware — logging and a simple auth check — Easy
```js
// log every request with how long it took
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`));
  next();                                           // ⭐ always call next()
});

// protect routes with an API key
function requireApiKey(req, res, next) {
  if (req.headers['x-api-key'] !== process.env.API_KEY) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  next();
}

app.use('/admin', requireApiKey);                    // only /admin routes need the key
```
**Common mistake:** forgetting `next()` — the request hangs forever.
**401 vs 403:** 401 = who are you? (no/bad credentials). 403 = I know you, but you are not allowed.

### K6. JWT login and a protected route — Medium
```js
// npm install jsonwebtoken bcrypt
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ message: 'Invalid email or password' });   // same message both ways

  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
  res.json({ token });
});

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

app.get('/me', auth, (req, res) => res.json({ userId: req.user.sub }));
```
**What they check:** passwords **hashed** (never plain), the secret from **env**, an **expiry** on the
token, and the same error message for a wrong email and a wrong password.

### K7. ⭐ Upload a file — Easy/Medium
```js
// npm install multer
const multer = require('multer');
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },                               // 5 MB max
  fileFilter: (req, file, cb) => cb(null, ['image/png', 'image/jpeg', 'application/pdf'].includes(file.mimetype)),
});

app.post('/reports', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A PNG, JPG or PDF file is required' });
  res.status(201).json({ filename: req.file.filename, size: req.file.size });
});
```
**Say:** "For production I would upload straight to S3 with a presigned URL, so big files never pass
through my server — and I always limit the size and type."

---
---

# B. CALL AN API

> Practice API (free, no key): `https://jsonplaceholder.typicode.com/users`

---

### K8. ⭐ Fetch data with `fetch` + async/await — Easy (asked constantly)
**Task:** get the users and print their names. Handle errors properly.

```js
async function getUsers() {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/users');
    if (!res.ok) {                                         // ⭐ fetch does NOT throw on 404 or 500
      throw new Error(`Request failed: ${res.status}`);
    }
    const users = await res.json();
    return users.map((u) => u.name);
  } catch (err) {
    console.error('Could not load users:', err.message);   // network error OR bad status
    return [];
  }
}

getUsers().then(console.log);
```
**⭐ The one thing they test:** `fetch` only rejects on a **network failure**. A 404 or 500 still
"succeeds", so you **must check `res.ok`**.

### K9. POST data to an API — Easy
```js
async function createPost(title, body) {
  const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },      // ⭐ tell the server it is JSON
    body: JSON.stringify({ title, body, userId: 1 }),       // ⭐ must be a string
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}
```
**Common mistakes:** sending the object without `JSON.stringify`, or forgetting the `Content-Type` header.

### K10. Call an API with axios — Easy
```js
// npm install axios
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 5000,                                   // ⭐ never wait forever
});

// add the auth token to every request
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});

async function getUser(id) {
  try {
    const { data } = await api.get(`/users/${id}`);      // axios parses JSON for you
    return data;
  } catch (err) {
    if (err.response) console.error('Server said', err.response.status);   // got a response
    else console.error('Network problem or timeout');                       // no response
    throw err;
  }
}
```
**fetch vs axios:**

| | fetch | axios |
|---|---|---|
| Built in | ✅ Yes | Needs install |
| Throws on 404/500 | ❌ No — check `res.ok` | ✅ Yes |
| JSON | `await res.json()` | Automatic (`data`) |
| Timeout | `AbortSignal.timeout(ms)` | `timeout` option |
| Interceptors | No | ✅ Yes |

### K11. ⭐ Call several APIs — in parallel vs one after another — Easy/Medium
```js
const base = 'https://jsonplaceholder.typicode.com';
const getJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
};

// ❌ SLOW — one after another (the second waits for the first)
const user = await getJson(`${base}/users/1`);
const posts = await getJson(`${base}/posts?userId=1`);

// ✅ FAST — both at the same time (they do not depend on each other)
const [user2, posts2] = await Promise.all([
  getJson(`${base}/users/1`),
  getJson(`${base}/posts?userId=1`),
]);

// ✅ When some may fail and you still want the rest
const results = await Promise.allSettled([1, 2, 3].map((id) => getJson(`${base}/users/${id}`)));
const loaded = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
```
**Say:** "If two calls do not depend on each other, I run them in parallel. `Promise.all` fails if any one
fails; `Promise.allSettled` gives me every result."
**Trap:** `ids.forEach(async (id) => await getJson(...))` does **not** wait — use `for...of` or `Promise.all`.

### K12. Fetch all pages of a paginated API — Medium
```js
async function fetchAllPosts() {
  const all = [];
  let page = 1;
  const limit = 20;
  while (true) {
    const res = await fetch(`https://jsonplaceholder.typicode.com/posts?_page=${page}&_limit=${limit}`);
    if (!res.ok) throw new Error(`Page ${page} failed: ${res.status}`);
    const items = await res.json();
    all.push(...items);
    if (items.length < limit) break;             // last page
    page++;
  }
  return all;
}
```
**Follow-up:** add a safety limit (for example 100 pages) so a bug cannot loop forever.

### K13. ⭐ Retry a failing request, with a timeout — Medium
```js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, { retries = 3, timeoutMs = 5000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return await res.json();

      const err = new Error(`Request failed: ${res.status}`);
      err.retryable = res.status >= 500 || res.status === 429;   // 400 / 404 will never succeed
      throw err;
    } catch (err) {
      const retryable = err.retryable ?? true;        // network errors and timeouts: try again
      if (!retryable || attempt === retries) throw err;
      await sleep(500 * 2 ** attempt);            // wait 0.5s, 1s, 2s … (exponential backoff)
    }
  }
}
```
**What they check:** retry only **temporary** errors (500, 429, timeouts) — never a 400 or 404 — and wait
**longer each time**.

---
---

# C. REACT TASKS

---

### K14. ⭐ Show a list from an API — with loading and error states — Easy (very common)
```jsx
import { useEffect, useState } from 'react';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('https://jsonplaceholder.typicode.com/users', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then(setUsers)
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();            // ⭐ cancel if the component unmounts
  }, []);                                        // ⭐ empty array = run once

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Could not load users: {error}</p>;
  if (users.length === 0) return <p>No users found.</p>;

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name} — {u.email}</li>      /* ⭐ a stable key, not the index */
      ))}
    </ul>
  );
}
```
**What they check:** the **three states** (loading, error, empty), a correct `key`, the dependency array,
and cleanup.

### K15. Search box that filters the list — Easy
```jsx
const [query, setQuery] = useState('');

const visible = users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));   // derived — not state

return (
  <>
    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" />
    <ul>{visible.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
  </>
);
```
**⭐ Point to say:** the filtered list is **calculated** from `users` and `query` — do not store it in
another `useState`, or the two get out of sync.
**If the search calls the server:** debounce it (wait ~300ms after typing stops) and cancel the old request.

### K16. ⭐ A form that POSTs to an API — Easy/Medium
```jsx
function AddPatientForm({ onAdded }) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();                                     // ⭐ stop the page reload
    if (!form.name.trim()) return setError('Name is required');
    if (!/^\d{10}$/.test(form.phone)) return setError('Phone must be 10 digits');

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Save failed');
      onAdded(await res.json());
      setForm({ name: '', phone: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={form.name} onChange={update} placeholder="Name" />
      <input name="phone" value={form.phone} onChange={update} placeholder="Phone" />
      {error && <p role="alert">{error}</p>}
      <button disabled={saving}>{saving ? 'Saving…' : 'Add patient'}</button>   {/* ⭐ no double submit */}
    </form>
  );
}
```
**What they check:** `preventDefault`, validation before sending, the button **disabled while saving**,
and showing the server's error.

### K17. Counter / todo list — the warm-up tasks — Easy
```jsx
function Todos() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');

  const add = () => {
    if (!text.trim()) return;
    setTodos((prev) => [...prev, { id: Date.now(), text, done: false }]);   // ⭐ new array, not push
    setText('');
  };
  const toggle = (id) => setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id) => setTodos((prev) => prev.filter((t) => t.id !== id));

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={add}>Add</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            <span onClick={() => toggle(t.id)} style={{ textDecoration: t.done ? 'line-through' : 'none' }}>
              {t.text}
            </span>
            <button onClick={() => remove(t.id)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```
**⭐ The rule they test:** never change state directly (`todos.push(...)`). Always create a **new** array
or object — otherwise React may not re-render.

---
---

# D. SMALL NODE TASKS

---

### K18. Read a JSON file and summarise it — Easy
**Task:** `appointments.json` → count of appointments per doctor.
```js
const fs = require('fs/promises');

async function summarise(path) {
  const raw = await fs.readFile(path, 'utf8');
  const appointments = JSON.parse(raw);
  const perDoctor = {};
  for (const a of appointments) perDoctor[a.doctor] = (perDoctor[a.doctor] || 0) + 1;
  return perDoctor;
}

summarise('./appointments.json')
  .then(console.log)
  .catch((err) => console.error('Could not read the file:', err.message));
```
**What they check:** async file reading (not `readFileSync` inside a server), and handling a missing file
or invalid JSON.

### K19. ⭐ A backend endpoint that calls another API and reshapes the data — Medium
**Task:** `GET /users/:id/summary` → call the public API, return only what the frontend needs, cache it.
```js
const cache = new Map();                        // id → { data, expires }

app.get('/users/:id/summary', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const hit = cache.get(id);
    if (hit && hit.expires > Date.now()) return res.json(hit.data);

    const [userRes, postsRes] = await Promise.all([
      fetch(`https://jsonplaceholder.typicode.com/users/${id}`),
      fetch(`https://jsonplaceholder.typicode.com/posts?userId=${id}`),
    ]);
    if (userRes.status === 404) return res.status(404).json({ message: 'User not found' });
    if (!userRes.ok || !postsRes.ok) return res.status(502).json({ message: 'Upstream service failed' });

    const user = await userRes.json();
    const posts = await postsRes.json();
    const data = { id: user.id, name: user.name, city: user.address.city, postCount: posts.length };

    cache.set(id, { data, expires: Date.now() + 60_000 });     // cache for 60 seconds
    res.json(data);
  } catch (err) {
    next(err);                                                  // goes to the error handler
  }
});
```
**What they check:** parallel calls, **502** when the other service fails (it is not *your* bug), only
returning the fields needed, and a simple cache.

### K20. Simple rate limiter middleware — Medium
**Task:** max 5 requests per minute per IP.
```js
function rateLimit({ max = 5, windowMs = 60_000 } = {}) {
  const hits = new Map();                                 // ip → { count, resetAt }
  return (req, res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip);
    if (!entry || now > entry.resetAt) {
      hits.set(req.ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      res.set('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ message: 'Too many requests, try again later' });
    }
    entry.count++;
    next();
  };
}

app.post('/login', rateLimit({ max: 5 }), loginHandler);
```
**Say:** "This works for one server. With several servers I would keep the counter in Redis, so all servers
share it."

---
---

# How to do a take-home task

1. **Read twice. Ask questions** before starting — "Is a database required? Which Node version?"
2. **Make it work first**, then make it clean. A simple working solution beats a clever unfinished one.
3. **Structure:** routes → controller → service. Keep business logic out of route handlers.
4. **Validate input and handle errors** — every endpoint, every API call.
5. **Write a few tests** — at least the main flow and one error case.
6. **Write a README:** how to install, how to run, how to test, and **what you would improve with more time**.
7. **Commit in small steps** with clear messages — reviewers read the history.
8. **Stay inside the time limit.** List the trade-offs you made instead of over-building.

### Checklist before you submit
- [ ] It runs from a fresh clone with the README steps
- [ ] Correct status codes (201, 204, 400, 404, 409, 500)
- [ ] Input validation with clear error messages
- [ ] No secrets in the code — use `.env` and give a `.env.example`
- [ ] Loading, error and empty states in any UI
- [ ] A few meaningful tests
- [ ] README with setup, decisions, and "what I would do next"
