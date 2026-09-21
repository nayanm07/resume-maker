import type { Resume, Profile } from "../types";

/** Your real resume. The AI may only re-emphasise what is in here — never invent. */
export const BASE: Resume = {
  name: "NAYAN MEHTA",
  title: "Full-Stack Software Engineer",
  subtitle: "React / Next.js | Node.js / NestJS | React Native | AI / LLM | AWS",
  contact: {
    phone: "+91 8118899048",
    email: "nayanmehta2004@gmail.com",
    location: "Udaipur, Rajasthan, India",
    linkedin: "linkedin.com/in/nayan-mehta",
    linkedinUrl: "https://www.linkedin.com/in/nayan-mehta-6b3959300",
    portfolio: "portfolio-black-rho.vercel.app",
    portfolioUrl: "https://portfolio-black-rho.vercel.app",
  },
  summary: [
    "Full-Stack Software Engineer with 2+ years of experience shipping production products across web, backend, mobile and AI — React / Next.js frontends, Node.js / NestJS APIs on PostgreSQL, React Native apps and LLM-powered features, deployed on AWS.",
    "Built and operate Clinic Cloud, a live multi-tenant healthcare SaaS; engineered a database-per-tenant AI interview platform for 6+ universities and a public voice-AI API of 56+ endpoints; and have built or maintained 10+ production apps with 1.5M+ combined downloads.",
  ],
  skills: [
    { label: "Frontend", items: ["React", "Next.js", "TypeScript", "JavaScript (ES6+)", "Redux Toolkit (RTK Query)", "Axios", "Zod", "Formik"] },
    { label: "Backend", items: ["Node.js", "NestJS", "Express.js", "PostgreSQL", "MySQL", "MongoDB", "Prisma", "Redis", "BullMQ", "WebSocket / Socket.IO", "Multi-Tenant Architecture", "JWT + RBAC"] },
    { label: "Mobile", items: ["React Native", "Kotlin (Native Modules)", "Offline-first SQLite", "Firebase (FCM)", "Google Play Console", "App Store Connect"] },
    { label: "AI & Voice", items: ["LLMs (OpenAI)", "RAG", "Embeddings", "Chunking", "Vector DB (Pinecone)", "STT (Deepgram)", "TTS (ElevenLabs)", "OCR (Azure Document Intelligence)", "LangChain (basic)"] },
    { label: "Cloud & DevOps", items: ["AWS (EC2 / S3 / CloudFront)", "Hostinger VPS", "Docker", "Nginx", "GitHub Actions CI/CD", "Let's Encrypt HTTPS"] },
    { label: "Payments & APIs", items: ["Razorpay", "Stripe", "PayPal", "Coinbase", "WhatsApp Cloud API", "ABDM / ABHA", "Google Maps SDK", "AdMob"] },
    { label: "Testing & Tools", items: ["Jest", "Detox", "Postman", "Android Studio", "Git", "Swagger"] },
  ],
  experience: [
    {
      company: "Edysor.ai",
      role: "Full-Stack Mobile & Backend Engineer",
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
                "Built Kotlin Native Modules bridged with React Native, implementing Android Broadcast Receivers that captured 100% of inbound/outbound calls — 5,000+ call logs collected with zero data loss — plus web-to-mobile click-to-call triggered by real-time WebSocket events through a background foreground service.",
                "Implemented a Truecaller-style real-time lead overlay that matches any call to a CRM lead with live context and quick actions, and a call-recording pipeline that has processed 2,000+ recordings with transcripts and NLP sentiment analysis (emotion timeline, talk/silence ratio, action items), backed by an offline retry queue.",
                "Designed an offline-first architecture using SQLite with background sync and conflict resolution — 300+ leads created and managed in production — with real-time team switching that invalidates team-scoped caches and re-subscribes native socket services.",
              ],
            },
            {
              title: "GORec — AI-Powered Recruitment App",
              meta: "React Native 0.85, WebSocket, RTK Query · Live on Google Play",
              bullets: [
                "Built a real-time conversational AI app with a WebSocket streaming pipeline (auto-reconnect, token auth) delivering live AI job/candidate cards, shortlisting, and one-tap Excel export.",
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
                "Engineered a database-per-tenant architecture (AsyncLocalStorage tenant resolution + LRU connection pool) with fully automated provisioning and migrations — live in production with 6+ university tenants, 300+ students onboarded, and 70+ AI mock interviews conducted.",
                "Built an end-to-end AI interview pipeline — STT → LLM evaluation → TTS, Azure Document Intelligence OCR for ID verification, Pinecone RAG over per-tenant namespaces, and automated PDF reports — processed asynchronously via idempotent, retryable BullMQ workers.",
                "Developed the React / Next.js web frontend — university admin dashboards, student onboarding and document upload, and interview reporting UI — integrated with the multi-tenant API.",
              ],
            },
            {
              title: "Sicada AI — Voice API Platform (Public OpenAPI Layer)",
              meta: "Node.js, TypeScript, REST / OpenAPI, API-Key Auth",
              bullets: [
                "Designed and built the public OpenAPI gateway (56+ REST endpoints) that lets third-party software run AI voice-calling campaigns programmatically — Agents, Campaigns, Knowledge Bases (RAG), Phone Numbers, Scheduled Calls, conversations & transcripts, provider discovery (TTS/LLM/STT), and billing/usage — actively consumed by 10+ external client integrations.",
                "Built API-key issuance, management, and per-request authentication so partner software integrates without interactive login, securely orchestrating external voice/telephony services behind the gateway; authored a self-contained, searchable developer API reference.",
              ],
            },
          ],
        },
      ],
    },
    {
      company: "Clinic Cloud",
      role: "Independent Project (Solo Developer)",
      date: "Live in Production",
      place: "goclinic.online · Live multi-tenant healthcare SaaS built end-to-end on personal time · NestJS, Prisma, PostgreSQL, Redis, React / Next.js, AWS.",
      bullets: [
        "Architected a multi-tenant healthcare SaaS serving multiple isolated clinics across 27+ feature modules from a single NestJS deployment — header-based tenant isolation, JWT + OTP auth, fine-grained RBAC, and subscription-feature gating.",
        "Integrated India's ABDM/ABHA national health-record system end-to-end: HIP bridge services, ABHA patient creation, scan-and-share consent flows, QR generation, and server-to-server callbacks.",
        "Built real-time appointment booking (Socket.IO, token-based slots, holiday/leave validation) and a multi-language WhatsApp Cloud API bot for bookings, reminders, payment links, and QR check-in on BullMQ queues.",
        "Shipped Razorpay subscription billing with webhooks and automated invoice PDFs to S3; scaled a Prisma layer of 80+ models / 39+ migrations with a Redis caching layer for hot clinic, permission, and certificate data.",
        "Built the React / Next.js web application for clinic staff and admins — appointments, patient records, billing, and analytics — consuming the multi-tenant API with role-based UI gating.",
        "Operate Dockerized CI/CD to AWS EC2 via GitHub Actions with Nginx, Let's Encrypt HTTPS, and zero-downtime migrations.",
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
                "Built a reels-style short-video feed with optimized rendering for smooth playback on mid-range devices, real-time chat, Google Maps live location tracking, AdMob ads, and Firebase push notifications.",
              ],
            },
            {
              title: "EL-Pico — Club Automation",
              meta: "React Native + Node.js · real-time slot booking · Stripe & Coinbase (crypto)",
              bullets: [
                "Built the Node.js backend for the real-time slot-booking module — slot selection, live availability and session-based slot locking that holds a slot while the member completes checkout, so two members can never book the same slot.",
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
                "Built real-time delivery-partner tracking end to end — a background activity in the React Native app that keeps streaming the partner's location while the app is in the background, and a Socket.IO backend that pushes it live to the customer's order screen.",
                "Engineered a full checkout system with discount/GST calculation, quick-commerce ordering, geolocation-based listings, and real-time order tracking.",
              ],
            },
            {
              title: "BigValue — Travel App",
              meta: "React Native · third-party travel APIs · PayPal & Razorpay",
              bullets: [
                "Built a flight booking module (one-way / round-trip / multi-city) integrating third-party travel APIs with PayPal and Razorpay.",
              ],
            },
            {
              title: "Housecaller — Home Services",
              meta: "React Native · Android & iOS · 10K+ downloads",
              bullets: [
                "Built the customer app for booking verified home-service professionals — service discovery, scheduling, and booking tracking.",
              ],
            },
            {
              title: "BRPL & BYPL — Govt Utility Apps",
              meta: "Delhi electricity providers · 1M+ and 500K+ downloads",
              bullets: [
                "Maintained two of Delhi's electricity-provider apps serving millions of consumers — bug fixes, dependency/SDK upgrades and Play Store release updates — plus ongoing maintenance of Peclick, SoulSpace and Real Sampada.",
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
  coreStrengths: [
    "End-to-end ownership — Kotlin native modules → React Native / Next.js UI → NestJS APIs → PostgreSQL / Prisma → AWS.",
    "Multi-tenant SaaS architecture — shared-DB and database-per-tenant systems with isolation, RBAC, queues and automated provisioning.",
    "Public API design — OpenAPI gateways, API-key authentication, partner integrations and developer documentation.",
    "Real-time & offline-first systems — WebSocket / Socket.IO streaming and offline SQLite with background sync and conflict resolution.",
    "Applied AI — RAG (chunking, embeddings, vector search), LLM evaluation, STT / TTS voice agents and OCR document extraction.",
    "Production track record — a live SaaS in production and 10+ apps built or maintained with 1.5M+ combined downloads.",
  ],
  education: [
    { deg: "Master of Computer Applications (MCA)", inst: "Rajasthan Technical University (RTU), Kota — Correspondence / Distance Mode (completed alongside full-time employment)", date: "Aug 2024 – May 2026" },
    { deg: "Bachelor of Computer Applications (BCA)", inst: "Mohanlal Sukhadia University (MLSU), Udaipur", date: "Aug 2021 – Jul 2024" },
  ],
  /* Role-specific headline + summary. Every claim here also appears in the
     experience below — positionResume() swaps these in and reorders sections. */
  positioning: {
    fullstack: {
      title: "Full-Stack Engineer",
      subtitle: "React / Next.js | Node.js / NestJS | TypeScript | PostgreSQL | AWS",
      summary: [
        "Full-Stack Engineer with 2+ years of experience building web products end to end — React / Next.js frontends, TypeScript and Node.js / NestJS APIs, PostgreSQL / Prisma data models, Redis / BullMQ queues and Dockerized AWS deployments.",
        "Built and operate Clinic Cloud, a live multi-tenant healthcare SaaS with 27+ feature modules and a Next.js staff app, and engineered Interview AI, a database-per-tenant platform serving 6+ university tenants. Also designed a public OpenAPI gateway of 56+ REST endpoints, with additional React Native mobile experience.",
      ],
    },
    backend: {
      title: "Backend Engineer (Node.js / NestJS)",
      subtitle: "Node.js | NestJS | TypeScript | PostgreSQL | Redis / BullMQ | AWS",
      summary: [
        "Backend Engineer with 2+ years of experience designing multi-tenant SaaS backends and public APIs in Node.js / NestJS and TypeScript — PostgreSQL / Prisma data models, Redis / BullMQ job queues, real-time WebSockets and Dockerized AWS deployments.",
        "Architected Interview AI's database-per-tenant platform (6+ university tenants, automated provisioning) and Clinic Cloud, a live healthcare SaaS with 27+ modules, 80+ Prisma models and India's ABDM/ABHA integration. Built a public OpenAPI gateway of 56+ REST endpoints consumed by 10+ client integrations.",
      ],
    },
    mobile: {
      title: "Mobile Engineer (React Native & Kotlin)",
      subtitle: "React Native | Kotlin Native Modules | TypeScript | Offline-first | Play Store & App Store",
      summary: [
        "Mobile Engineer with 2+ years of experience who has built and maintained 10+ production apps with 1.5M+ combined downloads on Google Play and the App Store — React Native with custom Kotlin native modules, offline-first data, real-time features and end-to-end store releases.",
        "Built a call-tracking CRM whose Kotlin modules captured 5,000+ call logs with zero data loss, built core features for a social app with 100K+ downloads, and maintained government utility apps with 1M+ and 500K+ downloads. Backed by Node.js / NestJS experience to own features from native module to API.",
      ],
    },
    ai: {
      title: "AI Engineer (LLM, RAG & Voice AI)",
      subtitle: "LLMs | RAG & Embeddings | Vector DB | STT / TTS | OCR | Node.js / NestJS",
      summary: [
        "AI Engineer with 2+ years of software experience building production LLM and voice-AI applications — RAG pipelines (chunking, embeddings, Pinecone vector search), LLM-based evaluation, speech-to-text / text-to-speech voice agents and OCR document extraction, running on Node.js / NestJS backends.",
        "Built Interview AI, a voice-interview platform (STT → LLM → TTS) serving 6+ university tenants with 70+ AI interviews conducted, and a public voice-AI API gateway with 56+ REST endpoints used by 10+ client integrations. Also shipped AI features in mobile apps: a Deepgram voice-to-job assistant and NLP sentiment analysis on 2,000+ call recordings.",
      ],
    },
  },
};

export const PROFILE_DEFAULT: Profile = {
  exp: "2+ Years",
  notice: "Immediate",
  current: "₹4.5 LPA",
  expected: "₹8–10 LPA",
  roles: "Full-Stack Engineer, Backend Engineer (Node.js/NestJS), React Native Engineer",
};
