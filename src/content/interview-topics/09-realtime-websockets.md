# 09 — Real-Time Systems (WebSocket / Socket.IO)

> Easy English. Short lines. Say them out loud.
> **Time:** ~2.5 hours · **Pairs with:** [06 — Redis](06-redis.md) (Pub/Sub) and [07 — BullMQ](07-bullmq.md)

---

## 0. The 30-second answer (memorise this)

> 💬 **"How do you build real-time features?"**
>
> "Normal HTTP is one-way. The client asks, the server answers, the line closes.
> So the server cannot tell the client 'something happened'.
>
> A WebSocket keeps the line open. Both sides can send a message any time. No new request needed.
>
> I use Socket.IO on top of it, because it gives me reconnection, rooms and fallbacks for free.
>
> The two hard parts are not the connection. They are **scaling** — when I run 3 servers, users are
> connected to different ones, so I fan out through Redis Pub/Sub — and **reconnection** — the
> phone loses network, so on reconnect the client re-fetches state instead of trusting the stream."

The last paragraph is what separates a junior answer from a senior one.

---

## 1. The problem, in simple words

**HTTP is like sending a letter.**
You write. You post it. You get one reply. Done. The connection closes.

If you want to know when something changes, you must keep sending letters.
"Anything new?" "Anything new?" "Anything new?"

**A WebSocket is like a phone call.**
You dial once. The line stays open.
Either side can speak at any moment. No dialling again.

That is the whole idea.

---

## 2. The four ways to get updates (know all four)

| Way | How it works | Good | Bad |
|---|---|---|---|
| **Short polling** | Client asks every 5 seconds: "anything new?" | Very simple. Works everywhere. | Wasteful. 99% of answers are "no". Up to 5s late. |
| **Long polling** | Client asks. Server **holds** the request until there is news, then answers. Client asks again. | Near real-time, still plain HTTP | Holds a connection anyway. Heavy on the server. |
| **SSE** (Server-Sent Events) | One long HTTP connection. Server pushes text. **One direction only.** | Simple, auto-reconnects, plain HTTP | Server → client only. Client cannot send. |
| **WebSocket** | One connection. **Both sides** can send, any time. | True two-way, low overhead per message | Needs its own scaling plan. Some old proxies dislike it. |

### How to choose (say this out loud)

> "If only the server needs to push — a notification bell, an AI response streaming in, a progress
> bar — I use **SSE**. It is simpler and it reconnects by itself.
>
> If both sides talk — chat, live call state, collaborative editing — I use **WebSocket**.
>
> If the update can be a few seconds late and traffic is low, honestly, **polling is fine**. Not
> every feature needs a socket."

⭐ Saying "polling is fine sometimes" is a strong signal. It shows you pick tools, not toys.

---

## 3. How a WebSocket actually starts (the handshake)

It starts as a **normal HTTP request**, then upgrades.

```http
GET /socket HTTP/1.1
Host: api.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
```

Server replies:

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
```

**101 = Switching Protocols.** After this the same TCP connection stops speaking HTTP and starts
speaking the WebSocket protocol. The URL becomes `ws://` or `wss://` (secure — always use `wss`).

Three facts worth saying:
1. It starts as HTTP, so it works on port 80/443 and passes through most firewalls.
2. After the upgrade there are **no headers per message**. A message can be a few bytes. HTTP would
   send ~500 bytes of headers every time.
3. **Cookies are sent on the handshake only.** After that there are no headers, so auth has to be
   handled at connect time (§7).

---

## 4. Socket.IO — what it adds on top

Socket.IO is **not** WebSocket. It is a library that *uses* WebSocket, and adds things you would
otherwise write yourself.

| Feature | What it means |
|---|---|
| **Auto reconnect** | The phone loses signal → the client retries with backoff by itself |
| **Fallback** | If WebSocket is blocked, it falls back to HTTP long polling |
| **Rooms** | Group sockets by name. Send to a group in one line. ⭐ |
| **Namespaces** | Split the app into channels (`/chat`, `/calls`) over one connection |
| **Acknowledgements** | The client can reply "got it" to a specific message |
| **Heartbeats** | Ping/pong to detect a dead connection |
| **Auto JSON** | You send objects, not strings |

⚠️ **The trade-off:** a Socket.IO client can only talk to a Socket.IO server. It is its own
protocol on top. Plain `ws` is lighter, but then reconnection, rooms and heartbeats are your job.

> 💬 "I used Socket.IO because reconnection and rooms are exactly what I would have had to write
> anyway, and on mobile the reconnection logic is the part that really matters."

### Rooms — the most useful idea

A room is just a label on a socket.

```ts
socket.join(`clinic:${clinicId}`);              // put this socket in a group
io.to(`clinic:${clinicId}`).emit('new-appointment', data);   // send to everyone in the group
```

Use rooms for: one tenant, one chat thread, one user's devices (`user:42` — phone and laptop both
get it).

⭐ **Multi-tenant safety:** always name the room with the tenant ID. Never broadcast with
`io.emit()` — that goes to **every connected user in the whole system**, including other companies.
That is a data leak. Good thing to mention.

---

## 5. ⭐ Scaling — the question they really ask

**The problem:**

```
User A  ──connected to──►  Server 1
User B  ──connected to──►  Server 2

Server 1 emits "new message" → only User A sees it.
User B sees nothing. The feature looks broken.
```

WebSocket connections are **sticky to one server**. Server 1 has no idea User B exists.

**The fix: Redis Pub/Sub as the message bus.**

```
Server 1  ──publish──►  Redis  ──►  Server 2 ──► its own sockets
                              ──►  Server 3 ──► its own sockets
```

In Socket.IO this is one line — the **Redis adapter**:

```ts
import { createAdapter } from '@socket.io/redis-adapter';
io.adapter(createAdapter(pubClient, subClient));   // now io.to(...) reaches every server
```

Now `io.to('clinic:9').emit(...)` on any server reaches that room on **all** servers.

**Why Pub/Sub and not a queue?** Pub/Sub is fire-and-forget — if a server is not listening, the
message is gone. That is acceptable here, because a live update that is missed is re-fetched on
reconnect. ([06 — Redis §9](06-redis.md).)

### The other scaling piece: sticky sessions

If Socket.IO falls back to HTTP polling, several HTTP requests make up one "connection". They must
all reach the **same** server.

So the load balancer needs **sticky sessions** (`ip_hash` in Nginx, or session affinity on the ALB).
Otherwise you get random "session ID unknown" errors.

⭐ Mentioning sticky sessions unprompted is a strong senior signal — it is a real production bug,
not a textbook detail.

---

## 6. Nginx config (the small thing that breaks everything)

```nginx
location /socket.io/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;                 # ⚠️ required — 1.0 cannot upgrade
    proxy_set_header Upgrade $http_upgrade; # ⚠️ pass the upgrade header through
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;                # ⚠️ default 60s kills idle sockets
}
```

Without those lines the socket connects, then dies after 60 seconds, and nobody knows why.
This is a classic real-world debugging story.

---

## 7. Authentication — how to secure a socket

**The rule:** authenticate **once, at connect time**. Not on every message.

```ts
// client
const socket = io('wss://api.example.com', { auth: { token: jwt } });

// server (NestJS gateway)
async handleConnection(client: Socket) {
  try {
    const payload = await this.jwt.verifyAsync(client.handshake.auth.token);
    client.data.userId   = payload.sub;
    client.data.tenantId = payload.tenantId;      // ⭐ trust the token, never the client
    client.join(`tenant:${payload.tenantId}`);
    client.join(`user:${payload.sub}`);
  } catch {
    client.disconnect();                          // no token, no connection
  }
}
```

**Four security rules to say:**

1. **Never trust data from the client for identity.** If the client sends `tenantId` in a message,
   ignore it. Use the one from the verified token.
2. **Check permission before joining a room.** A user asking to join `clinic:9` must actually belong
   to clinic 9. Otherwise they can listen to another company's events. This is IDOR over sockets.
3. **Check the `Origin` header** on the handshake, and set CORS. Otherwise any website can open a
   socket using the user's cookies (this is called **CSWSH** — cross-site WebSocket hijacking).
4. **Rate limit messages.** A socket is an open pipe. A bad client can send 10,000 messages a
   second. Count messages per socket and disconnect abusers.

**What about token expiry?** The connection stays open even after the JWT expires. Two options:
re-check the token periodically on a timer and disconnect, or make the client reconnect with a
fresh token. Say the problem out loud — most candidates never think of it.

---

## 8. Heartbeats — how you know a connection is dead

A phone going into a tunnel does not send a "goodbye". The TCP connection just stops.
The server still thinks the user is online. This is a **half-open connection**.

So both sides ping.

```ts
const io = new Server(httpServer, {
  pingInterval: 25_000,   // send a ping every 25s
  pingTimeout: 20_000,    // no pong in 20s → treat as disconnected
});
```

If no pong arrives in time, the server closes the socket and fires `disconnect`.

This is also why an idle proxy timeout (§6) must be **longer** than the ping interval. Otherwise the
proxy kills a connection that is perfectly healthy.

---

## 9. ⭐ Reconnection — what happens to messages you missed

The phone loses network for 30 seconds. Three events happened. They are gone.

**Wrong mental model:** "the socket will deliver them when it comes back." It will not.

**Two correct patterns:**

**Pattern 1 — Re-fetch on reconnect (simple, and what you should say first).**
```ts
socket.on('connect', () => {
  refetchCurrentScreen();     // ask the REST API for the truth
});
```
The socket is only a **hint** that something changed. The REST API is the source of truth.

**Pattern 2 — Send a cursor and replay.**
```ts
socket.emit('sync', { lastEventId });         // "I have up to here"
// server sends everything after that ID, from the DB or a Redis stream
```

> 💬 **Say this:** "I treat the socket as an optimisation, not as the data source. On reconnect the
> client re-fetches state over REST. That way a missed event is never a permanent wrong screen.
> If exact history matters, I keep an event ID and replay from it."

⭐ This is the single best real-time answer you can give. Most people miss it entirely.

---

## 10. Mobile makes everything harder (your real experience)

| Problem | What happens | Fix |
|---|---|---|
| **App goes to background** | iOS/Android suspend the socket after a few seconds | Reconnect on foreground. Use **push notifications** for anything important. |
| **Wi-Fi → 4G switch** | The IP changes, the socket dies silently | Heartbeat detects it, client reconnects |
| **Bad network** | Connect/disconnect repeatedly | Reconnect with **exponential backoff + jitter**, so 10,000 phones do not reconnect at the same second |
| **Battery** | An always-open socket drains battery | Disconnect in background; push instead |
| **Screen shows stale data** | Events missed while asleep | §9 — re-fetch on foreground |

> 💬 "On mobile I never rely on a socket for delivery. The socket makes the screen live while the
> app is open. Anything that must arrive goes through push notifications."

---

## 11. Common real-time features — how each is built

| Feature | How |
|---|---|
| **Live notifications** | Server emits to `user:42` room. All that user's devices get it. |
| **Typing indicator** | Client emits `typing` → server relays to the room. Never stored. Loss is fine. |
| **Online presence** | On connect, `SADD online:users <id>`. On disconnect, `SREM`. ⚠️ Multiple tabs → count connections per user, do not remove until the last one goes. |
| **Live call status** (your CRM) | The phone posts state changes → server emits to `agent:<id>` and the dashboard room |
| **Progress bar** for a long job | The BullMQ worker publishes progress → the socket server relays it to the user's room ⭐ |
| **Chat** | Save to DB **first**, then emit. Never emit-only — a refresh must show the message. |
| **Live dashboard counters** | Do not emit on every change. **Throttle** — send an update at most once a second. |

⭐ **The queue + socket combination is a great thing to describe:**

```
API adds job → 202 to the user
Worker does the slow work → publishes progress to Redis
Socket server → emits to that user's room → the progress bar moves
```

That one flow shows [06](06-redis.md), [07](07-bullmq.md) and this chapter working together.

---

## 12. Pusher and the managed option

Pusher, Ably and AWS API Gateway WebSockets are **hosted** real-time services.
You do not run the socket servers. They do.

| | Self-hosted Socket.IO | Pusher / Ably |
|---|---|---|
| You run the servers | Yes | No |
| Scaling, sticky sessions | Your problem | Their problem |
| Cost | Servers | Per connection / per message |
| Control | Full | Limited |

**Private channels need auth.** The client cannot just subscribe to `private-clinic-9`.
It asks *your* backend to sign the subscription:

```
Client → your API: "may I subscribe to private-clinic-9?"
Your API: checks the user, returns a signed token
Client → Pusher: here is the signature
```

⭐ That auth endpoint is where the tenant check belongs. Say that.

> 💬 "We used Pusher so we did not have to run and scale a socket layer. The important part stayed
> with us: the channel auth endpoint, where I verify the user really belongs to that tenant before
> signing the subscription."

---

## 13. NestJS gateway — code reference

```ts
@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN }, namespace: '/calls' })
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  async handleConnection(client: Socket) {
    try {
      const p = await this.jwt.verifyAsync(client.handshake.auth.token);
      client.data = { userId: p.sub, tenantId: p.tenantId };
      client.join(`tenant:${p.tenantId}`);
      client.join(`user:${p.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.presence.remove(client.data.userId, client.id);
  }

  @SubscribeMessage('call:status')
  async onStatus(@ConnectedSocket() client: Socket, @MessageBody() body: StatusDto) {
    const { tenantId } = client.data;                    // ⭐ from the token, not the body
    await this.calls.update(tenantId, body);             // save first
    this.server.to(`tenant:${tenantId}`).emit('call:updated', body);   // then broadcast
  }
}

// Emitting from anywhere else (a BullMQ worker, a REST controller):
this.server.to(`user:${userId}`).emit('job:done', { id });
```

**Order matters: save to the database first, then emit.**
If you emit first and the save fails, the UI shows something that does not exist.

---

## 14. Real problems and their fixes

| Problem | Why | Fix |
|---|---|---|
| Works on one server, breaks after scaling | Servers do not share connections | Redis adapter (§5) |
| Random "session ID unknown" | Polling requests hit different servers | Sticky sessions |
| Socket dies after 60 seconds | Nginx `proxy_read_timeout` | §6 config |
| Connection fails only in production | Missing `Upgrade` headers in the proxy | §6 config |
| Server memory grows all day | Listeners or rooms never cleaned | Clean up in `handleDisconnect` |
| Users see other tenants' events | Broadcast with `io.emit()` | Always emit to a tenant room |
| UI shows old data after tunnel | Missed events | Re-fetch on reconnect (§9) |
| Duplicate events on the client | Reconnect re-registers a listener | Register listeners once, outside the reconnect handler |
| 10,000 users reconnect at once after a deploy | All retry at the same moment | Backoff **with jitter** |
| Browser tab open, user gone | No heartbeat | Ping/pong (§8) |

---

## 15. Maps to YOUR projects

| Project | Real-time part | The sentence to say |
|---|---|---|
| **B2C CRM** | Live call state from the Android app to the dashboard | "The phone pushes state changes; the dashboard sees them live. The socket is the fast path, but the record is written to the DB first, so a missed event is never lost data." |
| **Clinic Cloud** | Appointment and queue updates for the front desk | "Emitted to a `clinic:<id>` room, so one clinic never sees another clinic's events" |
| **Interview AI** | Progress of a long AI evaluation | "The BullMQ worker publishes progress; the socket layer relays it to that user's room" |
| **Any** | Reconnect behaviour | "On reconnect the client re-fetches over REST — the socket is a hint, not the source of truth" |
| **Any (Pusher)** | Channel auth | "The tenant check lives in my auth endpoint that signs private channel subscriptions" |

---

## 16. Model answers (say these out loud)

**Q: WebSocket vs HTTP?** → §1 (letter vs phone call) + §3 (starts as HTTP, upgrades with 101, no
headers per message after that).

**Q: WebSocket vs SSE vs polling — when do you use which?** → §2's "how to choose". Include "polling
is fine for low-frequency updates".

**Q: You have 3 servers. User A is on server 1, user B on server 2. How does a message reach both?**
⭐ → §5. Redis Pub/Sub adapter + sticky sessions for the polling fallback.

**Q: How do you authenticate a WebSocket?** → §7. Token on the handshake, verify once, store the
identity on the socket, check permission before joining rooms, never trust the client's tenant ID.

**Q: The user's phone loses network for 30 seconds. What happens to those events?** ⭐ → §9. They are
gone. Re-fetch on reconnect. The socket is an optimisation, not the source of truth.

**Q: How do you know a client is still there?** → §8 ping/pong, and the proxy timeout must be longer
than the ping interval.

**Q: How do you show progress of a long background job?** → §11's queue + socket flow.

**Q: What are the security risks?** → §7's four rules — especially room permission checks (IDOR) and
origin checking (CSWSH).

**Q: Why did you use Pusher instead of running your own?** → §12.

---

## 17. Rapid-fire one-liners

| Word | One line |
|---|---|
| **WebSocket** | One open connection, both sides can send any time |
| **`wss://`** | WebSocket over TLS — always use this |
| **101 Switching Protocols** | The handshake response that turns HTTP into a WebSocket |
| **SSE** | Server → client only, over plain HTTP, auto-reconnects |
| **Long polling** | Server holds the request until there is news |
| **Socket.IO** | A library over WebSocket: reconnect, rooms, fallback, heartbeats |
| **Room** | A label on sockets so you can send to a group |
| **Namespace** | A separate channel of the app over one connection |
| **Redis adapter** | Makes rooms work across many servers, using Pub/Sub |
| **Sticky session** | Same client always hits the same server |
| **Heartbeat / ping-pong** | How you detect a dead connection |
| **Half-open connection** | The client is gone but the server does not know yet |
| **Backpressure** | The client cannot keep up with the messages you are sending |
| **Presence** | Who is online right now |
| **CSWSH** | Another site opens a socket as your user — check `Origin` |
| **Fan-out** | One event delivered to many connected clients |
| **Source of truth** | The database, not the socket stream |

---

## 18. Self-check

- [ ] Explain WebSocket vs HTTP with the letter/phone call example
- [ ] Name 4 ways to get updates and when to use each
- [ ] Explain the handshake and what 101 means
- [ ] Say 3 things Socket.IO adds over raw WebSocket
- [ ] Explain rooms, and why you never use `io.emit()` in a multi-tenant app
- [ ] Draw the 3-servers problem and fix it with Redis Pub/Sub
- [ ] Say why sticky sessions are needed
- [ ] Explain how you authenticate a socket, and where the tenant ID comes from
- [ ] Explain ping/pong and half-open connections
- [ ] Explain what happens to events missed while offline, and both fixes
- [ ] Explain the queue → worker → socket progress flow
- [ ] Name 3 mobile-specific problems
- [ ] Name 2 socket security risks

---

## 19. Traps — how people lose this round

1. **"The socket will deliver missed messages later."** It will not. Re-fetch on reconnect.
2. **Forgetting multi-server fan-out.** Works in dev with one server, breaks in production.
3. **Using `io.emit()` in a multi-tenant app.** Every company sees every event.
4. **Trusting `tenantId` sent in the message body.** Take it from the verified token.
5. **Joining a room without a permission check.** IDOR over sockets.
6. **No origin/CORS check** on the handshake.
7. **No rate limit per socket.** An open pipe is an open door.
8. **Emitting before saving to the database.** The UI shows data that does not exist.
9. **Forgetting Nginx `proxy_read_timeout` and the upgrade headers.** Dies after 60s in production.
10. **Reconnect without jitter.** After a deploy, every client returns at the same instant.
11. **Registering event listeners inside the reconnect handler.** Duplicate handlers, duplicate UI.
12. **Sending every tiny change to a dashboard.** Throttle it, or you flood the client.
13. **Relying on sockets on mobile for important delivery.** Use push notifications.

---

---

## 20. Scenario questions — "what will you do if…"

This is the round people fail. The answer shape is always the same:
**say the cause → fix it now → stop it happening again.**

---

**S1. It works on your laptop. You deploy to 3 servers and half the users stop getting updates.**
> "Each server only knows its own sockets. User A is on server 1, user B on server 2, so a broadcast
> from server 1 never reaches B. I add the Socket.IO Redis adapter, so every emit goes through Redis
> Pub/Sub to all servers. I also turn on sticky sessions on the load balancer, because the polling
> fallback sends several HTTP requests that must land on the same server."

**S2. The socket connects, then dies exactly after 60 seconds. Every time.**
> "That number is a proxy timeout, not my code. Nginx closes an idle upgraded connection at 60
> seconds by default. I raise `proxy_read_timeout`, and make sure `proxy_http_version 1.1` and the
> `Upgrade` / `Connection` headers are set. I also keep the ping interval smaller than that timeout,
> so the connection is never idle."

**S3. A user goes into a lift for 30 seconds. They come back and the screen shows old data.**
> "Those events are gone — a socket does not replay what you missed. So on `connect` I re-fetch the
> current screen over REST. I treat the socket as a hint that something changed, not as the source
> of truth. If exact history matters, the client sends its last event ID and the server replays from
> there."

**S4. A support person opens the dashboard and the browser freezes.**
> "Too many events. If 50 things change per second, I am sending 50 messages per second and the
> client cannot render that fast. I throttle on the server — at most one update per second per room
> — and I batch changes into one message instead of one message per change. For a big table I send
> only what changed, not the whole list."

**S5. A clinic reports they can see another clinic's appointments appearing live.**
> "That is a broadcast bug and it is a data leak, so it is a P1. Almost certainly someone used
> `io.emit()` instead of `io.to('clinic:<id>').emit()`. Immediate fix is that emit. Then I check the
> join logic: a socket must only join a room after I verify from the token that the user belongs to
> that tenant. And the tenant ID always comes from the verified JWT, never from the message body."

**S6. You deploy. 10,000 phones reconnect at the same second and the servers fall over.**
> "A thundering herd on reconnect. I add exponential backoff **with jitter** on the client, so
> reconnects spread over a minute instead of arriving together. On the server side I do a rolling
> deploy so all instances do not drop at once, and I make sure the connect handler is cheap — one
> token verify, no heavy database call per connection."

**S7. The mobile app is in the background and misses call updates.**
> "That is normal — iOS and Android suspend sockets in the background. I do not fight it. The socket
> keeps the screen live while the app is open, and anything that must arrive goes through a push
> notification. On foreground the app reconnects and re-fetches state, so the screen is correct."

**S8. Users report seeing the same message twice in the UI.**
> "Usually the client registered the listener again after a reconnect, so one event fires two
> handlers. I register listeners once, outside the reconnect logic. If it is really the server
> sending twice, I give each event an ID and let the client ignore an ID it has already applied."

**S9. Presence shows a user as online, but they closed the tab an hour ago.**
> "A half-open connection — the client vanished without a close frame. Ping/pong solves it: if no
> pong arrives within the timeout, the server drops the socket and fires `disconnect`.
> The other bug in presence is multiple tabs: I count connections per user and only mark them
> offline when the last one goes."

**S10. Memory on the socket server keeps growing all day and it restarts every night.**
> "A leak in the connection lifecycle. Usually something added per connection is never removed —
> a listener, a timer, a map entry, a room. I clean everything in `handleDisconnect`, and I check
> whether I am storing per-socket data in a plain object that never shrinks. I also confirm the
> disconnect handler actually runs, by logging connect and disconnect counts."

**S11. The interviewer asks: build a live progress bar for a 2-minute AI job.**
> "The API adds a BullMQ job and returns 202 immediately. The worker publishes progress as it goes.
> The socket layer relays that to the room for that one user, so only they see it. If the user
> refreshes, the page first reads the current progress from the database or Redis, then keeps
> listening. That way the bar is correct even if they missed events."

**S12. How do you test real-time features?**
> "I test the business logic without sockets — the service that decides what to emit is a plain
> function, so it is easy to unit test. For the socket layer I use a real client in an integration
> test: connect, join, emit, assert what arrives. The cases I always test are reconnect, and a user
> trying to join a room that is not theirs."

**S13. The client wants "guaranteed delivery" of every event.**
> "A socket cannot guarantee that, and I would say so. What I can do is: write everything to the
> database first, so nothing is lost; use the socket for speed; and let the client reconcile on
> reconnect. If they truly need every event in order, that is a stream with an ID and replay, or a
> push notification — not a plain WebSocket."

---

> **Next:** [06 — Redis §9](06-redis.md) (Pub/Sub vs Streams) for the fan-out detail, and
> [07 — BullMQ §11](07-bullmq.md) for the worker that publishes progress.
