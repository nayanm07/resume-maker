# 11 — Authentication, Authorization & Security

> Easy English. Short lines. Say them out loud.
> **Time:** ~3.5 hours · **Pairs with:** [10 — Multi-Tenant SaaS](10-multi-tenant-saas.md), [06 — Redis](06-redis.md)

---

## 0. The 30-second answer (memorise this)

> 💬 **"Explain authentication and authorization."**
>
> "Authentication is **who are you**. Authorization is **what are you allowed to do**.
>
> Login checks the password against a bcrypt hash. Then I issue a short-lived access token and a
> long-lived refresh token. The access token carries the user, the tenant and the role, so every
> request can be checked without a database call.
>
> Authorization happens on the server, on every request. A guard checks the role and the permission,
> and the data layer scopes the query to the tenant — so even a valid token cannot read another
> customer's row.
>
> The two mistakes I design against are: trusting anything the client sends, and checking permission
> only in the UI."

---

## 1. The difference, in the simplest words

**Authentication (AuthN) = who are you?**
Showing your ID card at the office gate.

**Authorization (AuthZ) = what can you do?**
Your ID card opens the office door, but not the server room.

| | Authentication | Authorization |
|---|---|---|
| Question | Who are you? | What may you do? |
| Happens | Once, at login | On **every** request |
| Fails with | 401 Unauthorized | 403 Forbidden |
| Example | Email + password, Google login | Admin can delete, staff cannot |

⚠️ The HTTP names are confusing: **401 actually means "not authenticated"**, and 403 means
"authenticated, but not allowed". Say that — it shows you know the detail.

---

## 2. Passwords — how to store them

**Never store the password itself. Never encrypt it. Hash it.**

| Word | Meaning | Reversible? |
|---|---|---|
| **Encoding** (base64) | Just a format change | Yes — not security at all |
| **Encryption** | Locked with a key | Yes, with the key |
| **Hashing** | One-way fingerprint | **No** |

For passwords use a **slow** hash made for passwords: **bcrypt** or **argon2**.

```ts
const hash = await bcrypt.hash(password, 12);        // 12 = cost factor
const ok   = await bcrypt.compare(password, hash);   // constant-time compare
```

**Why slow is good:** an attacker who steals your database wants to try billions of guesses.
SHA-256 is fast, so they can try billions per second. bcrypt takes ~100 ms per try, so the same
attack takes years.

**Salt:** a random value mixed into each password before hashing.
Why? Without salt, two users with the same password get the same hash — and attackers use
pre-computed tables (rainbow tables). bcrypt stores the salt inside the hash automatically.

**Also do:**
- Minimum length over complexity rules. Length wins.
- Check the password against a list of leaked passwords if you can.
- On login failure, always say "email or password is wrong" — never "this email does not exist".
  Otherwise you have given away who is a customer (**user enumeration**).
- Make login take a similar time whether or not the user exists (timing attacks).

---

## 3. Sessions vs JWT — the real trade-off

| | **Session (stateful)** | **JWT (stateless)** |
|---|---|---|
| Where is the truth | On the server (Redis/DB) | Inside the token itself |
| Every request | Look up the session | Just verify the signature |
| Logout / ban a user | Delete the session — instant ✅ | ⚠️ Hard — the token stays valid until it expires |
| Scaling | Needs shared storage (Redis) | Nothing shared needed |
| Size | Small ID in a cookie | Bigger token on every request |
| Best for | Normal web apps, admin panels | APIs, mobile apps, service-to-service |

> 💬 **The honest answer:** "JWT is not automatically better. It removes a lookup, but it also
> removes control — I cannot un-issue a token. So I keep access tokens short, usually 15 minutes,
> and keep a denylist in Redis for logout and for banning a user immediately."

---

## 4. JWT — the parts you must know

A JWT is three parts joined by dots:

```
header . payload . signature
eyJhbGciOi... . eyJzdWIiOiI0Mi... . SflKxwRJSMeKK...
```

- **Header** — which algorithm.
- **Payload** — the claims (the data).
- **Signature** — proof that the payload was not changed.

⚠️ **The payload is only base64, not encrypted. Anyone can read it.**
So never put a password, a card number or anything secret inside a JWT.

**Standard claims to know:**

| Claim | Meaning |
|---|---|
| `sub` | Subject — the user ID |
| `exp` | Expiry time ⭐ always set this |
| `iat` | Issued at |
| `jti` | Token ID — useful for a denylist |
| `iss` / `aud` | Who issued it / who it is for — verify both |

**Signing:**
- **HS256** — one shared secret. Simple. Fine when the same service signs and verifies.
- **RS256** — private key signs, public key verifies. Use when *other* services must verify without
  being able to create tokens.

**Two classic attacks to name:**
1. **`alg: none`** — an attacker changes the header to say "no algorithm" and removes the signature.
   A badly configured library accepts it. Fix: always specify the allowed algorithms when verifying.
2. **Key confusion** — sending an HS256 token to a server expecting RS256, using the public key as
   the secret. Same fix: pin the algorithm.

---

## 5. Access token + refresh token (the standard flow)

```
Login → access token (15 min)  +  refresh token (7–30 days)

Access token expires → client sends the refresh token → gets a new pair
Refresh token is rotated: the old one is invalidated
```

**Why two tokens?** The access token is sent everywhere, so it should be short-lived. The refresh
token is sent rarely, only to one endpoint, so it can live longer and be stored more carefully.

**Refresh token rotation + reuse detection** (the part that impresses):

> "Every refresh returns a new refresh token and kills the old one. If an old one is ever used
> again, that means someone copied it — so I revoke the whole family of tokens for that user and
> force a fresh login. That turns token theft into a detectable event."

**Where do you store tokens on the client?**

| Place | XSS risk | CSRF risk | Notes |
|---|---|---|---|
| `localStorage` | ❌ Any injected script can read it | Safe | Common for SPAs, but XSS = full account takeover |
| **httpOnly cookie** | ✅ Script cannot read it | ⚠️ Needs `SameSite` / CSRF token | Best for browsers |
| Mobile secure storage | ✅ Keychain / Keystore | n/a | Best for apps |

Cookie flags to say: `httpOnly`, `Secure`, `SameSite=Lax` (or `Strict`), correct `Domain`/`Path`.

---

## 6. OAuth2 / OIDC / social login — in plain words

**OAuth2 = giving an app permission without giving it your password.**

Like a hotel key card: it opens your room, for a few days, and the hotel can cancel it. You never
hand over the master key.

Three parties:
1. **The user** (resource owner)
2. **Your app** (client)
3. **The provider** — Google, the authorization server

**Authorization Code flow with PKCE** (the one to use today):

```
1. Your app sends the user to Google
2. The user logs in and approves
3. Google redirects back with a short CODE
4. Your server swaps the CODE for tokens (server-to-server)
```

Why a code and not the token directly? The code is useless without the second step, so nothing
sensitive travels through the browser URL. **PKCE** adds a random value so a stolen code cannot be
used by anyone else. It is now recommended for **all** clients, not just mobile.

**OAuth2 vs OIDC:** OAuth2 is about **permission** (can this app read your files?).
**OIDC** is a layer on top of it that also tells you **who the user is** — that is the `id_token`.
Social login = OIDC.

Also worth naming: **SAML** and enterprise **SSO** — older XML-based, still used by big companies.

---

## 7. Multi-factor (MFA / OTP)

**Something you know** (password) + **something you have** (phone) + **something you are** (fingerprint).

| Method | Note |
|---|---|
| **TOTP** (Google Authenticator) | A code from a shared secret + the current time. Works offline. ✅ Good. |
| **SMS OTP** | Common in India, but weakest — SIM swap, SMS interception |
| **Push / passkeys** | Strongest and easiest today |

Rules for OTP that interviewers listen for:
- Store the OTP **hashed** with a short TTL in Redis, not in plain text.
- Limit attempts — 5 tries, then lock. Otherwise a 6-digit code is guessable.
- Rate limit sending, or you become an SMS bill attack.
- One-time really means one-time: delete it after a successful check.
- Give backup codes, or people get locked out forever.

---

## 8. Authorization models — RBAC and beyond

| Model | Idea | Example |
|---|---|---|
| **RBAC** (roles) | Permissions attached to a role | `admin`, `doctor`, `receptionist` |
| **ABAC** (attributes) | Rules based on facts | "A doctor can see a patient **in their own clinic**" |
| **ReBAC** (relationships) | Based on a link between user and object | "The owner of this document can share it" |

Most products need **RBAC + one attribute: the tenant**. That is exactly your case.

**Roles vs permissions:** roles are for humans, permissions are for code.
Do not write `if (user.role === 'admin')` everywhere. Give the role a set of permissions and check
the permission: `if (can(user, 'appointment:delete'))`. Then adding a new role does not require code
changes.

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('appointment:delete')
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

**Three rules to say out loud:**
1. **Always check on the server.** Hiding a button in the UI is not security.
2. **Check ownership, not only role.** A doctor may delete appointments — but only in their clinic.
   Role check + tenant/owner check, always both. ([10 §5](10-multi-tenant-saas.md).)
3. **Default deny.** A new endpoint with no decorator should be closed, not open.

---

## 9. API keys, machine-to-machine and webhooks

**API keys** (for your partner API):
- Store a **hash** of the key, never the key itself — it is a password.
- Show it once at creation. If they lose it, they rotate it.
- Give it a visible prefix (`sk_live_ab12…`) so it can be identified in logs and scanners.
- Give it **scopes** and a tenant, and support rotation with two active keys during the switch.
- Rate limit per key ([06 §6](06-redis.md)).

**Webhook signatures** (receiving events from Razorpay, etc.):

```ts
const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new ForbiddenException();
```

Four details that matter:
1. Use the **raw body**. If you parse JSON first and re-stringify, the signature will not match.
2. Use `timingSafeEqual`, not `===`.
3. Check the **timestamp** in the signature and reject anything older than ~5 minutes — otherwise an
   old valid request can be replayed.
4. Then still be **idempotent**, because providers retry. ([07 §7](07-bullmq.md).)

---

## 10. The attacks you should be able to name

| Attack | In one line | Fix |
|---|---|---|
| **IDOR / BOLA** ⭐ | Change the ID in the URL and read someone else's data | Always scope by user/tenant; return 404 |
| **SQL injection** | Input becomes part of the SQL | Parameterised queries / the ORM. Never string concatenation |
| **XSS** | Attacker's JavaScript runs in your page | Escape output, use a Content-Security-Policy, never `dangerouslySetInnerHTML` with user text |
| **CSRF** | Another site makes the browser send a request with your cookie | `SameSite` cookies + a CSRF token. Not an issue for `Authorization:` header APIs |
| **SSRF** | You fetch a URL the user gave, and it points to internal infrastructure | Allow-list hosts, block private IP ranges |
| **Mass assignment** | `{ "role": "admin" }` in the body gets saved | DTO with a whitelist; never `update(req.body)` |
| **Brute force** | Guessing passwords or OTPs | Rate limit, lockout, captcha |
| **Path traversal** | `../../etc/passwd` in a filename | Normalise and validate the path |
| **Sensitive data exposure** | Tokens or PII in logs and errors | Redact in the logger; generic error messages |

**CORS — say it correctly:**
> "CORS is a **browser** rule, not a security wall. It controls which websites can read your
> response in a browser. It does not stop a server, curl or Postman. So CORS is never the thing
> protecting my data — authentication and authorization are."

That single correction impresses interviewers, because most people get CORS wrong.

**Security headers worth naming:** `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Content-Type-Options: nosniff`, `X-Frame-Options`. In Node, `helmet` sets sensible defaults.

---

## 11. Secrets, encryption and data protection

- **Never commit secrets.** If one leaks, rotate it — deleting the commit is not enough, it is in the
  history and probably already scraped.
- Use environment variables locally, and a secrets manager in production (AWS Secrets Manager, SSM,
  Vault). Rotate regularly.
- **TLS everywhere** — `https` and `wss`. Redirect HTTP to HTTPS. HSTS on.
- **Encryption at rest** for sensitive fields (health data, ABDM certificates, tokens you must
  re-use). Keep the key in a KMS, not in the database next to the data.
- **Hash** what you never need to read back (passwords, API keys).
  **Encrypt** what you must read back later (a third-party token).
- Log **who did what**, never the token itself. Redact `authorization`, `password`, `otp`, `card`.

---

## 12. Code reference (NestJS)

```ts
// login
const user = await this.users.findByEmail(dto.email);
const ok = user && await bcrypt.compare(dto.password, user.passwordHash);
if (!ok) throw new UnauthorizedException('Invalid email or password');   // same message both ways

const accessToken  = await this.jwt.signAsync(
  { sub: user.id, tenantId: user.tenantId, role: user.role },
  { expiresIn: '15m' },
);
const refreshToken = await this.issueRefresh(user.id);   // random, hashed, stored, rotated

// guard
@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const required = this.reflector.get<string[]>('permissions', ctx.getHandler());
    if (!required) return false;                       // ⭐ default deny
    const { user } = ctx.switchToHttp().getRequest();
    return required.every((p) => user.permissions.includes(p));
  }
}

// logout — a JWT cannot be un-issued, so deny-list it for its remaining life
const ttl = payload.exp - Math.floor(Date.now() / 1000);
if (ttl > 0) await redis.set(`jwt:blocked:${payload.jti}`, '1', 'EX', ttl);
```

---

## 13. Maps to YOUR projects

| Project | Security work | The sentence to say |
|---|---|---|
| **Clinic Cloud** | RBAC per clinic | "Role plus tenant, always both — a doctor's permission only applies inside their own clinic" |
| **Clinic Cloud** | ABDM certificates | "Encrypted at rest, cached in Redis with a TTL, never logged" |
| **Partner API** | API keys | "Hashed at rest, scoped, rate limited per key, rotatable with an overlap window" |
| **Payments** | Webhook signatures | "HMAC over the raw body, timing-safe compare, timestamp window, and idempotent processing" |
| **Interview AI** | Multi-tenant isolation | "The tenant comes from the signed token, never the request body" |
| **All** | Logout | "Short access tokens plus a Redis denylist keyed by `jti`, expiring with the token" |

---

## 14. Model answers (say these out loud)

**Q: Difference between authentication and authorization?** → §1, plus 401 vs 403.

**Q: How do you store passwords?** → §2. bcrypt/argon2, salt, cost factor, and why slow is the point.

**Q: Session or JWT — which and why?** → §3's honest answer. Mention the logout problem yourself.

**Q: How do you log out a JWT user?**
> "Strictly, you cannot un-issue a JWT. So access tokens are short — 15 minutes — and on logout I
> put the token's `jti` in a Redis denylist with a TTL equal to its remaining life. The list cleans
> itself and stays small. The refresh token is deleted server-side, so no new access token can be
> minted."

**Q: What is in a JWT? Is it safe to put the role in it?**
> "It is signed, not encrypted — anyone can read the payload, so no secrets go in. The role is fine
> to include, because the signature proves it was not changed. But for anything that must be revoked
> instantly, I check the server, since the token stays valid until it expires."

**Q: Explain OAuth2 in simple terms.** → §6's hotel key card + the 4-step code flow + PKCE.

**Q: How do you implement RBAC?** → §8. Permissions not roles in the code, default deny, and always
role + ownership.

**Q: How do you secure a public API?**
> "API keys hashed at rest with scopes and a tenant, rate limiting per key, HTTPS only, strict input
> validation with DTOs, pagination limits so one call cannot pull everything, idempotency keys on
> writes, and an audit log. Errors stay generic so they do not leak internals."

**Q: How do you verify a webhook?** → §9's four details.

**Q: What is CORS?** → §10's correction. It is a browser rule, not protection.

**Q: What are the top security risks in a web app?** → §10's table. Lead with IDOR, because it is the
one that actually happens.

---

## 15. Rapid-fire one-liners

| Word | One line |
|---|---|
| **AuthN** | Who are you |
| **AuthZ** | What can you do |
| **401 / 403** | Not logged in / logged in but not allowed |
| **Hashing** | One-way; used for passwords |
| **Salt** | Random value per password so equal passwords differ |
| **bcrypt cost** | How slow the hash is; higher = harder to crack |
| **JWT** | Signed token: header, payload, signature |
| **Claim** | A field inside the token (`sub`, `exp`, `jti`) |
| **HS256 / RS256** | Shared secret / private-public key pair |
| **Access token** | Short-lived, sent on every request |
| **Refresh token** | Long-lived, only used to get a new access token |
| **Rotation** | Each refresh replaces the old refresh token |
| **Reuse detection** | An old refresh token used again = theft; revoke everything |
| **Denylist** | Redis list of revoked token IDs |
| **OAuth2** | Permission without sharing your password |
| **OIDC** | OAuth2 + identity (`id_token`) |
| **PKCE** | Extra proof so a stolen auth code is useless |
| **TOTP** | Time-based one-time code from an app |
| **RBAC / ABAC** | Roles / attribute rules |
| **Default deny** | No permission declared = blocked |
| **IDOR** | Changing an ID to reach someone else's data |
| **CSRF** | Another site uses your cookie; fix with SameSite + token |
| **XSS** | Attacker JavaScript runs in your page |
| **SSRF** | Your server fetches an internal URL for the attacker |
| **HMAC** | Signature proving a webhook really came from the provider |
| **CORS** | Browser rule about who can read your response — not a wall |
| **Helmet** | Sets safe HTTP security headers |

---

## 16. Self-check

- [ ] Explain AuthN vs AuthZ, and 401 vs 403
- [ ] Explain hashing vs encryption vs encoding
- [ ] Say why bcrypt is slow on purpose, and what salt does
- [ ] Draw the three parts of a JWT and say what is signed
- [ ] Explain why you cannot log out a JWT, and your fix
- [ ] Explain access + refresh, rotation, and reuse detection
- [ ] Say where to store a token in a browser and the trade-off
- [ ] Explain OAuth2 in 4 steps, and what PKCE adds
- [ ] Explain RBAC with permissions and default deny
- [ ] Say why role checks alone are not enough (tenant/ownership)
- [ ] List the 4 rules of verifying a webhook
- [ ] Name 6 attacks and one fix each
- [ ] Explain what CORS really is

---

## 17. Traps — how people lose this round

1. **"JWT is more secure than sessions."** It is not — it is stateless. Different, not safer.
2. **Putting secrets in a JWT payload.** It is readable by anyone.
3. **No `exp` on a token.** A token valid forever is a permanent key.
4. **Checking permission only in the frontend.**
5. **Checking the role but not the owner or tenant** → the IDOR hole.
6. **Storing API keys or reset tokens in plain text.**
7. **Using `===` to compare signatures** instead of a timing-safe compare.
8. **Verifying a webhook after parsing the body.** The bytes must be the original.
9. **"CORS protects my API."** It does not.
10. **Different error messages for "no such user" and "wrong password."** User enumeration.
11. **No rate limit on login, OTP or password reset.**
12. **Logging the Authorization header** — tokens end up in log storage forever.
13. **Committing a `.env` file** and thinking deleting the commit fixes it. Rotate the secret.
14. **A password reset link with no expiry, or reusable.**

---

## 18. Scenario questions — "what will you do if…"

The shape is always: **say the cause → fix it now → stop it happening again.**

---

**S1. A secret key was pushed to GitHub. What do you do?**
> "Assume it is already stolen — bots scan public repos within minutes.
> First, **rotate the key** and revoke the old one. Then check the logs for any use of it while it
> was exposed. Removing the commit is not enough; it is in the history and in forks.
> Prevention: secrets only in a secrets manager, a `.gitignore` for `.env`, and a pre-commit secret
> scanner in CI so this cannot be pushed again."

**S2. You must ban a user immediately, but they hold a valid JWT for 15 more minutes.**
> "That is the known cost of stateless tokens. I put their `jti` — or all their sessions — in a Redis
> denylist that every request checks. The entry expires when the token would have expired, so the
> list stays small.
> I also delete their refresh tokens, so nothing new can be minted. If a product needs instant
> revocation everywhere, that is an argument for shorter tokens or server-side sessions."

**S3. Someone is brute-forcing your login endpoint.**
> "Rate limit by IP **and** by account, because one attacker rotates IPs and one account can be
> attacked from many. After N failures I add a delay, then a temporary lock, then a captcha.
> I keep the error message identical for wrong email and wrong password, so they learn nothing.
> And I alert on a spike in 401s — that is the real signal."

**S4. A user reports they can see another user's invoice by changing the URL.**
> "IDOR, and it is a security incident. The query looked up the record by ID only.
> Immediate fix: scope every lookup by the owner or tenant, and return **404** rather than 403.
> Then I check the access logs to see if anyone actually did it. Long term I make the data layer
> apply the scope automatically, and add a test that tries to read another user's record."

**S5. Your OTP endpoint is being used to send thousands of SMS.**
> "That is an SMS bombing / cost attack. I rate limit per phone number, per IP and globally.
> I add a cooldown between sends, a captcha after a few attempts, and a daily cap per number.
> I also hash the OTP with a short TTL and limit verification attempts to 5, so a 6-digit code
> cannot be guessed."

**S6. A penetration test says your JWT accepts `alg: none`.**
> "The library was verifying without pinning the algorithm, so a token with the signature removed was
> accepted. Fix: specify allowed algorithms explicitly on verify, and reject anything else.
> Then rotate the signing key, because any token could have been forged, and check for suspicious
> access while it was open."

**S7. A user's laptop was stolen. They want every session logged out.**
> "'Log out everywhere' means invalidating all tokens for that user. I keep a per-user token version
> or a session list; increasing that version makes every existing access token fail on the next
> request, and I delete all refresh tokens.
> That is a good reason to keep some server-side state even with JWTs."

**S8. The frontend team asks you to store the JWT in localStorage. Is that OK?**
> "It works, but any XSS becomes a full account takeover, because scripts can read localStorage.
> I prefer an httpOnly, Secure, SameSite cookie so JavaScript cannot read the token, and then handle
> CSRF with SameSite plus a CSRF token.
> If they must use localStorage, then XSS protection has to be strict — output escaping, a strict
> CSP, and short token lifetimes."

**S9. A payment webhook arrived twice and the customer was charged twice.**
> "Two separate bugs. The duplicate is expected — providers retry until they get a 2xx.
> The real bug is that my handler was not idempotent. I store the provider's event ID with a unique
> constraint, inside the same transaction as the effect, so the second delivery is a no-op.
> I also verify the HMAC signature on the raw body with a timing-safe compare and a timestamp window,
> so replays are rejected."

**S10. Support asks you to email a customer their password because they forgot it.**
> "I cannot, and that is by design — passwords are hashed, so nobody can read them, including me.
> I send a password reset link instead: a single-use token, short expiry, invalidated after use, and
> the reset also logs out other sessions.
> If a company *can* email you your password, it means they stored it in a readable form."

**S11. Your API is public and someone is scraping all the data with a valid key.**
> "It is authorized, so this is abuse rather than a breach. I rate limit per key, add pagination
> limits so one call cannot pull everything, and look at usage patterns per key.
> Then scopes: that key should only reach the endpoints it needs. And I alert on unusual volume so I
> notice on day one, not at month end."

**S12. The interviewer asks: design login for a mobile app.**
> "Email and password over HTTPS, bcrypt on the server. On success, a 15-minute access token and a
> long-lived refresh token stored in the device Keychain or Keystore, never in plain storage.
> The refresh rotates on every use with reuse detection. Biometric unlock protects the local refresh
> token. Logout deletes the refresh token server-side and denylists the current access token.
> And every request still carries the tenant from the token, not from the app."

**S13. A developer wants to disable CORS to fix an error quickly.**
> "The error is a symptom — the browser is telling us the origin is not allowed. Setting
> `origin: '*'` with credentials is not allowed anyway, and it hides the real problem.
> I set an explicit allow-list of our own front-end origins. And I would explain that CORS was never
> the protection here — the auth check is. Turning it off does not open the API to attackers who use
> curl, but it does open our users to hostile websites."
