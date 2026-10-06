# 14 — Cloud, DevOps & Deployment

> Easy English. Short lines. Say them out loud.
> **Time:** ~6 hours total · **Pairs with:** [09 — Real-Time](09-realtime-websockets.md) (Nginx + sockets), [07 — BullMQ](07-bullmq.md) (graceful shutdown), [11 — Security](11-auth-and-security.md) (secrets)
> ⭐ You run Clinic Cloud in production yourself. Speak from that — and be honest about what it does not have yet.

---

## How this file is organised — basic → advanced

Read top to bottom. **Every topic:** explanation → deeper detail → **interview questions** → **scenarios**.

| Level | Topics | Time | You can answer… |
|---|---|---|---|
| **1. Basics** | 1 Cloud basics · 2 Networking for deploys · 3 The 12-factor app | 45 min | "What is an AZ? What happens when I type a URL?" |
| **2. Docker** | 4 Containers & Dockerfile · 5 Docker Compose | 1 h | "Why multi-stage builds? Container vs VM?" |
| **3. AWS core** | 6 Compute · 7 Storage & databases · 8 Networking (VPC, ALB, CDN) · 9 IAM & secrets | 1.5 h | "EC2 vs ECS vs Lambda? Public vs private subnet?" |
| **4. Traffic** | 10 Nginx · 11 Load balancing & scaling | 45 min | "How does Nginx handle WebSockets? Scale horizontally?" |
| **5. CI/CD** | 12 The pipeline · 13 Deployment strategies & zero downtime | 1 h | "What happens when you push to main? Blue-green vs canary?" |
| **6. Operate** | 14 Observability · 15 Reliability & DR · 16 Infrastructure as Code · 17 Kubernetes basics · 18 Cost · 19 Deploy security | 1.5 h | "Server dies at 2 AM. RPO vs RTO? Do you need Kubernetes?" |
| **Wrap-up** | 20 Your projects · 21 Design questions · 22 Rapid-fire · 23 Self-check · 24 Traps | 30 min | "Make Clinic Cloud highly available." |

**If you only have 1 hour:** §0, §4, §12, §13, §15, §20, §21.

---

## 0. The 30-second answer (memorise this)

> 💬 **"Walk me through how you deploy."**
>
> "Every push to main runs a GitHub Actions pipeline. It installs, lints, tests, and builds a Docker
> image tagged with the commit SHA, then pushes it to a registry.
>
> The deploy step connects to the server, pulls that exact image, runs the Prisma migrations first,
> then swaps the container and checks the health endpoint. Nginx sits in front for TLS and routing,
> uploads live in S3 behind CloudFront, and the database has automated backups.
>
> Rollback is redeploying the previous image tag. Migrations are always additive, because a schema
> change does not roll back.
>
> The honest gap is that it is a single instance. The next step is two instances behind a load
> balancer in different availability zones, error tracking, and infrastructure as code."

⭐ The last paragraph is not a weakness. Knowing your gap *and* the fix is a senior answer.
**Never claim high availability you do not have** — one follow-up question exposes it.

---
---

# LEVEL 1 — BASICS

---

## 1. Cloud basics

### The simple idea

**Cloud = renting computers instead of buying them.**

Like renting a flat instead of building a house. You pay monthly, you can move to a bigger one
quickly, and someone else fixes the building.

### IaaS, PaaS, SaaS — the pizza example

| Model | You manage | Provider manages | Example | Pizza version |
|---|---|---|---|---|
| **On-premise** | Everything | Nothing | Your own server room | Make pizza at home from scratch |
| **IaaS** | OS, runtime, app | Hardware, network | **EC2** | Buy the base, bake it yourself |
| **PaaS** | Just your app | OS, runtime, scaling | **Elastic Beanstalk, App Runner, Heroku, Vercel** | Takeaway — heat it and eat |
| **SaaS** | Nothing, just use it | Everything | Gmail, Slack | Eat at the restaurant |
| **Serverless (FaaS)** | Just a function | Everything else | **Lambda** | Pay per slice |

### Regions and availability zones ⭐

| Word | Simple meaning | Example |
|---|---|---|
| **Region** | A geographic area with its own data centres | `ap-south-1` = Mumbai |
| **Availability Zone (AZ)** | A separate data centre inside a region, with its own power and network | `ap-south-1a`, `ap-south-1b` |
| **Edge location** | A small site close to users, for the CDN | CloudFront in Chennai, Delhi |

**Why it matters:**
- One AZ can fail (power, flood). Running in **2+ AZs** survives that.
- A whole region failing is rare — multi-region is expensive and only for strict requirements.
- **Data residency:** Indian health data may need to stay in the India region. Choose the region
  on purpose.

### Shared responsibility model

**AWS secures the cloud. You secure what you put in the cloud.**

| AWS is responsible for | You are responsible for |
|---|---|
| Physical data centres, hardware, the hypervisor | Your OS patches (on EC2), your app code |
| Managed service internals (RDS engine patching) | Security groups, IAM permissions |
| Global network | Encryption settings, backups you configure, your data |

⭐ Most cloud breaches are on the customer side: a public S3 bucket, an open security group, a
leaked access key.

### How cloud pricing works (the basics)

- **Pay per use** — per hour/second for servers, per GB for storage, per request for Lambda.
- **Data transfer OUT costs money.** Data in is usually free. People forget this.
- **Reserved instances / Savings Plans** — commit 1–3 years, save ~30–70%.
- **Spot instances** — spare capacity, up to ~90% cheaper, but AWS can take it back with 2 minutes'
  notice. Good for batch jobs, not your main API.

### Interview questions

**Q: IaaS vs PaaS vs SaaS?**
> "IaaS gives me the machine — I manage the OS and everything above, like EC2. PaaS gives me a platform
> — I just deploy the app, like App Runner or Heroku. SaaS is finished software I simply use, like
> Gmail. The further up, the less control and the less operational work."

**Q: What is an availability zone, and why use more than one?**
> "An AZ is a physically separate data centre inside a region, with its own power and network. If my app
> runs in two AZs behind a load balancer, one data centre failing does not take the product down."

**Q: What is the shared responsibility model?**
> "AWS secures the infrastructure; I secure my configuration and data — IAM, security groups, encryption,
> patching my instances. Most real breaches come from the customer side, like a public bucket."

---

## 2. Networking for deploys

### What happens when you type a URL (they love this question)

```
1. DNS      api.goclinic.online → 13.235.x.x          (Route 53 / any DNS)
2. TCP      open a connection to that IP on port 443
3. TLS      handshake: check the certificate, agree on encryption keys
4. HTTP     send GET /appointments
5. Nginx    receives it, forwards to the app on localhost:3000
6. App      runs the code, queries Postgres / Redis
7. Response travels back the same way
```

⭐ If you can say these 7 steps calmly, you have answered one of the most common deploy questions.

### DNS basics

| Record | Meaning |
|---|---|
| **A** | Name → IPv4 address |
| **AAAA** | Name → IPv6 address |
| **CNAME** | Name → another name (`www` → `goclinic.online`) |
| **ALIAS / ANAME** | Like CNAME but allowed at the root domain (Route 53 alias → load balancer) |
| **MX** | Where email goes |
| **TXT** | Verification, SPF/DKIM for email |
| **TTL** | How long resolvers cache the answer |

⚠️ **TTL trap:** before a migration, **lower the TTL** (e.g. to 60s) a day early. Otherwise users
keep hitting the old IP for hours after you switch.

### Ports, processes and the reverse proxy

- Your Node app listens on **port 3000** on localhost — never exposed directly to the internet.
- **Nginx** listens on **80** and **443** and forwards requests to it.
- That is a **reverse proxy**: the client talks to Nginx; Nginx talks to your app.

**Why a reverse proxy?** TLS termination, one public entry point, serving static files, gzip, rate
limiting, load balancing across several app instances, hiding internal ports.

### HTTPS / TLS in one breath

TLS encrypts traffic and proves the server is who it says it is (the certificate).
**Let's Encrypt** gives free certificates valid **90 days**, renewed automatically by certbot.
**Wildcard certificates** (`*.goclinic.online`, needed for subdomain-per-tenant) need the **DNS-01
challenge**. Redirect all HTTP → HTTPS and turn on **HSTS**.

### Interview questions

**Q: What happens when you type a URL in the browser?** → the 7 steps above.

**Q: What is a reverse proxy?**
> "A server in front of my app that receives all public traffic and forwards it inside. It terminates TLS,
> serves static files, compresses, rate limits and load balances, and it means the app port is never
> exposed to the internet."

**Q: A record vs CNAME?**
> "An A record points a name to an IP address. A CNAME points a name to another name. You cannot use a
> CNAME at the root domain, which is why AWS has alias records for pointing the root at a load balancer."

### Scenarios

**S1. You moved to a new server, but half the users still reach the old one.**
> "DNS caching. The old record had a long TTL, so resolvers are still serving the old IP. Short term I keep
> the old server running and forwarding until the TTL has passed. Next time I lower the TTL a day before
> the move, switch, confirm, then raise it again."

**S2. The site shows "certificate expired" at 9 AM on a Monday.**
> "The auto-renewal failed silently — usually the certbot timer is not running, or renewal worked but
> Nginx was never reloaded. Immediate: renew manually and reload Nginx. Prevention: a renewal hook that
> reloads Nginx, and an external monitor that alerts when a certificate has less than 14 days left.
> A certificate should never expire as a surprise."

---

## 3. The 12-factor app (how to build apps that deploy well)

A famous checklist for apps that run well in the cloud. You do not need all 12 by heart — know these 6.

| Factor | Plain English | Why it matters |
|---|---|---|
| **Config in environment** | Database URLs and secrets come from env vars, not code | Same image runs in staging and production |
| **Stateless processes** ⭐ | Nothing important is stored on the server's disk or memory | Any instance can be killed or added |
| **Backing services** | DB, Redis, S3 are attached resources, swappable by URL | Switch local Postgres to RDS by changing one variable |
| **Build, release, run** | Build once → combine with config → run. Never edit code on the server. | Same artifact everywhere; easy rollback |
| **Logs as streams** | Write logs to stdout; the platform collects them | No log files filling up the disk |
| **Disposability** | Start fast, shut down gracefully | Deploys, autoscaling and crashes are safe |

⭐ **Stateless is the one to explain:** if a user uploads a file and you save it on the server's disk,
the next request may hit another server that does not have it — and a redeploy deletes it. So
**files go to S3, sessions go to Redis, data goes to the database**. Then servers are cattle, not pets.

### Interview questions

**Q: What does "stateless" mean, and why does it matter for scaling?**
> "The server keeps nothing that a later request depends on — no uploads on local disk, no sessions in
> memory. Files go to S3, sessions to Redis, data to the database. Then I can add, remove or replace
> instances freely, which is what load balancing, autoscaling and zero-downtime deploys all need."

**Q: How should an app get its configuration?**
> "From environment variables at runtime, not baked into the code or the image. The same image then runs
> in every environment, and secrets never end up in the repository."

### Scenarios

**S3. After adding a second server, users randomly lose their uploaded profile pictures.**
> "The files are saved on each server's local disk, so a request that lands on the other server cannot
> find them. The app is not stateless. Fix: upload to S3 — ideally directly from the client with a
> presigned URL — and store only the key in the database. Then any server can serve it, and deploys no
> longer delete files."

---
---

# LEVEL 2 — DOCKER

---

## 4. Containers and the Dockerfile

### The simple idea

**"It works on my machine."** Docker fixes that sentence.

A container is a **lunch box**: your app, the exact Node version, the libraries and the settings,
packed together. It runs the same on your laptop, in CI and on the server.

### Container vs virtual machine

| | **Virtual Machine** | **Container** |
|---|---|---|
| What it includes | A whole operating system | Just the app + its libraries |
| Shares the host kernel? | No | **Yes** |
| Size | GBs | MBs |
| Start time | Minutes | Seconds |
| Isolation | Stronger | Good, but lighter |
| Picture | A separate house | A flat in one building |

### The 4 words

| Word | Meaning |
|---|---|
| **Image** | The recipe, frozen. Read-only. Built from a Dockerfile. |
| **Container** | A running copy of an image |
| **Layer** | Each Dockerfile step creates a cached layer |
| **Registry** | Where images are stored — Docker Hub, **ECR**, GitHub Container Registry |

### ⭐ A good multi-stage Dockerfile (Node + NestJS + Prisma)

```dockerfile
# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./                 # ⭐ copy dependency files FIRST
RUN npm ci                            # cached unless package files change

COPY prisma ./prisma
RUN npx prisma generate

COPY . .                              # source changes only rebuild from here
RUN npm run build && npm prune --omit=dev

# ---------- Stage 2: run ----------
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

USER node                             # ⭐ do not run as root
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]          # exec form → receives SIGTERM properly
```

### Explain the 5 decisions

1. **Multi-stage** — build tools, TypeScript and dev dependencies stay in stage 1. The final image
   has only what runs. Smaller image = faster deploy, fewer security holes.
2. **Copy `package*.json` before the source** — Docker caches layers. If only your code changed,
   `npm ci` is reused from cache. A build goes from minutes to seconds.
3. **`npm ci`, not `npm install`** — installs exactly what the lock file says. Repeatable builds.
4. **`USER node`** — if someone breaks into the container, they are not root.
5. **`CMD ["node", ...]` in exec form** — the Node process is PID 1 and receives `SIGTERM`, so graceful
   shutdown works. `npm start` can swallow the signal.

### `.dockerignore` (small file, big effect)

```
node_modules
.git
.env
dist
coverage
*.log
```
Keeps the build context small and — importantly — **keeps `.env` out of the image**.

### Rules to say

- **Never put secrets in the image** — not in `ENV`, not in a copied `.env`. Anyone who pulls the image
  can read every layer, even if you delete the file in a later step.
- **Tag images with the commit SHA**, not only `latest`. `latest` tells you nothing and makes rollback
  guesswork.
- **Pin the base image** (`node:20-alpine`, or even a digest), and rebuild regularly for security patches.
- **One process per container.** API and worker are separate containers from the same image.

### Interview questions

**Q: Container vs VM?**
> "A VM virtualises the whole machine with its own OS. A container shares the host kernel and packages
> only the app and its dependencies, so it is much smaller and starts in seconds. VMs isolate more
> strongly; containers are lighter and more portable."

**Q: Why multi-stage builds?**
> "The build stage has compilers, TypeScript and dev dependencies; the final stage copies only the built
> output and production dependencies. The image is smaller, deploys faster, and has far fewer packages
> that could contain vulnerabilities."

**Q: How do you make Docker builds fast?**
> "Order the Dockerfile from least to most frequently changed — copy the package files and install
> before copying the source, so the dependency layer is cached. Use a `.dockerignore`, and cache layers
> in CI."

**Q: Image vs container?**
> "An image is the read-only template; a container is a running instance of it. One image can run as
> many containers."

### Scenarios

**S4. Your Docker image is 1.8 GB and deploys take 10 minutes.**
> "Probably a single-stage build with dev dependencies, the full Node image, and maybe `node_modules` or
> `.git` copied in. I switch to a multi-stage build on an Alpine or slim base, prune dev dependencies, add
> a `.dockerignore`, and order the layers so dependencies are cached. That usually gets it under 200 MB
> and turns most deploys into a small layer pull."

**S5. Someone found the production database password inside your Docker image.**
> "It was baked in — an `ENV` line or a copied `.env` file. Every layer is readable, so deleting it later
> does not help. Immediate: rotate the password, because anyone with the image has it, and rebuild
> without it. Prevention: `.env` in `.dockerignore`, secrets injected at runtime from a secrets manager,
> and an image scanner in CI that fails the build on secrets."

**S6. The container ignores `docker stop` and gets killed after 10 seconds, dropping requests.**
> "The Node process is not receiving `SIGTERM` — usually because it was started through `npm start` or a
> shell, so the signal goes to the wrong process. Fix: `CMD ["node", "dist/main.js"]` in exec form, or
> an init like `tini`, and graceful shutdown in the app: stop accepting new requests, finish the current
> ones, close database and Redis connections, then exit."

---

## 5. Docker Compose

### The simple idea

Docker runs **one** container. Your app needs **several**: API, worker, Postgres, Redis.
**Docker Compose** starts them all together from one file.

```yaml
services:
  api:
    image: ghcr.io/goclinic/api:${GIT_SHA}
    env_file: .env.production
    ports: ["127.0.0.1:3000:3000"]        # ⭐ localhost only — Nginx is the public door
    depends_on:
      redis: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 15s
      retries: 3
    restart: unless-stopped

  worker:
    image: ghcr.io/goclinic/api:${GIT_SHA}   # same image, different command
    command: ["node", "dist/worker.js"]
    env_file: .env.production
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes", "--maxmemory-policy", "noeviction"]
    volumes: ["redis-data:/data"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

volumes:
  redis-data:
```

### The words to know

| Word | Meaning |
|---|---|
| **Service** | One container definition (api, worker, redis) |
| **Volume** | Storage that **survives** the container being deleted — needed for databases |
| **Bind mount** | A host folder mapped into the container — good for local dev |
| **Network** | Compose puts services on one network; they reach each other by **name** (`redis:6379`) |
| **`depends_on` + healthcheck** | Start order that waits until a dependency is actually ready |
| **`restart: unless-stopped`** | Bring it back if it crashes or the server reboots |

⚠️ **`depends_on` alone only waits for the container to *start*, not to be *ready*.** Add a
`condition: service_healthy`, and still make the app retry its connections.

⚠️ **Compose is great for one machine.** It is not an orchestrator — no automatic multi-server
scheduling or self-healing across hosts. That is ECS or Kubernetes (§6, §17).

### Interview questions

**Q: What is Docker Compose and when is it not enough?**
> "It defines and runs several containers together on one host — API, worker, Redis. It is ideal for local
> development and small single-server production. Once I need several servers, rolling updates and
> automatic rescheduling on failure, I need an orchestrator like ECS or Kubernetes."

**Q: Volume vs bind mount?**
> "A volume is storage managed by Docker that survives the container being removed — used for database
> data. A bind mount maps a specific host folder — handy in development for live code reloading."

### Scenarios

**S7. You restarted the Postgres container and all the data is gone.**
> "The data was inside the container's writable layer instead of a volume, so removing the container
> removed the data. Recovery comes from backups. Fix: a named volume for the data directory — and for
> production, a managed database like RDS with automated backups, so the data does not depend on one
> container on one disk."

---
---

# LEVEL 3 — AWS CORE SERVICES

---

## 6. Compute — where your code runs

### The choices, from most control to least

| Service | What it is | You manage | Good for |
|---|---|---|---|
| **EC2** | A virtual machine | OS, patching, Docker, scaling | Full control, simple single-server apps (your current setup) |
| **ECS on EC2** | AWS runs your containers on EC2 you own | The EC2 fleet | Containers with cheaper, controllable hosts |
| **ECS Fargate** ⭐ | AWS runs your containers, **no servers to manage** | Just the container + CPU/memory | Most container apps — the natural next step from Compose |
| **EKS** | Managed Kubernetes | Kubernetes itself (a lot) | Big teams, many services, multi-cloud |
| **App Runner / Elastic Beanstalk** | PaaS — give it code or an image | Almost nothing | Small teams, simple web apps |
| **Lambda** | Run a function per event | Just the function | Spiky or occasional work, event handlers |

### Lambda — when yes, when no

| ✅ Good | ❌ Not good |
|---|---|
| S3 upload → make a thumbnail | Long jobs — **15-minute limit** |
| Webhook receivers with bursty traffic | WebSockets and long connections |
| Scheduled small jobs | Steady high traffic (containers are cheaper) |
| Glue between AWS services | Many database connections — each instance opens its own (use **RDS Proxy**) |

**Cold start** = the first call after idle waits while AWS starts a new instance — hundreds of ms or
more. Matters for user-facing APIs; not for background events.

### EC2 basics you should name

- **Instance type** — `t3.medium` (burstable, cheap), `m`-family (general), `c` (CPU), `r` (memory).
- ⚠️ **`t3` burst credits** — a `t` instance that runs hot all day runs out of credits and becomes slow.
- **EBS** — the attached disk. **Snapshots** back it up.
- **Elastic IP** — a fixed public IP.
- **AMI** — a saved machine image to launch identical servers.
- **Auto Scaling Group** — keeps N instances running, replaces unhealthy ones, scales on load.

### Interview questions

**Q: EC2 vs ECS vs Lambda — how do you choose?**
> "EC2 when I want full control or a simple single server. ECS Fargate when the app is containerised and I
> do not want to manage servers — it is the natural step up from Docker Compose. Lambda for short,
> event-driven or spiky work, keeping in mind the 15-minute limit, cold starts, and database connection
> limits."

**Q: What is a cold start?**
> "The delay when a serverless platform starts a fresh instance for a request after being idle. It matters
> for latency-sensitive APIs, and can be reduced with provisioned concurrency or keeping functions small."

### Scenarios

**S8. Your API on a `t3.small` becomes very slow every afternoon, then recovers at night.**
> "Burstable CPU credits. The `t` family earns credits when idle and spends them under load; once they run
> out, CPU is throttled to the baseline. I confirm with the CPU credit balance metric. Fix: a non-burstable
> instance like `m`-family, or unlimited mode, or find what is using CPU — often a job that should be in a
> worker instead of the API."

---

## 7. Storage & databases

### S3 — object storage

**S3 = an infinite hard drive for files**, reached over HTTP.

| Word | Meaning |
|---|---|
| **Bucket** | A top-level container (name is globally unique) |
| **Key** | The file's path: `tenant-9/recordings/call-77.mp3` |
| **Presigned URL** ⭐ | A temporary link that allows one upload or download, without making the bucket public |
| **Versioning** | Keep old versions — protects against accidental delete/overwrite |
| **Lifecycle rules** | Move old files to cheaper storage (Infrequent Access, Glacier) or delete them |
| **Block Public Access** | Turn it **on**. Public buckets cause most S3 leaks. |
| **Encryption** | Server-side encryption on by default (SSE-S3 or SSE-KMS) |

**Direct upload with a presigned URL** ⭐ (say this pattern):

```
1. Client: "I want to upload a recording"
2. API checks permission → returns a presigned PUT URL (valid 5 minutes, one key, tenant prefix)
3. Client uploads the file straight to S3 — the API server never touches the bytes
4. Client tells the API "done" → API saves the key in the database
```
Why: big files do not block your Node process or bandwidth, and uploads scale for free.

### RDS — managed Postgres

| Feature | Meaning |
|---|---|
| **Automated backups + PITR** ⭐ | Restore the database to any second in the retention window (e.g. 7–35 days) |
| **Multi-AZ** | A standby copy in another AZ; automatic failover in ~1–2 minutes. **For availability, not for reading from.** |
| **Read replica** | A copy you can read from — scales reads. Asynchronous, so slightly behind. |
| **Parameter group** | Postgres settings |
| **RDS Proxy** | Pools connections — useful with Lambda or many app instances |
| **Aurora** | AWS's Postgres-compatible engine; faster failover, storage auto-grows, costs more |

⭐ **Multi-AZ vs read replica** is a classic question:
**Multi-AZ = survive a failure. Read replica = handle more reads.** Different jobs.

### ElastiCache

Managed **Redis/Valkey** — replication, failover and patching handled for you ([06 — Redis](06-redis.md)).
Remember: the queue instance needs `noeviction`.

### Interview questions

**Q: How do you handle file uploads at scale?**
> "Presigned URLs. The API checks permission and returns a short-lived URL for one key under the tenant's
> prefix, the client uploads straight to S3, and then tells the API to save the key. The app server never
> handles the bytes, and the bucket stays private."

**Q: Multi-AZ vs read replica?**
> "Multi-AZ is a synchronous standby in another zone for automatic failover — it is about availability.
> A read replica is an asynchronous copy I can query — it is about scaling reads. Different problems."

**Q: What is point-in-time recovery?**
> "Restoring the database to a specific moment, using a base backup plus the transaction logs. If someone
> deletes data at 3:14 PM, I can restore a copy to 3:13 PM."

### Scenarios

**S9. A developer ran a `DELETE` without a `WHERE` on production at 3:14 PM.**
> "First, stop further damage — pause writes if needed. Then use point-in-time recovery to restore a *new*
> database instance to 3:13 PM. I do not overwrite production; I copy the deleted rows back from the
> restored copy, because other valid writes happened after 3:14. Prevention: no direct production write
> access for daily work, reviewed migration scripts, and restore drills so we know PITR actually works."

**S10. Your S3 bucket with patient reports was found to be public.**
> "A serious incident. Immediately block public access at bucket and account level, then check the S3
> access logs to see what was downloaded and by whom — that decides whether we must notify customers.
> Prevention: account-wide Block Public Access, files served only through presigned URLs, an AWS Config
> rule that alerts on any public bucket, and encryption at rest."

---

## 8. Networking in AWS — VPC, load balancers, CDN

### VPC — your private network

**VPC = your own private network inside AWS.** Like a gated society with its own roads.

| Word | Meaning |
|---|---|
| **Subnet** | A section of the VPC, **inside one AZ** |
| **Public subnet** | Has a route to the internet gateway. Load balancers and bastions live here. |
| **Private subnet** ⭐ | No direct internet route in. **App servers and databases live here.** |
| **Internet Gateway** | The door between the VPC and the internet |
| **NAT Gateway** | Lets private servers call *out* (to npm, OpenAI) without being reachable *in*. ⚠️ Costs money per hour + per GB. |
| **Route table** | Rules for where traffic goes |
| **Security Group** ⭐ | A firewall on each resource. **Stateful** — reply traffic is allowed automatically. Allow rules only. |
| **NACL** | A firewall on the subnet. **Stateless** — must allow both directions. Has deny rules. |
| **VPC endpoint** | Private path to S3/other AWS services without going through NAT |

### The standard secure layout (draw this)

```
Internet
   │
[ ALB ]                 ← public subnets, in 2 AZs
   │
[ App containers ]      ← private subnets, in 2 AZs   (SG: allow 3000 only from the ALB's SG)
   │
[ RDS ]  [ Redis ]      ← private subnets             (SG: allow 5432 / 6379 only from the app's SG)
```

⭐ **Security groups reference other security groups**, not IP addresses. "The database accepts
connections only from the app's security group." Say that sentence.

### Load balancers

| Type | Layer | Use |
|---|---|---|
| **ALB (Application LB)** ⭐ | Layer 7 (HTTP) | Web apps and APIs — routes by path/host, WebSockets, HTTPS, health checks |
| **NLB (Network LB)** | Layer 4 (TCP/UDP) | Extreme performance, static IPs, non-HTTP protocols |

### CloudFront — the CDN

**CDN = copies of your files kept close to users.** A user in Chennai gets the file from Chennai, not
Mumbai or Virginia.

- Cache static assets (JS, CSS, images) at the edge.
- **Cache invalidation costs time and money** → use **versioned filenames** (`app.a1b2c3.js`) and
  long cache headers instead.
- Serve private S3 files through CloudFront with **Origin Access Control**, so the bucket is never public.
- Can also sit in front of the API for TLS at the edge and DDoS protection (with **AWS WAF**).

### Route 53

AWS DNS. Alias records to the load balancer, health checks, and routing policies (weighted, latency,
failover) — weighted routing is also a simple way to do a canary release.

### Interview questions

**Q: Public vs private subnet?**
> "A public subnet has a route to the internet gateway, so resources there can be reached from outside —
> the load balancer lives there. A private subnet has no inbound internet route — app servers and
> databases live there, and reach outside only through a NAT gateway."

**Q: Security group vs NACL?**
> "A security group is attached to a resource, is stateful, and only has allow rules. A NACL is attached to
> a subnet, is stateless so both directions must be allowed, and can deny. In practice I use security
> groups referencing each other, and leave NACLs mostly default."

**Q: ALB vs NLB?**
> "ALB works at the HTTP level — path and host routing, HTTPS, WebSockets — so it is the default for web
> APIs. NLB works at TCP level for extreme throughput, static IPs, or non-HTTP traffic."

**Q: What is a CDN and how do you handle cache invalidation?**
> "A network of edge servers that cache content near users. Instead of invalidating, I use content-hashed
> filenames with long cache lifetimes, so a new deploy simply references new files."

### Scenarios

**S11. The app servers in a private subnet cannot reach the OpenAI API.**
> "Private subnets have no internet route. They need a NAT gateway in a public subnet and a route to it.
> I check the route table, the NAT gateway, and the security group's outbound rules. I also watch NAT
> cost — for AWS services like S3, a VPC endpoint avoids NAT charges entirely."

**S12. Your AWS bill has a huge "data transfer" line.**
> "Data out to the internet and through NAT gateways is charged per GB. Usual causes: large files served
> straight from EC2 or S3 instead of through CloudFront, S3 traffic going through a NAT instead of a VPC
> endpoint, or cross-AZ chatter. Fixes: CloudFront in front of downloads, a gateway endpoint for S3, and
> keeping heavy traffic inside one AZ where it is safe to."

---

## 9. IAM & secrets

### IAM — who can do what in AWS

| Word | Meaning |
|---|---|
| **User** | A person or a program with long-lived credentials |
| **Role** ⭐ | A set of permissions **assumed temporarily** — by an EC2 instance, an ECS task, a Lambda, or CI |
| **Policy** | A JSON document listing allowed/denied actions on resources |
| **Least privilege** ⭐ | Give only the exact permissions needed, nothing more |

**Rules to say:**
1. **Roles, not access keys.** An EC2 instance or ECS task gets a role; the SDK picks up temporary
   credentials automatically. No keys in `.env` files.
2. **Least privilege** — for example, access only to `s3://recordings/tenant-*/*`, only `PutObject` and
   `GetObject`.
3. **No root account** for daily work. MFA on every human.
4. **CI uses OIDC** — GitHub Actions assumes an AWS role with short-lived credentials, instead of storing
   permanent keys in GitHub secrets. ⭐ Modern, strong answer.

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject"],
  "Resource": "arn:aws:s3:::goclinic-recordings/*"
}
```

### Secrets

| Option | Note |
|---|---|
| `.env` file on the server | Simple; hard to rotate, easy to leak |
| **GitHub Actions secrets** | For CI only |
| **SSM Parameter Store** | Cheap/free, encrypted with KMS, good default |
| **Secrets Manager** ⭐ | Automatic **rotation** (e.g. RDS passwords), costs a little per secret |
| **KMS** | Manages the encryption keys underneath |

> 💬 "Today secrets are GitHub Actions secrets in CI and environment variables on the host, never in the
> image or the repo. The next step is SSM Parameter Store or Secrets Manager read through an instance or
> task role, so secrets are rotatable and not sitting in a file."

### Interview questions

**Q: IAM user vs role?**
> "A user has permanent credentials. A role is assumed temporarily and gives short-lived credentials — so
> applications and CI should use roles, and nothing needs a stored access key."

**Q: How do you manage secrets?** → the quote above.

### Scenarios

**S13. An AWS access key was committed to GitHub. Within an hour, 40 GPU instances are running.**
> "Bots scan GitHub for keys within minutes. Immediately deactivate and delete the key, terminate the
> unknown instances in every region, and check CloudTrail for everything that key did — new users, new
> keys, changed policies — because attackers create backdoors. Then contact AWS support about the bill.
> Prevention: no long-lived keys at all — roles for servers, OIDC for CI — plus secret scanning on
> commits and a billing alarm."

---
---

# LEVEL 4 — TRAFFIC

---

## 10. Nginx

### What Nginx does for you

Reverse proxy · TLS termination · static files · gzip · rate limiting · load balancing ·
WebSocket upgrades · request size limits.

### A real config

```nginx
# HTTP → HTTPS
server {
  listen 80;
  server_name api.goclinic.online;
  return 301 https://$host$request_uri;
}

upstream api_upstream {
  server 127.0.0.1:3000;
  # server 127.0.0.1:3001;          # add more instances → load balancing
  keepalive 32;
}

limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

server {
  listen 443 ssl http2;
  server_name api.goclinic.online;

  ssl_certificate     /etc/letsencrypt/live/api.goclinic.online/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.goclinic.online/privkey.pem;
  add_header Strict-Transport-Security "max-age=31536000" always;

  client_max_body_size 20m;            # ⚠️ default is 1m → uploads fail with 413
  gzip on;

  location / {
    proxy_pass http://api_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /auth/login {
    limit_req zone=login burst=5;      # brute-force protection
    proxy_pass http://api_upstream;
  }

  location /socket.io/ {               # WebSockets need the upgrade headers
    proxy_pass http://api_upstream;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
  }
}
```

### Details worth saying

- **`X-Forwarded-For`** — without it, your app sees every request as coming from `127.0.0.1`, so rate
  limiting and logs by IP are wrong. In Express/Nest set `trust proxy`.
- **`client_max_body_size`** — default 1 MB. Uploads over that fail with **413** before reaching your app.
- **WebSockets** need `proxy_http_version 1.1` and the `Upgrade` / `Connection` headers ([09 §6](09-realtime-websockets.md)).
- **`nginx -t`** before **`nginx -s reload`** — test the config, then reload with no downtime.
- **Streaming / SSE** — turn off buffering (`proxy_buffering off`) or tokens arrive in one lump.

### Interview questions

**Q: How does Nginx handle WebSockets?**
> "It has to be told to. It needs HTTP/1.1 to the upstream and must pass the `Upgrade` and `Connection`
> headers, plus a longer read timeout, otherwise idle sockets are closed at 60 seconds."

**Q: Why does the app see every client IP as 127.0.0.1?**
> "Because Nginx is the one connecting. Nginx must set `X-Forwarded-For`, and the app must be configured
> to trust the proxy so it reads the real client IP."

### Scenarios

**S14. Users get "413 Request Entity Too Large" when uploading reports.**
> "Nginx's `client_max_body_size` defaults to 1 MB, so the request is rejected before it reaches the app.
> I raise it to the real limit for that route. Better: large uploads go directly to S3 with a presigned
> URL, so they never pass through Nginx or the API at all."

**S15. You get 502 Bad Gateway right after every deploy for about 20 seconds.**
> "Nginx is sending traffic to the app while the new container is still starting — or after the old one
> has stopped. Fix: start the new instance, wait for its health check to pass, switch traffic, then
> gracefully stop the old one. On a single server that means running two containers briefly on different
> ports and reloading the Nginx upstream — or moving behind a load balancer that does it for me."

---

## 11. Load balancing and scaling

### Vertical vs horizontal

| | **Vertical (scale up)** | **Horizontal (scale out)** |
|---|---|---|
| How | A bigger machine | More machines |
| Limit | The biggest machine that exists | Almost none |
| Downtime | Usually a restart | None if done right |
| Needs | Nothing | ⭐ **A stateless app** + a load balancer |
| Failure | One machine = everything | One dies, others continue |

### Load-balancing algorithms

| Algorithm | Meaning |
|---|---|
| **Round robin** | Take turns |
| **Least connections** | Send to the least busy server |
| **IP hash / sticky sessions** | Same client → same server (needed for Socket.IO polling fallback) |
| **Weighted** | Stronger servers get more traffic; also used for canary releases |

### Health checks

The load balancer calls `/health` every few seconds. A failing server gets **no traffic** until it
recovers, and an Auto Scaling Group or ECS replaces it.

**Two kinds — know the difference:**
- **Liveness** — "is the process alive?" Failing → restart it.
- **Readiness** — "can it serve traffic right now?" (DB connected, warmed up). Failing → stop sending
  traffic, but do not restart.

⚠️ **Do not make liveness depend on the database.** If the database blips, every app instance fails its
liveness check and gets restarted at once — turning a small problem into a full outage.

### Autoscaling

- Scale on a metric: CPU %, request count per target, or **queue depth for workers** ⭐.
- **Scale out fast, scale in slowly** — avoid flapping up and down.
- Set a **minimum of 2** (in 2 AZs) for availability, and a **maximum** so a bug cannot create a huge bill.
- Remember the database: 20 app instances × a pool of 10 = 200 connections. Scaling the app can kill the
  database ([10 §9](10-multi-tenant-saas.md)).

### Interview questions

**Q: Vertical vs horizontal scaling?**
> "Vertical is a bigger machine — simple, but has a ceiling and a single point of failure. Horizontal is
> more machines behind a load balancer — no ceiling and survives a failure, but the app must be stateless."

**Q: What should a health check check?**
> "I separate liveness and readiness. Liveness just proves the process responds, so a database blip does
> not restart everything. Readiness checks the things needed to serve — database and Redis — so traffic
> stops going to an instance that cannot handle it."

**Q: How do you scale queue workers?**
> "On queue depth and age of the oldest job, not CPU — a worker waiting on an AI API uses little CPU but
> the queue can still be growing."

### Scenarios

**S16. The database had a 5-second blip, and then the entire application went down for 10 minutes.**
> "The health check depended on the database. During the blip every instance failed it, the platform
> killed them all, and they restarted together — a cold start stampede with connection storms. Fix: a
> liveness check that only checks the process, a readiness check for dependencies, and a longer failure
> threshold. A dependency blip should remove traffic briefly, not restart the fleet."

**S17. Traffic doubled for a campaign; you scaled the API to 10 instances and the database fell over.**
> "Connection exhaustion — each instance opened its own pool, and together they exceeded Postgres's limit.
> Short term: reduce the pool size per instance. Proper fix: a connection pooler like PgBouncer or RDS
> Proxy, a maximum in autoscaling, read replicas for heavy reads, and caching hot queries. Scaling the app
> tier always needs a check on what it does to the database."

---
---

# LEVEL 5 — CI/CD

---

## 12. The CI/CD pipeline

### The simple idea

| Word | Meaning |
|---|---|
| **CI — Continuous Integration** | Every push is automatically built and tested. Broken code is caught in minutes. |
| **CD — Continuous Delivery** | Every green build is *ready* to deploy; a person clicks the button. |
| **CD — Continuous Deployment** | Every green build deploys automatically. |

Picture a **car factory line**: each station checks one thing. A car with a fault is stopped at that
station — it never reaches the showroom.

### The stages

```
push → install → lint + type-check → unit tests → build image (tag = commit SHA)
     → push to registry → [staging deploy + smoke test] → production deploy
     → run migrations → swap container → health check → notify
```

### Your pipeline — GitHub Actions

```yaml
name: deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }        # ⭐ dependency cache
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm test

  deploy:
    needs: test                                        # only if tests pass
    runs-on: ubuntu-latest
    environment: production                            # can require manual approval
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t $IMAGE:${{ github.sha }} .
      - run: docker push $IMAGE:${{ github.sha }}      # tagged by commit → rollback = old tag
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          key:  ${{ secrets.EC2_SSH_KEY }}
          script: |
            export GIT_SHA=${{ github.sha }}
            docker pull $IMAGE:$GIT_SHA
            docker compose run --rm api npx prisma migrate deploy   # ⭐ migrations FIRST
            docker compose up -d --no-deps api worker               # then swap containers
            curl -fsS --retry 10 --retry-delay 3 http://localhost:3000/health
            docker image prune -f
```

### Explain it in order (this *is* the 30-second answer)

1. **Tests gate the deploy** — `needs: test`.
2. **Build once**, tag with the **commit SHA** — the exact same image goes everywhere.
3. **Migrations run before the new code** — and they must be backward compatible (§13).
4. **Health check after the swap** — the deploy fails loudly if the app does not come up.
5. **Rollback = deploy the previous SHA.**

### Good pipeline habits

| Habit | Why |
|---|---|
| **Build once, promote the same artifact** | What you tested is exactly what you ship |
| **Environments: dev → staging → prod** | Catch config and migration problems before customers do |
| **Manual approval for production** (`environment:` protection) | A human gate where it matters |
| **Cache dependencies and Docker layers** | Fast pipelines get used; slow ones get skipped |
| **Secrets in the CI secret store / OIDC** | Never in the repo or the logs |
| **Fail fast** — lint and unit tests first | Cheap checks before expensive ones |
| **Security scans** — `npm audit`, image scan, secret scan | Catch problems before production |
| **Branch protection** — PR + review + green checks required for `main` | No direct pushes to production |

### Interview questions

**Q: Walk me through what happens when you push to main.** → the 5 steps above.

**Q: CI vs continuous delivery vs continuous deployment?**
> "CI builds and tests every change automatically. Continuous delivery means every passing build is ready
> to release with one approval. Continuous deployment means it goes to production automatically with no
> human step."

**Q: Why tag images with the commit SHA?**
> "It ties the running code to an exact commit, so I always know what is deployed, and rollback is just
> redeploying a previous tag. `latest` tells me nothing and changes under me."

### Scenarios

**S18. A deploy went out with a bug that the tests did not catch. Customers are affected.**
> "Roll back first, investigate second — redeploy the previous image SHA, because restoring service beats
> finding the cause. If the release included a migration, I check it is backward compatible so the old
> code still works; that is why migrations are additive. Then: reproduce, write the missing test, fix, and
> redeploy. Longer term, a staging smoke test on the real critical flow, and a canary or feature flag for
> risky changes."

**S19. The CI pipeline takes 25 minutes, so developers skip it or batch many changes.**
> "Measure where the time goes first. Usual wins: cache dependencies and Docker layers, run lint and unit
> tests in parallel jobs, only run the slow end-to-end suite on main or before release, and split tests
> across runners. A pipeline under 10 minutes gets used; a slow one quietly stops protecting anything."

---

## 13. Deployment strategies & zero downtime

### The strategies

| Strategy | How it works | Downtime | Rollback | Cost |
|---|---|---|---|---|
| **Recreate** | Stop old, start new | ❌ Yes | Redeploy old | Cheapest |
| **Rolling** ⭐ | Replace instances a few at a time | ✅ None | Roll forward/back gradually | Low |
| **Blue-green** | Run a full new copy (green), switch all traffic at once | ✅ None | ⭐ Instant — switch back to blue | 2× resources during deploy |
| **Canary** | Send 5% of traffic to the new version, watch metrics, increase | ✅ None | Send the 5% back | Needs good metrics |
| **Feature flags** | Deploy code switched **off**, turn on for some users later | ✅ None | ⭐ Turn the flag off | Needs flag discipline |

**Picture for canary:** coal miners took a canary bird into the mine — if the bird got sick, they left
before everyone got hurt. 5% of users are the canary.

⭐ **Deploy ≠ release.** Feature flags separate them: the code is deployed Monday, the feature is released
Thursday, and turning it off needs no deploy.

### The 5 things zero downtime actually needs

| Need | How |
|---|---|
| **1. Health checks** | Traffic only goes to an instance after `/health` is green |
| **2. Graceful shutdown** ⭐ | On `SIGTERM`: stop accepting new requests, finish in-flight ones, close DB/Redis/queue connections, exit. Nest: `app.enableShutdownHooks()`. |
| **3. Overlap** | New instance is healthy **before** the old one stops |
| **4. Backward-compatible migrations** ⭐ | Old code is still running during the deploy, so the schema must work for both |
| **5. Workers shut down safely** | Stop taking jobs, finish the current one, then exit ([07 — BullMQ](07-bullmq.md)) |

⚠️ **`docker compose up -d` with one container IS downtime** — it stops the old one, then starts the new
one. Say you know this.

### Migrations without downtime — expand and contract

Renaming `phone` → `mobile`:

```
Deploy 1 (EXPAND):   add column `mobile`; code writes BOTH, reads `phone`
Backfill:            copy phone → mobile in batches
Deploy 2:            code reads `mobile`
Deploy 3 (CONTRACT): drop column `phone`
```

Dangerous in one step: renaming or dropping a column, adding `NOT NULL` without a default, adding an index
without `CONCURRENTLY` on a big table (it locks writes).

**Rollback truth:** code rolls back; **schema does not**. That is exactly why every migration is additive.

### Interview questions

**Q: Blue-green vs canary vs rolling?**
> "Rolling replaces instances gradually — cheap and the default. Blue-green runs a full second
> environment and switches all traffic at once, so rollback is instant, but it costs double during the
> deploy. Canary sends a small percentage to the new version and watches metrics before increasing — the
> safest for risky changes, but it needs good monitoring."

**Q: How do you deploy a database change with no downtime?**
> "Expand and contract. First add the new structure without breaking the old code, backfill in batches,
> switch the code over, and only remove the old structure in a later deploy. Migrations run before the
> new code and are always backward compatible, because the old version is still serving traffic."

**Q: What is graceful shutdown?**
> "When the process gets `SIGTERM`, it stops accepting new work, finishes what is in flight, closes its
> connections and then exits — so deploys and scaling do not drop requests or leave jobs half done."

**Q: How do you roll back?**
> "Redeploy the previous image tag, or turn off the feature flag. The schema does not roll back, which is
> why migrations are additive — the old code must still work with the new schema."

### Scenarios

**S20. A migration renamed a column. The deploy started, and the old containers crashed with errors.**
> "The old code was still running and still used the old column name. A rename is a breaking change in
> one step. Immediate: finish rolling forward if the new code is healthy, or add the old column back so the
> old code works. Prevention: expand and contract — add, dual-write, backfill, switch reads, drop later —
> and a CI check that flags destructive migrations for review."

**S21. Every deploy leaves some BullMQ jobs stalled or run twice.**
> "The worker container is killed mid-job. Fix: graceful shutdown in the worker — on `SIGTERM`, call
> `worker.close()` so it stops taking new jobs and finishes the current one — and give the container a
> long enough stop grace period for the longest normal job. Jobs that still get interrupted are picked up
> as stalled, which is safe only because the handlers are idempotent."

**S22. A risky new billing feature needs to go live, but you are nervous.**
> "Separate deploy from release. Ship the code behind a feature flag, switched off. Turn it on for internal
> users, then one friendly clinic, then 10%, watching errors and billing numbers at each step. If anything
> looks wrong, turn the flag off — no deploy, no rollback, seconds to recover."

---
---

# LEVEL 6 — OPERATE

---

## 14. Observability — logs, metrics, traces

### The three pillars

| Pillar | Question it answers | Example |
|---|---|---|
| **Logs** | What happened, in detail? | `{"level":"error","requestId":"r_91","tenantId":"c9","msg":"payment failed"}` |
| **Metrics** | How much, how fast, how often? | p95 latency, error rate, queue depth |
| **Traces** | Where did the time go across services? | API → queue → worker → DB → OpenAI |

**Monitoring** tells you *that* something is wrong. **Observability** helps you find out *why*.

### The four golden signals (Google SRE)

| Signal | Meaning |
|---|---|
| **Latency** | How long requests take — watch **p95/p99**, not the average |
| **Traffic** | Requests per second |
| **Errors** | Rate of failures (5xx) |
| **Saturation** | How full things are — CPU, memory, DB connections, **queue depth** |

⭐ **Why p95, not average?** If 95 requests take 100 ms and 5 take 10 seconds, the average looks fine, but
5% of users are furious.

### Good logging rules

1. **Structured JSON logs** (pino in Node), not `console.log` strings.
2. A **request/correlation ID** on every log line — passed into queue jobs too.
3. Add **tenantId** and **userId** — support becomes 10× faster.
4. **Never log** passwords, tokens, OTPs, full card numbers or patient details.
5. Log **levels** properly; do not log every success at `info` in a hot path.
6. Logs go to **stdout** and are shipped somewhere searchable (CloudWatch, Loki, Datadog, ELK).

### Alerting rules

- **Alert on symptoms users feel** (error rate, latency, queue age) — not on every CPU spike.
- **Every alert must be actionable.** An alert nobody acts on trains people to ignore alerts.
- **Alert on absence too** — "no jobs processed in 15 minutes", "no heartbeat from the cron".

### Tools to name

| Tool | Use |
|---|---|
| **CloudWatch** | AWS logs, metrics, alarms |
| **Sentry** | Error tracking with stack traces and release tags |
| **Prometheus + Grafana** | Metrics and dashboards |
| **OpenTelemetry** | Vendor-neutral standard for traces/metrics/logs |
| **Datadog / New Relic** | All-in-one paid platforms |
| **Uptime Kuma / Better Stack** | Uptime checks from outside |

### The honest answer about your setup

> 💬 "For the scale it runs at, application logs, container logs and provider dashboards have been enough
> to operate it. But diagnosis starts from a user report rather than an alert — that is the gap. In
> priority order I would add: structured JSON logs with correlation IDs, Sentry with release tags, an
> external uptime check on the health endpoint and one critical user journey, then alerts on p95 latency,
> error rate, queue depth and failed jobs, and finally tracing across API → queue → database."

⭐ Delivered as a **plan**, this is a strong answer. Delivered as an apology, it is weak. Same facts.

### Interview questions

**Q: Logs vs metrics vs traces?**
> "Logs are detailed events, metrics are numbers over time, traces follow one request across services.
> Metrics tell me something is wrong, traces tell me where, logs tell me exactly what happened."

**Q: What would you monitor for this API?**
> "The four golden signals — p95 latency, traffic, error rate, and saturation — plus, for this system,
> queue depth and the age of the oldest job, failed job count, database connections, and certificate
> expiry. And I alert on symptoms users feel, not every CPU spike."

### Scenarios

**S23. Customers tell you the app is slow before your team notices anything.**
> "We are monitoring averages or nothing. First, an external uptime check and p95 latency alerts, so we
> hear it before customers do. Then a correlation ID through every log line and a trace from the API
> through the queue and the database, so 'slow' becomes 'slow in this query for this tenant'."

**S24. Logs are costing more than the servers.**
> "Too much volume at the wrong level. I remove debug and per-success info logs in hot paths, sample
> high-volume logs, set retention — say 14 days searchable, older archived to S3 — and turn repeated
> counts into metrics instead of log lines. Logs are for events worth reading."

---

## 15. Reliability & disaster recovery

### Two numbers you must know ⭐

| Term | Question | Example |
|---|---|---|
| **RPO — Recovery Point Objective** | How much **data** can we afford to lose? | "At most 5 minutes of data" |
| **RTO — Recovery Time Objective** | How long can we be **down**? | "Back within 1 hour" |

**Simple picture:** you are writing a document and the laptop dies.
- **RPO** = when did you last save? (how much work is lost)
- **RTO** = how long until you are typing again? (how long you are stuck)

### DR strategies — cheap to expensive

| Strategy | Meaning | RTO |
|---|---|---|
| **Backup & restore** | Backups in another place; rebuild when needed | Hours |
| **Pilot light** | Database replicated; app servers off, ready to start | Tens of minutes |
| **Warm standby** | A small running copy, scaled up on failover | Minutes |
| **Multi-site active-active** | Full traffic in two places | Near zero — very expensive |

### Backups — the rules

1. **Automated**, not manual.
2. **Stored separately** — another region or account; ransomware and bad deletes also delete nearby backups.
3. **Encrypted.**
4. ⭐ **Tested.** A backup you have never restored is a hope, not a backup. Run a **restore drill**.
5. Know what is covered: database (PITR), **S3 (versioning)**, Redis (usually rebuildable), and the
   **infrastructure itself** (IaC, §16).

### Single points of failure

Ask of every component: **"If this one thing dies, does the product stop?"**
Server, database, Redis, one AZ, one DNS provider, one person who knows how to deploy.

⭐ **Bus factor** — "if the one person who knows the deploy is unavailable" is also a single point of
failure. A written runbook fixes that one cheaply.

### Incidents

1. **Detect** — alerts, not customers.
2. **Mitigate first** — roll back, fail over, scale up. **Stop the bleeding before finding the cause.**
3. **Communicate** — a status update to customers and the team.
4. **Resolve** — the real fix.
5. **Postmortem, blameless** — what happened, why, what we change. Focus on systems, not people.

**SLA / SLO / SLI in one line each:**
- **SLI** — the measurement (successful requests %).
- **SLO** — your internal target (99.9% monthly).
- **SLA** — the promise in the contract, with penalties.

99.9% = ~43 minutes of downtime a month. 99.99% = ~4 minutes.

### Interview questions

**Q: RPO vs RTO?**
> "RPO is how much data we can afford to lose — it decides backup frequency. RTO is how long we can be down
> — it decides how much standby infrastructure we pay for."

**Q: Your EC2 server dies at 2 AM. What is your recovery story?**
> "Honestly, it is a single instance, so that is the weak point and recovery is manual. But no data lives on
> that box: the app is a stateless container, uploads are in S3, and the database has automated backups
> with point-in-time recovery. Recovery is launching an instance and running the same image. What I would
> change: two instances in two AZs behind a load balancer — or ECS Fargate so instance failure is handled
> by the platform — plus infrastructure as code so rebuilding is not a memory exercise."

**Q: What is a blameless postmortem?**
> "A written review after an incident that focuses on what in the system allowed the failure — missing
> tests, alerts, safeguards — rather than who made the mistake, so people report problems honestly."

### Scenarios

**S25. The whole AWS Mumbai region has a major outage.**
> "First I check what our RTO actually requires. If we only run in one region, the honest answer is we are
> down until the region recovers, and our job is clear communication. If the business needs more, the
> plan is backups copied to a second region, infrastructure as code to rebuild there, and DNS failover —
> and we test it. Multi-region is expensive, so it should be a business decision based on the SLA, not a
> default."

**S26. You try to restore last night's backup and it is corrupted.**
> "That is why restore drills exist — we found out during an incident instead of a drill. Immediately I look
> for the next valid point: PITR logs, an older snapshot, a replica. Then prevention: scheduled automated
> restore tests into a scratch database, checksum checks, and backups kept in a separate account."

---

## 16. Infrastructure as Code (IaC)

### The simple idea

**Write your servers, networks and databases as code**, instead of clicking in the AWS console.

Like a **recipe** instead of cooking from memory — anyone can rebuild the same dish, and changes are
reviewed.

### Why it matters

- **Rebuild** everything after a disaster from the repo.
- **Review** infrastructure changes in pull requests.
- **Identical environments** — staging really matches production.
- **No "clicked by someone two years ago" mysteries.**

### Tools

| Tool | Note |
|---|---|
| **Terraform / OpenTofu** ⭐ | Most popular, works with any cloud, HCL language |
| **AWS CloudFormation** | AWS native, YAML/JSON |
| **AWS CDK** | Write infrastructure in **TypeScript** — generates CloudFormation. Nice for a Node team. |
| **Pulumi** | Infrastructure in real programming languages, multi-cloud |
| **Ansible** | Configuring servers (install packages, files) rather than creating cloud resources |

```hcl
resource "aws_s3_bucket" "recordings" {
  bucket = "goclinic-recordings"
}

resource "aws_s3_bucket_public_access_block" "recordings" {
  bucket                  = aws_s3_bucket.recordings.id
  block_public_acls       = true
  block_public_policy     = true
  restrict_public_buckets = true
}
```

### Terraform words

| Word | Meaning |
|---|---|
| **`plan`** | Show what will change — review this |
| **`apply`** | Make the changes |
| **State file** ⭐ | Terraform's memory of what exists. Store it remotely (S3 + locking), **never** only on a laptop. |
| **Drift** | Someone changed things by hand, so reality ≠ code |
| **Module** | A reusable block (e.g. "a standard VPC") |

### Interview questions

**Q: What is Infrastructure as Code and why use it?**
> "Defining infrastructure in version-controlled code instead of clicking in a console. It makes
> environments reproducible, changes reviewable, and disaster recovery a matter of running the code
> again."

**Q: What is Terraform state?**
> "Terraform's record of the real resources it manages. It must be stored remotely with locking, because
> a lost or conflicting state file means Terraform no longer knows what exists."

### Scenarios

**S27. Someone changed a security group by hand in the console; the next Terraform apply reverted it and broke access.**
> "Drift. The manual change was not in code, so Terraform restored the coded version. Immediate: add the
> needed rule to the Terraform code and apply properly. Prevention: all changes through pull requests, read-
> only console access for most people, and a scheduled `terraform plan` in CI that alerts on drift."

---

## 17. Kubernetes basics

### The simple idea

Docker runs containers. **Kubernetes decides where they run, keeps the right number running, and
replaces them when they die** — across many servers.

Picture an **airport control tower** for containers.

### The words to know

| Word | Meaning |
|---|---|
| **Cluster** | The group of machines |
| **Node** | One machine in the cluster |
| **Pod** | The smallest unit — one (or a few tightly coupled) containers |
| **Deployment** | "Keep 3 replicas of this pod running" + rolling updates |
| **Service** | A stable name and IP in front of changing pods |
| **Ingress** | HTTP routing from outside into services (like Nginx) |
| **ConfigMap / Secret** | Configuration and secrets injected into pods |
| **Namespace** | A logical section of the cluster (per team or environment) |
| **HPA** | Horizontal Pod Autoscaler — add pods based on CPU or custom metrics |
| **Liveness / readiness probes** | Restart dead pods / stop traffic to pods not ready |
| **Helm** | A package manager for Kubernetes configs |

### Do you need Kubernetes? (the mature answer)

> 💬 "Not for a small team with a few services. Kubernetes is powerful, but it is a platform you have to run
> and understand. ECS Fargate gives most of the benefit — containers, rolling deploys, autoscaling, self-
> healing — with far less to operate. I would choose Kubernetes when there are many services and teams, a
> need for portability across clouds, or a platform team to own it."

⭐ Saying "you probably do not need it yet" with reasons is a stronger answer than listing K8s features.

### Interview questions

**Q: Pod vs Deployment vs Service?**
> "A pod runs the container. A deployment keeps the desired number of pods running and handles rolling
> updates. A service gives those constantly-changing pods one stable address to reach them."

**Q: Would you use Kubernetes for this product?** → the quote above.

### Scenarios

**S28. Pods keep restarting in a loop (`CrashLoopBackOff`).**
> "The container starts and exits or fails its liveness probe. I check `kubectl logs --previous` for the
> crash reason and `kubectl describe pod` for events — common causes are a missing environment variable or
> secret, the app not reaching the database, out-of-memory kills, or a liveness probe that is too strict
> during startup. Fix the cause, and add a startup probe if the app needs longer to boot."

---

## 18. Cost optimisation

| Lever | Saving |
|---|---|
| **Right-size** — look at real CPU/memory usage | Often 30–50% on oversized instances |
| **Savings Plans / Reserved** for steady load | ~30–70% |
| **Spot** for batch workers and CI | Up to ~90% |
| **Graviton (ARM) instances** | ~20% cheaper for similar performance |
| **Turn off non-production at night** | Staging does not need to run at 3 AM |
| **S3 lifecycle rules** — old recordings → Glacier | Large for media-heavy apps |
| **CloudFront** in front of downloads | Cuts data-transfer-out costs |
| **VPC endpoints** instead of NAT for S3 | Removes NAT per-GB charges |
| **Delete what is unused** — old snapshots, unattached EBS, idle IPs, old log groups | Surprisingly large |
| **Budgets + billing alarms** | You find out on day 2, not day 30 |
| **Tags per environment/feature** | You can see *what* costs money |

> 💬 "First I make the cost visible — tags and a budget alert — then fix the biggest line, not the most
> interesting one."

### Interview questions

**Q: How would you reduce AWS cost?**
> "Make it visible first with tags and budgets. Then right-size instances from real usage, commit to
> Savings Plans for steady load, use spot for batch and CI, put CloudFront in front of downloads, add S3
> lifecycle rules and VPC endpoints, and delete unused resources. Biggest line item first."

---

## 19. Security in deployment

| Area | Practice |
|---|---|
| **Access** | No SSH open to the world — restrict to your IP, or better, **SSM Session Manager** with no port 22 at all |
| **Least privilege** | Roles per service; CI can deploy but not delete the database |
| **Network** | App and database in private subnets; security groups reference each other |
| **Patching** | Rebuild images regularly; automatic OS security updates; minimal base images |
| **Supply chain** | `npm audit`, Dependabot, image scanning (ECR / Trivy), pinned versions |
| **Secrets** | Secrets manager + roles; secret scanning on every commit |
| **Edge protection** | AWS WAF / Cloudflare for common attacks and rate limits; Shield for DDoS |
| **Audit** | **CloudTrail** on — who did what in the AWS account |
| **Encryption** | TLS in transit; encryption at rest for RDS, S3, EBS |
| **Humans** | MFA on every account; no shared root login |

### Interview questions

**Q: How do you secure a production server?**
> "No public SSH — Session Manager or at least an IP allow-list with keys only. The app and database sit in
> private subnets behind a load balancer. Services use IAM roles with least privilege, secrets come from a
> secrets manager, images are scanned and rebuilt for patches, CloudTrail records account activity, and
> every human account has MFA."

### Scenarios

**S29. Your server's SSH logs show thousands of login attempts per hour.**
> "Port 22 is open to the internet, so bots are brute-forcing it. Immediately restrict the security group to
> known IPs and confirm password login is disabled — keys only. Better: close port 22 completely and use
> AWS Systems Manager Session Manager, which needs no open port and logs every session."

---
---

# WRAP-UP

---

## 20. Maps to YOUR projects — the honest version

| Area | What you have | The sentence to say |
|---|---|---|
| **Compute** | Single EC2 instance running Docker Compose (API + worker) | "Containerised and stateless, so moving to more instances or Fargate is a platform change, not an app rewrite" |
| **CI/CD** | GitHub Actions → image tagged by SHA → registry → SSH deploy | "Tests gate the deploy, the same image goes to production, rollback is the previous SHA" |
| **Migrations** | `prisma migrate deploy` before the container swap | "Migrations run first and are always additive, because schema does not roll back" |
| **Proxy / TLS** | Nginx + Let's Encrypt, WebSocket upgrade config | "TLS, routing and WebSocket upgrades at Nginx; certificates auto-renew" |
| **Files** | S3 + CloudFront, presigned URLs | "The bucket is private; the app server never touches upload bytes" |
| **Data safety** | Automated database backups with PITR | "No data lives on the app server" |
| **Secrets** | GitHub Actions secrets + env vars at runtime | "Never in the image or repo; next step is Secrets Manager via a role" |
| **Monitoring** | Logs + provider dashboards | "The gap is alerting — Sentry, structured logs with correlation IDs, and a queue-depth alert come first" |
| **Availability** | ⚠️ Single instance, no load balancer | "The known weak point — plan is two AZs behind an ALB, or ECS Fargate, plus IaC" |

⭐ **Say the gaps before they find them.** "Here is what it has, here is what it lacks, here is the order I
would fix it in" — that is exactly how a senior engineer talks about their own system.

---

## 21. Big design questions

**S30. "Make Clinic Cloud production-grade and highly available. Walk me through it."**
> "I would go in steps, each one useful on its own.
>
> **Step 1 — stop being blind.** Structured logs with correlation IDs, Sentry, an external uptime check,
> and alerts on error rate, p95 latency, queue depth and failed jobs. Cheap, and it makes every later step
> safer.
>
> **Step 2 — remove the single server.** Move the containers to ECS Fargate — API and worker as separate
> services — across two AZs in private subnets, behind an ALB with health checks and rolling deploys. The
> app is already stateless, so this is a platform change.
>
> **Step 3 — managed data.** RDS Postgres with Multi-AZ and PITR, ElastiCache for Redis with the queue
> instance on `noeviction`, and S3 with versioning. Tenant databases get a connection pooler.
>
> **Step 4 — code the infrastructure.** Terraform or CDK for all of it, state in S3 with locking, changes
> through pull requests.
>
> **Step 5 — safer releases.** Staging that mirrors production, migrations with expand-and-contract, feature
> flags for risky features, and GitHub OIDC instead of stored keys.
>
> **Step 6 — prove recovery.** Written RPO and RTO, backups copied to another region, and a scheduled
> restore drill.
>
> I would do them in that order because visibility and removing the single point of failure give the
> biggest risk reduction for the least cost."

**S31. "Design the deployment for a new Node API expected to grow from 100 to 100,000 users."**
> "Start simple but stateless: one container image, config from environment, files in S3, sessions in
> Redis, a managed Postgres with backups. Deploy on ECS Fargate or App Runner behind a load balancer with
> a minimum of two tasks, and a CI pipeline that builds once and deploys with health checks. Add
> CloudFront for static assets and monitoring from day one.
> As it grows: autoscaling on request count and queue depth, read replicas and caching for the database,
> a connection pooler, and separate worker services. I would not start with Kubernetes or multi-region —
> I would design so that adding them later does not need a rewrite."

---

## 22. Rapid-fire — by level

### Level 1 — Basics
| Word | One line |
|---|---|
| **IaaS / PaaS / SaaS** | Rent the machine / the platform / the finished software |
| **Region** | A geographic area with data centres |
| **AZ** | A separate data centre inside a region |
| **Shared responsibility** | AWS secures the cloud; you secure what you put in it |
| **DNS A / CNAME** | Name → IP / name → name |
| **TTL** | How long DNS answers are cached |
| **Reverse proxy** | Public front door that forwards to your app |
| **TLS termination** | Decrypting HTTPS at the proxy |
| **Stateless** | Server keeps nothing between requests |
| **12-factor** | Checklist for cloud-friendly apps |

### Level 2 — Docker
| Word | One line |
|---|---|
| **Image / container** | The recipe / a running copy |
| **Layer cache** | Unchanged steps are reused |
| **Multi-stage build** | Build in one stage, ship only the output |
| **`.dockerignore`** | Keeps junk and secrets out of the image |
| **Registry** | Where images are stored (ECR, GHCR) |
| **Docker Compose** | Run several containers together on one host |
| **Volume** | Storage that survives the container |
| **Exec-form CMD** | Lets Node receive SIGTERM |

### Level 3 — AWS
| Word | One line |
|---|---|
| **EC2** | A virtual machine |
| **ECS Fargate** | Run containers without managing servers |
| **Lambda** | Run a function per event; 15-min limit |
| **Cold start** | Delay starting a fresh serverless instance |
| **S3 presigned URL** | Temporary upload/download link |
| **RDS PITR** | Restore the DB to any second |
| **Multi-AZ vs read replica** | Availability vs read scaling |
| **VPC** | Your private network in AWS |
| **Public / private subnet** | Internet-reachable / not |
| **NAT gateway** | Lets private servers call out |
| **Security group** | Stateful firewall on a resource |
| **NACL** | Stateless firewall on a subnet |
| **ALB / NLB** | HTTP load balancer / TCP load balancer |
| **CloudFront** | AWS CDN |
| **IAM role** | Temporary permissions for a service |
| **Least privilege** | Only the permissions needed |
| **OIDC for CI** | CI gets short-lived AWS credentials, no stored keys |
| **Secrets Manager / SSM** | Where secrets live |

### Level 4 — Traffic
| Word | One line |
|---|---|
| **`X-Forwarded-For`** | Carries the real client IP through the proxy |
| **`client_max_body_size`** | Nginx upload limit; default 1 MB |
| **413 / 502** | Body too large / upstream not responding |
| **Vertical / horizontal scaling** | Bigger machine / more machines |
| **Sticky sessions** | Same client → same server |
| **Liveness / readiness** | Restart if dead / no traffic if not ready |
| **Autoscaling** | Add or remove instances on a metric |

### Level 5 — CI/CD
| Word | One line |
|---|---|
| **CI** | Build and test every change |
| **Continuous delivery / deployment** | Ready to release / released automatically |
| **SHA tag** | Image tied to an exact commit |
| **Rolling** | Replace instances gradually |
| **Blue-green** | Full new copy, switch all traffic |
| **Canary** | Small % of traffic first |
| **Feature flag** | Deploy off, release later |
| **Graceful shutdown** | Finish in-flight work before exiting |
| **Expand and contract** | Safe multi-step schema change |

### Level 6 — Operate
| Word | One line |
|---|---|
| **Logs / metrics / traces** | What happened / how much / where |
| **Golden signals** | Latency, traffic, errors, saturation |
| **p95** | 95% of requests are faster than this |
| **Correlation ID** | Links all logs of one request |
| **RPO / RTO** | Data loss allowed / downtime allowed |
| **Restore drill** | Proving backups actually restore |
| **SLI / SLO / SLA** | Measurement / target / contract |
| **Blameless postmortem** | Fix the system, not the person |
| **IaC** | Infrastructure written as code |
| **Terraform state** | Terraform's record of what exists |
| **Drift** | Reality no longer matches the code |
| **Pod / Deployment / Service** | Container / desired replicas / stable address |
| **CrashLoopBackOff** | Pod crashing and restarting repeatedly |
| **Spot instance** | Cheap capacity that can be taken back |
| **CloudTrail** | Audit log of AWS account actions |
| **Session Manager** | Shell access without opening port 22 |

---

## 23. Self-check — by level

**Level 1**
- [ ] Explain IaaS / PaaS / SaaS with the pizza example
- [ ] Explain region vs AZ and why 2 AZs
- [ ] Say the 7 steps of "what happens when I type a URL"
- [ ] Explain a reverse proxy and stateless apps

**Level 2**
- [ ] Explain container vs VM
- [ ] Write a multi-stage Dockerfile and explain 5 decisions
- [ ] Explain layer caching and why secrets must not be in images
- [ ] Explain Compose, volumes, and when Compose is not enough

**Level 3**
- [ ] Choose between EC2, Fargate and Lambda
- [ ] Explain the presigned URL upload flow
- [ ] Explain Multi-AZ vs read replica, and PITR
- [ ] Draw the VPC layout: ALB public, app and DB private
- [ ] Explain security group vs NACL
- [ ] Explain IAM roles vs keys, and OIDC for CI

**Level 4**
- [ ] Write the Nginx WebSocket block and explain `X-Forwarded-For`
- [ ] Explain horizontal scaling and what it needs
- [ ] Explain liveness vs readiness and the database-blip trap

**Level 5**
- [ ] Recite your CI/CD pipeline start to finish
- [ ] Explain rolling, blue-green, canary and feature flags
- [ ] List the 5 things zero downtime needs
- [ ] Explain expand and contract with an example

**Level 6**
- [ ] Explain logs vs metrics vs traces and the golden signals
- [ ] Deliver the monitoring answer as a prioritised plan
- [ ] Explain RPO vs RTO with the laptop example
- [ ] Give the honest 2 AM EC2 recovery answer
- [ ] Explain IaC and Terraform state
- [ ] Explain pod, deployment, service — and when not to use Kubernetes
- [ ] Give 5 cost-saving levers

---

## 24. Traps — how people lose this round

**Basics & Docker**
1. **Claiming high availability you do not have.** One follow-up exposes it.
2. **Secrets or `.env` baked into the image.**
3. **Deploying `latest`** — no idea what is running, no clean rollback.
4. **Running containers as root.**
5. **`npm start` as CMD** — Node never receives `SIGTERM`.
6. **Saving uploads on the server's local disk.**

**AWS**
7. **Public S3 buckets.**
8. **Access keys on servers** instead of IAM roles.
9. **Databases in public subnets** or security groups open to `0.0.0.0/0`.
10. **Confusing Multi-AZ with read replicas.**
11. **Forgetting data-transfer and NAT costs.**

**Traffic & deploys**
12. **Forgetting `docker compose up` with one container is downtime.**
13. **Zero downtime claimed without health checks and graceful shutdown.**
14. **Renaming or dropping a column in one deploy.**
15. **Liveness checks that depend on the database.**
16. **Scaling the app without checking database connections.**
17. **Forgetting `client_max_body_size` and WebSocket headers in Nginx.**

**Operate**
18. **"We'd restore from backup"** without knowing RPO/RTO — or ever testing a restore.
19. **Monitoring averages** instead of p95/p99.
20. **Alerts nobody acts on.**
21. **Terraform state only on a laptop.**
22. **"We should use Kubernetes"** with no reason beyond it being popular.
23. **Over-claiming observability** you do not have — deliver the gap as a plan instead.
