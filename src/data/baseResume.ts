import type { Resume, Profile } from "../types";

/** Your real resume. The AI may only re-emphasise what is in here — never invent. */
export const BASE: Resume = {
  name: "NAYAN MEHTA",
  title: "Full-Stack Mobile & Backend Engineer",
  subtitle: "React Native | React / Next.js | Native Android (Kotlin) | NestJS / Node.js | AI / Voice",
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
    "Full-Stack Mobile and Backend Engineer with 2+ years of experience who has built and maintained 10+ production apps with 1.5M+ combined downloads on the Google Play Store and Apple App Store. Expertise in cross-platform React Native development with custom Kotlin native modules, React / Next.js web frontends, and architecting multi-tenant SaaS backends (NestJS, PostgreSQL, Prisma, Redis, AWS) with end-to-end AI/voice pipelines (OpenAI, Deepgram, ElevenLabs, Pinecone RAG).",
    "Independently designed, built, and operate Clinic Cloud, a live multi-tenant healthcare SaaS integrated with India's ABDM/ABHA national health-record system. Strong focus on real-time systems, offline-first architecture, and public API design. MCA Graduate (2026).",
  ],
  skills: [
    { label: "Mobile", items: ["React Native", "Kotlin (Native Modules)", "TypeScript", "Redux Toolkit (RTK Query)", "Offline-first SQLite", "Firebase (FCM)"] },
    { label: "Frontend", items: ["React", "Next.js", "Redux Toolkit"] },
    { label: "Backend", items: ["NestJS", "Node.js", "PostgreSQL", "Prisma", "Redis", "BullMQ", "WebSocket / Socket.IO", "Multi-Tenant Architecture", "JWT + RBAC"] },
    { label: "AI & Voice", items: ["OpenAI (LLM / Embeddings)", "Deepgram (STT)", "ElevenLabs (TTS)", "Pinecone (RAG)"] },
    { label: "Payments & APIs", items: ["Razorpay", "Stripe", "PayPal", "Coinbase", "WhatsApp Cloud API", "ABDM / ABHA", "Google Maps SDK", "AdMob"] },
    { label: "Cloud & DevOps", items: ["AWS (EC2 / S3 / CloudFront)", "Hostinger VPS", "Docker", "Nginx", "GitHub Actions CI/CD", "Let's Encrypt HTTPS"] },
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
      company: "MetaStart via WebSenor Pvt. Ltd.",
      role: "React Native Developer (Contract)",
      date: "May 2025 – Oct 2025",
      bullets: [
        "MyFlama (Social App · 100K+ downloads): built a reels-style short-video feed with optimized rendering for smooth playback on mid-range devices, real-time chat, Google Maps live location tracking, AdMob ads, and Firebase push notifications.",
        "EL-Pico (Club Automation): developed membership management, event workflows, and a real-time booking system with Stripe & Coinbase (crypto) payments.",
      ],
    },
    {
      company: "WebSenor Private Limited",
      role: "React Native Developer",
      date: "Sep 2024 – May 2025",
      bullets: [
        "BRPL & BYPL (Govt Utility Apps · 1M+ and 500K+ downloads): maintained two of Delhi's electricity-provider apps serving millions of consumers — bug fixes, dependency/SDK upgrades, and Play Store release updates.",
        "Housecaller (Home Services · 10K+ downloads): built the customer app for booking verified home-service professionals — service discovery, scheduling, and booking tracking.",
        "Supraa (Grocery Delivery): engineered a full checkout system with discount/GST calculation, quick-commerce ordering, geolocation-based listings, and real-time order tracking.",
        "BigValue (Travel App): built a flight booking module (one-way / round-trip / multi-city) integrating third-party travel APIs with PayPal and Razorpay.",
        "Maintained production apps: Peclick, SoulSpace, Real Sampada — ongoing fixes, compatibility updates, and store releases.",
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
    "End-to-end ownership — Kotlin native modules → React Native UI → NestJS / Node APIs → PostgreSQL / Prisma → AWS.",
    "Multi-tenant SaaS architecture — shared-DB and DB-per-tenant systems with isolation, RBAC, queues, and automated provisioning.",
    "Public API design — OpenAPI surfaces, API-key management, partner integration layers, and developer documentation.",
    "Real-time & offline-first systems — WebSocket / Socket.IO and offline SQLite with background sync & conflict resolution.",
    "AI & voice integrations — OpenAI, Deepgram, ElevenLabs, and Pinecone for voice interviews, AI sourcing, and in-app assistants.",
    "Proven delivery — built and maintained 10+ production apps with 1.5M+ combined downloads, plus a live independently built SaaS.",
  ],
  education: [
    { deg: "Master of Computer Applications (MCA)", inst: "Rajasthan Technical University (RTU), Kota — Correspondence / Distance Mode (completed alongside full-time employment)", date: "Aug 2024 – May 2026" },
    { deg: "Bachelor of Computer Applications (BCA)", inst: "Mohanlal Sukhadia University (MLSU), Udaipur", date: "Aug 2021 – Jul 2024" },
  ],
};

export const PROFILE_DEFAULT: Profile = {
  exp: "2+ Years",
  notice: "Immediate",
  current: "₹4.5 LPA",
  expected: "₹8–10 LPA",
  roles: "Full-Stack Engineer, Backend Engineer (Node.js/NestJS), React Native Engineer",
};
