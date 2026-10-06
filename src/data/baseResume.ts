import type { Resume, Profile } from "../types";

/** Your real resume. The AI may only re-emphasise what is in here — never invent. */
export const BASE: Resume = {
  name: "NAYAN MEHTA",
  title: "Full-Stack Software Engineer",
  subtitle: "React / Next.js | Node.js / NestJS | React Native | AI / LLM | AWS",
  contact: {
    phone: "+91 8118899048",
    email: "nayanmehta2004@gmail.com",
    /* Recruiters filter by city before a human reads anything — state the
       relocation/remote answer here so a non-metro address is not an auto-reject. */
    location: "Udaipur, India · Open to Relocate & Remote",
    linkedin: "linkedin.com/in/nayan-mehta",
    linkedinUrl: "https://www.linkedin.com/in/nayan-mehta-6b3959300",
    portfolio: "portfolio-black-rho.vercel.app",
    portfolioUrl: "https://portfolio-black-rho.vercel.app",
  },
  summary: [
    "Full-Stack Software Engineer with 2+ years of experience shipping production products across web, backend, mobile and AI — React / Next.js frontends, Node.js / NestJS REST APIs on PostgreSQL, React Native apps and LLM-powered features, deployed on AWS.",
    "Built and operate Clinic Cloud, a live multi-tenant healthcare SaaS; engineered a database-per-tenant AI interview platform for 6+ universities and a public voice-AI API of 56+ endpoints; and have built or maintained 10+ production apps with 1.5M+ combined downloads. Open to relocation or remote work, available to join immediately.",
  ],
  skills: [
    { label: "Frontend", items: ["React", "Next.js", "TypeScript", "JavaScript (ES6+)", "Redux Toolkit (RTK Query)", "Axios", "Zod", "Formik"] },
    { label: "Backend", items: ["Node.js", "NestJS", "Express.js", "REST APIs", "PostgreSQL", "MySQL", "MongoDB", "Prisma", "Redis", "BullMQ", "WebSocket / Socket.IO", "Multi-Tenant Architecture", "JWT + RBAC"] },
    { label: "Mobile", items: ["React Native", "Kotlin (Native Modules)", "Offline-first SQLite", "Firebase (FCM)", "Google Play Console", "App Store Connect"] },
    { label: "AI & Voice", items: ["LLMs (OpenAI, Gemini)", "RAG(Pinecone, pgvector)", "Embeddings(OpenAI, Deepgram)", "Chunking", "Vector DB (Pinecone, pgvector)", "STT (Deepgram , Whisper)", "TTS (ElevenLabs)", "OCR (Azure Document Intelligence)", "LangChain (basic)"] },
    { label: "Cloud & DevOps", items: ["AWS (EC2 / S3 / CloudFront)", "Hostinger VPS", "Docker", "Nginx", "GitHub Actions CI/CD", "Let's Encrypt HTTPS"] },
    { label: "Payments & APIs", items: ["Razorpay", "Stripe", "PayPal", "Coinbase", "WhatsApp Cloud API", "ABDM / ABHA", "Google Maps SDK", "AdMob"] },
    { label: "Testing & Tools", items: ["Jest", "Unit Testing", "Detox", "Postman", "Android Studio", "Git", "Swagger"] },
  ],
  experience: [
    {
      company: "Edysor.ai",
      role: "Full-Stack Engineer",
      date: "Oct 2025 – Present",
      place: "Udaipur, Rajasthan · Mobile apps & backend platforms across edtech, AI-voice, and recruitment products.",
      groups: [
        {
          track: "Mobile — React Native & Native Android",
          projects: [
            {
              title: "B2C CRM — Study Abroad Lead Management",
              meta: "React Native + Kotlin Native Modules + Real-Time WebSocket",
              bullets: [
                "Built Kotlin native modules with Android Broadcast Receivers that captured 100% of inbound/outbound calls — 5,000+ call logs with zero data loss.",
                "Added web-to-mobile click-to-call driven by real-time WebSocket events through a background foreground service.",
                "Implemented a Truecaller-style live lead overlay that matches any call to a CRM lead with context and quick actions.",
                "Built a call-recording pipeline — 2,000+ recordings with transcripts and NLP sentiment analysis (emotion timeline, talk/silence ratio) — backed by an offline retry queue.",
                "Designed an offline-first SQLite architecture with background sync and conflict resolution — 300+ leads managed in production.",
                "Built real-time team switching that invalidates team-scoped caches and re-subscribes native socket services.",
              ],
            },
            {
              title: "GORec — AI-Powered Recruitment App",
              meta: "React Native 0.85, WebSocket, RTK Query · Live on Google Play",
              bullets: [
                "Built a real-time conversational AI app with a WebSocket streaming pipeline (auto-reconnect, token auth) delivering live AI job/candidate cards, shortlisting and one-tap Excel export.",
                "Engineered a voice-to-job feature using Deepgram speech-to-text to convert spoken briefs into structured search criteria (role, skills, budget, location, notice period).",
              ],
            },
          ],
        },
        {
          track: "Backend — NestJS / Node.js",
          projects: [
            {
              title: "Interview AI — Voice Interview SaaS for Universities",
              meta: "NestJS, Prisma, Redis/BullMQ, OpenAI, Pinecone, Next.js",
              bullets: [
                "Engineered a database-per-tenant architecture (AsyncLocalStorage tenant resolution + LRU connection pool) with fully automated provisioning and migrations — live with 6+ university tenants, 300+ students onboarded and 70+ AI mock interviews conducted.",
                "Built an end-to-end AI interview pipeline — STT → LLM evaluation → TTS — scoring every answer correct/incorrect and emailing the student a PDF report on idempotent, retryable BullMQ workers.",
                "Added Azure Document Intelligence OCR for ID verification and vector search over the question bank and transcripts (pgvector + Pinecone, per-tenant namespaces).",
                "Built a WhatsApp AI assistant on the Meta Cloud API that answers student queries and books interview slots, using LangChain with vector-DB retrieval over each university's content.",
                "Developed the React / Next.js frontend — admin dashboards, student onboarding and document upload, interview reporting UI and a bulk email-campaign tool with customisable templates.",
                "Built live proctoring during the interview: screen recording, real-time emotion and eye-contact detection, and photo capture.",
              ],
            },
            {
              title: "Sicada AI — Voice API Platform (Public OpenAPI Layer)",
              meta: "Node.js, TypeScript, REST / OpenAPI, API-Key Auth",
              bullets: [
                "Designed and built a public OpenAPI gateway of 56+ REST endpoints that lets third-party software run AI voice-calling campaigns — agents, campaigns, RAG knowledge bases, phone numbers, scheduled calls, transcripts and billing — consumed by 10+ external client integrations.",
                "Built API-key issuance, management and per-request authentication so partner software integrates without interactive login, securely orchestrating external voice/telephony services behind the gateway.",
                "Built the endpoints to India's DPDP data-protection requirements and authored a searchable developer API reference.",
              ],
            },
          ],
        },
      ],
    },
    {
      company: "Clinic Cloud",
      role: "Independent Project (Solo Developer)",
      /* TODO(Nayan): replace START with the real month you began Clinic Cloud, e.g. "Feb 2025 – Present".
         A dateless entry sitting among dated jobs is read by ATS parsers as a broken
         record or an employment gap — every other entry here carries a date. */
      date: "Live in Production",
      place: "goclinic.online · Built and operated end-to-end on personal time · NestJS, Prisma, PostgreSQL, Redis, React / Next.js, AWS.",
      bullets: [
        "Architected a multi-tenant healthcare SaaS serving multiple isolated clinics across 27+ feature modules from a single NestJS deployment — header-based tenant isolation, JWT + OTP auth, fine-grained RBAC and subscription-feature gating.",
        "Integrated India's ABDM/ABHA national health-record system end-to-end: HIP bridge services, ABHA patient creation, scan-and-share consent flows, QR generation and server-to-server callbacks.",
        "Built real-time appointment booking (Socket.IO, token-based slots, holiday/leave validation) and a multi-language WhatsApp Cloud API bot for bookings, reminders, payment links and QR check-in on BullMQ queues.",
        "Shipped Razorpay subscription billing with webhooks and automated invoice PDFs to S3.",
        "Scaled a Prisma layer of 80+ models / 39+ migrations with Redis caching for hot clinic and permission data.",
        "Built the React / Next.js app for clinic staff and admins — appointments, patient records, billing and analytics — with role-based UI gating.",
        "Operate Dockerized CI/CD to AWS EC2 via GitHub Actions with Nginx, Let's Encrypt HTTPS and zero-downtime migrations.",
      ],
    },
    {
      company: "WebSenor Private Limited",
      role: "React Native + Node.js Developer",
      date: "Sep 2024 – Oct 2025",
      place: "Udaipur, Rajasthan · React Native apps across WebSenor products and client assignments, including a client assignment at MetaStart.",
      groups: [
        {
          track: "MetaStart — Client Assignment · May 2025 – Oct 2025",
          projects: [
            {
              title: "MyFlama — Social App",
              meta: "React Native · Android & iOS · 100K+ downloads",
              bullets: [
                "Built a reels-style short-video feed with optimized rendering for smooth playback on mid-range devices, plus real-time chat, Google Maps live location tracking, AdMob ads and Firebase push notifications.",
              ],
            },
            {
              title: "EL-Pico — Club Automation",
              meta: "React Native + Node.js · real-time slot booking · Stripe & Coinbase (crypto)",
              bullets: [
                "Built the Node.js backend for real-time slot booking — live availability and session-based slot locking that holds a slot during checkout, so two members can never book the same slot.",
                "Developed membership management, event workflows and the booking UI in React Native, with Stripe and Coinbase (crypto) payments.",
              ],
            },
          ],
        },
        {
          track: "WebSenor — Product & Client Apps · Sep 2024 – May 2025",
          projects: [
            {
              title: "Supraa — Grocery Delivery",
              meta: "React Native + Node.js · Socket.IO live tracking · checkout & GST",
              bullets: [
                "Built real-time delivery-partner tracking end to end — a background activity that keeps streaming the partner's location while the app is backgrounded, and a Socket.IO backend that pushes it live to the customer's order screen.",
                "Engineered a full checkout system with discount/GST calculation, quick-commerce ordering, geolocation-based listings and real-time order tracking.",
              ],
            },
            {
              title: "BigValue — Travel App",
              meta: "React Native + Node.js · Thomalex & Riya flight APIs · PayPal & Razorpay",
              bullets: [
                "Built the flight-booking backend service, integrating the Thomalex and Riya travel APIs for real-time flight search, fare and seat-availability data.",
                "Built the flight booking module (one-way / round-trip / multi-city) in React Native with PayPal and Razorpay payments.",
              ],
            },
            {
              title: "Housecaller — Home Services",
              meta: "React Native · Android & iOS · 10K+ downloads",
              bullets: [
                "Built the customer app for booking verified home-service professionals — service discovery, scheduling and booking tracking.",
              ],
            },
            {
              title: "BRPL & BYPL — Govt Utility Apps",
              meta: "Delhi electricity providers · 1M+ and 500K+ downloads",
              bullets: [
                "Maintained two of Delhi's electricity-provider apps serving millions of consumers — bug fixes, dependency/SDK upgrades and Play Store release updates.",
                "Maintained Peclick, SoulSpace and Real Sampada alongside — ongoing fixes, compatibility updates and store releases.",
              ],
            },
          ],
        },
      ],
    },
    {
      company: "Marvik Academy for Technical Education",
      role: "MERN Stack Intern",
      date: "Jul 2024 – Aug 2024",
      bullets: [
        "Developed the backend for a Weapon Management System (Indian Army) using the MERN stack for inventory, allocation, and reporting.",
      ],
    },
  ],
  /* Kept short on purpose: this section repeats the bullets above, so every extra
     line here pushes the experience a recruiter actually reads further down. */
  coreStrengths: [
    "End-to-end ownership — Kotlin native modules → React Native / Next.js UI → NestJS APIs → PostgreSQL / Prisma → AWS.",
    "Multi-tenant SaaS & public API design — shared-DB and database-per-tenant systems, OpenAPI gateways, RBAC, queues and automated provisioning.",
    "Production track record — a live SaaS in production and 10+ apps built or maintained with 1.5M+ combined downloads.",
  ],
  education: [
    { deg: "Master of Computer Applications (MCA)", inst: "Rajasthan Technical University (RTU), Kota — Distance Mode", date: "Aug 2024 – May 2026" },
    { deg: "Bachelor of Computer Applications (BCA)", inst: "Mohanlal Sukhadia University (MLSU), Udaipur", date: "Aug 2021 – Jul 2024" },
  ],
  /* One block per role the resume can be positioned for. positionResume() swaps
     the headline, summary and strengths in, reorders the skills and experience,
     and — in Focused depth — keeps only the bullets that role values most.
     Every claim here also appears in the experience above; nothing is invented. */
  positioning: {
    fullstack: {
      title: "Full Stack Developer",
      subtitle: "React / Next.js | Node.js / NestJS | TypeScript | PostgreSQL | AWS",
      summary: [
        "Full Stack Developer with 2+ years of experience building web products end to end — React / Next.js frontends, TypeScript and Node.js / NestJS APIs, PostgreSQL / Prisma data models, Redis / BullMQ queues and Dockerized AWS deployments.",
        "Built and operate Clinic Cloud, a live multi-tenant healthcare SaaS with 27+ feature modules and a Next.js staff app, and engineered Interview AI, a database-per-tenant platform serving 6+ university tenants. Also designed a public OpenAPI gateway of 56+ REST endpoints, with additional React Native mobile experience. Open to relocation or remote work, available to join immediately.",
      ],
      strengths: [
        "End-to-end web delivery — React / Next.js UI → NestJS APIs → PostgreSQL / Prisma → Dockerized AWS with GitHub Actions CI/CD.",
        "Multi-tenant SaaS & public API design — shared-DB and database-per-tenant systems, OpenAPI gateways, RBAC, queues and automated provisioning.",
      ],
    },
    fsmobile: {
      title: "Full Stack Mobile Developer",
      subtitle: "React Native | Kotlin Native Modules | Node.js / NestJS | TypeScript | PostgreSQL | AWS",
      summary: [
        "Full Stack Mobile Developer with 2+ years of experience owning mobile products end to end — React Native apps with custom Kotlin native modules, offline-first data and real-time features, plus the Node.js / NestJS APIs, PostgreSQL data models and AWS deployments behind them.",
        "Built or maintained 10+ production apps with 1.5M+ combined downloads on Google Play and the App Store, including a call-tracking CRM whose Kotlin modules captured 5,000+ call logs with zero data loss. On the server side, built the real-time Node.js / Socket.IO backends for slot booking and live delivery tracking, and operate Clinic Cloud, a live multi-tenant SaaS. Open to relocation or remote work, available to join immediately.",
      ],
      strengths: [
        "Owns a feature from native module to API — Kotlin native modules → React Native UI → Node.js / NestJS APIs → PostgreSQL → AWS.",
        "Production track record — 10+ apps built or maintained with 1.5M+ combined downloads, plus a live SaaS in production.",
      ],
    },
    fsai: {
      title: "Full Stack AI Engineer",
      subtitle: "LLMs | RAG & Vector DB | STT / TTS | Node.js / NestJS | React / Next.js | AWS",
      summary: [
        "Full Stack AI Engineer with 2+ years of experience building production LLM and voice-AI products end to end — RAG pipelines (chunking, embeddings, pgvector / Pinecone vector search), LLM-based evaluation, speech-to-text / text-to-speech voice agents and OCR, delivered through Node.js / NestJS APIs and React / Next.js frontends.",
        "Built Interview AI, a voice-interview platform (STT → LLM → TTS) serving 6+ university tenants with 70+ AI interviews conducted, and a public voice-AI API gateway of 56+ REST endpoints used by 10+ client integrations. Also shipped AI features in mobile apps: a Deepgram voice-to-job assistant and NLP sentiment analysis on 2,000+ call recordings. Open to relocation or remote work, available to join immediately.",
      ],
      strengths: [
        "Applied AI end to end — RAG (chunking, embeddings, vector search), LLM evaluation, STT / TTS voice pipelines and OCR, shipped behind real product UIs.",
        "Production AI platforms — a database-per-tenant voice-interview SaaS and a public voice-AI API consumed by 10+ client integrations.",
      ],
    },
    mobile: {
      title: "Mobile App Developer (React Native & Kotlin)",
      subtitle: "React Native | Kotlin Native Modules | TypeScript | Offline-first | Play Store & App Store",
      summary: [
        "Mobile App Developer with 2+ years of experience who has built or maintained 10+ production apps with 1.5M+ combined downloads on Google Play and the App Store — React Native with custom Kotlin native modules, offline-first data, real-time features and end-to-end store releases.",
        "Built a call-tracking CRM whose Kotlin modules captured 5,000+ call logs with zero data loss, built core features for a social app with 100K+ downloads, and maintained government utility apps with 1M+ and 500K+ downloads. Backed by Node.js / NestJS experience to own features from native module to API. Open to relocation or remote work, available to join immediately.",
      ],
      strengths: [
        "Native depth in a cross-platform stack — custom Kotlin modules, Android Broadcast Receivers and foreground services under React Native.",
        "Store-scale delivery — 10+ apps built or maintained with 1.5M+ combined downloads across Google Play and the App Store.",
      ],
    },
    backend: {
      title: "Backend Engineer (Node.js / NestJS)",
      subtitle: "Node.js | NestJS | TypeScript | PostgreSQL | Redis / BullMQ | AWS",
      summary: [
        "Backend Engineer with 2+ years of experience designing multi-tenant SaaS backends and public REST APIs in Node.js / NestJS and TypeScript — PostgreSQL / Prisma data models, Redis / BullMQ job queues, real-time WebSockets and Dockerized AWS deployments.",
        "Architected Interview AI's database-per-tenant platform (6+ university tenants, automated provisioning) and Clinic Cloud, a live healthcare SaaS with 27+ modules, 80+ Prisma models and India's ABDM/ABHA integration. Built a public OpenAPI gateway of 56+ REST endpoints consumed by 10+ client integrations. Open to relocation or remote work, available to join immediately.",
      ],
      strengths: [
        "Multi-tenant SaaS & public API design — shared-DB and database-per-tenant systems, OpenAPI gateways, RBAC and automated provisioning.",
        "Reliable async systems — idempotent, retryable BullMQ workers, Redis caching and zero-downtime migrations.",
      ],
    },
  },
};

export const PROFILE_DEFAULT: Profile = {
  exp: "2+ Years",
  notice: "Immediate",
  current: "₹4.5 LPA",
  expected: "₹8–10 LPA",
  roles: "Full Stack Developer, Full Stack Mobile Developer, Full Stack AI Engineer, Mobile App Developer",
};
