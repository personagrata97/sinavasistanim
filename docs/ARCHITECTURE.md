# Mimari Genel Bakış

## Sistem Mimarisi

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT                             │
│  Next.js (React) + Framer Motion + Lucide Icons           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ page.tsx (orchestrator, 1066 satır)                  │ │
│  │  ├── NotesTab        (ders notları + PDF export)     │ │
│  │  ├── FlashcardsTab   (spaced repetition)             │ │
│  │  ├── QuestionsTab    (soru bankası + PDF)            │ │
│  │  ├── MockExamTab     (deneme sınavı)                 │ │
│  │  ├── CoverageTab     (kapsam haritası)               │ │
│  │  ├── DailyGoalsTab   (günlük hedefler)               │ │
│  │  ├── AchievementsTab (rozetler + gamification)       │ │
│  │  └── ErrorBoundary   (per-tab hata izolasyonu)       │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────┘
                       │ Server Actions + API Routes
                       ▼
┌──────────────────────────────────────────────────────────┐
│                      SERVER                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  actions.ts  │  │  API Routes  │  │   middleware.ts  │ │
│  │  (server     │  │  /api/chat   │  │  (auth + sec    │ │
│  │   actions)   │  │  /api/health │  │   headers)      │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────────────┘ │
│         │                │                                │
│  ┌──────▼────────────────▼──────────────────────────────┐│
│  │                   LIB LAYER                           ││
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  ││
│  │  │ validations  │ │ rate-limit   │ │ logger.ts    │  ││
│  │  │ (Zod)        │ │ (in-memory)  │ │ (structured) │  ││
│  │  └──────────────┘ └──────────────┘ └──────────────┘  ││
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  ││
│  │  │ course-data  │ │ schedule-    │ │ ai-service   │  ││
│  │  │ (18 kurs)    │ │ engine       │ │ (Gemini API) │  ││
│  │  └──────────────┘ └──────────────┘ └──────────────┘  ││
│  └──────────────────────┬───────────────────────────────┘│
│                         │                                 │
│  ┌──────────────────────▼───────────────────────────────┐│
│  │                PRISMA ORM                             ││
│  │  13 Model • 11 Index • Cascade Delete                 ││
│  │  SQLite (dev) → PostgreSQL (production)               ││
│  └───────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘

## Güvenlik Katmanları

```
Request → middleware.ts (security headers)
        → NextAuth (session check)
        → rate-limit.ts (IP bazlı limit)
        → validations.ts (Zod input check)
        → actions.ts (business logic)
```

## Test Piramidi

```
  ┌───────────────┐
  │   E2E Tests   │  (planned - Playwright)
  ├───────────────┤
  │  Integration  │  (API route tests - planned)
  ├───────────────┤
  │  Unit Tests   │  ← 11 suite, 108 test ✅
  │  course-data  │
  │  schedule     │
  │  validations  │
  │  rate-limit   │
  │  logger       │
  │  shared-utils │
  │  api-security │
  │  env-validate │
  └───────────────┘
```

## Dosya Yapısı

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (JSON-LD, fonts, SW)
│   ├── error.tsx           # Global error page
│   ├── not-found.tsx       # 404 page
│   ├── loading.tsx         # Global loading
│   ├── api/                # API routes
│   │   ├── chat/           # AI chat endpoint
│   │   └── health/         # Health check
│   ├── dashboard/          # Ana sayfa
│   └── program/            # Kurs sayfaları
├── components/
│   ├── course/             # 7 extracted tab component
│   │   ├── shared.tsx      # Ortak UI bileşenleri
│   │   └── ...Tab.tsx      # Her tab bağımsız
│   ├── ErrorBoundary.tsx   # Reusable error boundary
│   └── CourseGrid.tsx      # Kurs listesi
├── lib/
│   ├── actions.ts          # Server actions
│   ├── ai-service.ts       # Gemini API wrapper
│   ├── course-data.ts      # Statik kurs verileri
│   ├── validations.ts      # Zod schemas
│   ├── rate-limit.ts       # Rate limiter
│   ├── logger.ts           # Structured logger
│   └── schedule-engine.ts  # Sınav takvimi
└── __tests__/              # 11 test suite
```
