# NutriSignal — Architecture

## Overview

NutriSignal is a restaurant experience platform that uses AI mood analysis to help staff better serve customers. Customers scan a QR code at their table, answer a short questionnaire about how they're feeling, browse the menu, and place an order. The AI analyzes their mood and gives the restaurant team real-time tips on how to interact with them.

```
┌──────────────────────────────────────────────────────────┐
│                      FRONTEND (SPA)                      │
│         React 19 · Vite 8 · Tailwind CSS 4               │
│         Framer Motion · Lucide Icons · Axios              │
│                                                          │
│  ┌──────────┐ ┌──────────────┐ ┌────────────────────┐   │
│  │  Auth     │ │  Super Admin │ │ Restaurant Dash    │   │
│  │  Pages    │ │  Dashboard   │ │ (Tabbed: Overview, │   │
│  │          │ │              │ │  Menu, Tables, AI   │   │
│  │          │ │              │ │  Insights, Orders,  │   │
│  │          │ │              │ │  Feedback)          │   │
│  └──────────┘ └──────────────┘ └────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Customer Flow (QR Scan → Mobile-first flow)     │   │
│  │  Welcome → Questionnaire → Menu → Order → Thanks │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP / REST (JSON)
                        ▼
┌──────────────────────────────────────────────────────────┐
│                    BACKEND (API Server)                   │
│          Node.js · Express 5 · TypeScript 6               │
│          Prisma ORM 5.22 · JWT · Zod · QRCode            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Middleware: CORS · JSON · Auth (JWT) · RBAC      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐  │
│  │ /auth    │ │ /customer │ │/restaurant│ │ /admin   │  │
│  │ (public) │ │ (public)  │ │(JWT+role) │ │(JWT+SA)  │  │
│  └──────────┘ └───────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  AI Service: Grok X API / Claude / Rule Fallback  │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────────┘
                        │ Prisma ORM
                        ▼
              ┌────────────────────┐
              │    PostgreSQL DB    │
              └────────────────────┘
```

## Tech Stack

| Layer       | Technology            | Version  |
|-------------|-----------------------|----------|
| Frontend    | React                 | 19.2     |
| Bundler     | Vite                  | 8.0      |
| Styling     | Tailwind CSS          | 4.2      |
| Animations  | Framer Motion         | 12.38    |
| Icons       | Lucide React          | 1.8      |
| HTTP Client | Axios                 | 1.15     |
| Routing     | React Router          | 7.14     |
| Backend     | Express               | 5.2      |
| Language    | TypeScript            | 6.0      |
| ORM         | Prisma                | 5.22     |
| Database    | PostgreSQL            | 15+      |
| Auth        | JWT (jsonwebtoken)    | 9.0      |
| Hashing     | bcryptjs              | 3.0      |
| Validation  | Zod                   | 4.3      |
| QR Codes    | qrcode                | 1.5      |
| AI (primary)| Grok X API            | grok-3-mini |
| AI (alt)    | Claude API            | claude-3.5-sonnet |

## Directory Structure

```
NutriSignal/
├── package.json                 # Monorepo scripts
├── plan.txt                     # Original project plan
├── docs/                        # Documentation
│
├── client/                      # React SPA
│   ├── index.html
│   ├── vite.config.ts           # Vite + Tailwind plugin
│   ├── package.json
│   └── src/
│       ├── main.tsx             # Entry point
│       ├── App.tsx              # Router + Navbar + Route guards
│       ├── index.css            # Tailwind imports + theme
│       ├── lib/
│       │   └── api.ts           # Axios instance, auth helpers
│       └── pages/
│           ├── Auth.tsx          # Home, Login, Register, BootstrapAdmin
│           ├── SuperAdmin.tsx    # Platform management dashboard
│           ├── RestaurantDash.tsx # Restaurant owner/staff dashboard
│           └── CustomerFlow.tsx  # QR-based customer experience
│
└── server/                      # Express API
    ├── .env / .env.example
    ├── tsconfig.json
    ├── package.json
    ├── prisma/
    │   ├── schema.prisma        # Database schema
    │   └── migrations/          # SQL migrations
    └── src/
        ├── index.ts             # Express app setup
        ├── config/
        │   ├── env.ts           # Environment variables
        │   └── prisma.ts        # PrismaClient singleton
        ├── middleware/
        │   └── auth.ts          # JWT verify + role check
        ├── routes/
        │   ├── auth.ts          # Register, Login, Bootstrap
        │   ├── customer.ts      # Table scan, questionnaire, orders
        │   ├── restaurant.ts    # Menu CRUD, tables, insights
        │   └── admin.ts         # Restaurants, subscriptions, analytics
        ├── services/
        │   └── moodAnalysis.ts  # AI mood analysis engine
        └── types/
            └── express.d.ts     # Express Request augmentation
```

## Database Schema

### Enums

| Enum            | Values                                        |
|-----------------|-----------------------------------------------|
| `UserRole`      | `SUPER_ADMIN`, `OWNER`, `MANAGER`, `STAFF`    |
| `SessionStatus` | `QUESTIONNAIRE`, `MENU`, `ORDERED`, `COMPLETED` |
| `OrderStatus`   | `PENDING`, `PREPARING`, `SERVED`, `COMPLETED` |

### Entity Relationship Diagram

```
SubscriptionPlan 1──N Restaurant 1──N RestaurantUser
                     │
                     ├──N MenuCategory 1──N MenuItem
                     │                      │
                     ├──N RestaurantTable    │
                     │   │                   │
                     │   ├──N CustomerSession │
                     │   │   ├──1 QuestionnaireResponse
                     │   │   ├──1 MoodAnalysis
                     │   │   ├──1 Order 1──N OrderItem ──1 MenuItem
                     │   │   └──1 Feedback
                     │   └──N MoodAnalysis
                     │
                     ├──N Order
                     ├──N MoodAnalysis
                     └──N Feedback
```

### Key Models

| Model                  | Purpose                                        | Key Fields                                          |
|------------------------|------------------------------------------------|-----------------------------------------------------|
| `SubscriptionPlan`     | Billing tiers for restaurants                  | name, price, maxTables, features (JSON)             |
| `Restaurant`           | Tenant / restaurant entity                     | name, logo, brandPrimaryColor, isActive             |
| `RestaurantUser`       | Admin/staff accounts                           | email, passwordHash, role (enum), restaurantId      |
| `MenuCategory`         | Groups menu items                              | name, displayOrder                                  |
| `MenuItem`             | Individual dish/drink                           | name, price, description, isAvailable               |
| `RestaurantTable`      | Physical table with QR                         | tableNumber, qrCodeData (UUID), isActive            |
| `CustomerSession`      | One customer visit lifecycle                    | sessionToken, status (enum), tableId                |
| `QuestionnaireResponse`| Raw mood questionnaire answers                  | responses (JSON)                                    |
| `MoodAnalysis`         | AI-generated mood insights                      | sentiment, keyInsights, interactionTips, serviceApproach |
| `Order`                | Customer food order                            | totalAmount, status (enum), notes                   |
| `OrderItem`            | Line item in an order                          | quantity, specialInstructions                        |
| `Feedback`             | Star rating + comment                          | rating (1-5), comment                               |

## Authentication & Authorization

### Flow

1. **Registration**: Restaurant owner provides name, email, password, restaurant name → creates Restaurant + OWNER user → returns JWT (7-day expiry)
2. **Login**: Email + password → bcrypt compare → JWT with `{ sub, role, restaurantId }`
3. **Super Admin Bootstrap**: One-time endpoint requiring the `ADMIN_BOOTSTRAP_KEY` → creates SUPER_ADMIN user (no restaurantId)
4. **Protected Routes**: `Authorization: Bearer <token>` header → `requireAuth` middleware verifies JWT → `requireRole` checks allowed roles
5. **Customer Routes**: No authentication; security is via opaque table UUID in QR code + server-generated session IDs

### Role Permissions

| Role          | Access                                                |
|---------------|-------------------------------------------------------|
| `SUPER_ADMIN` | `/api/admin/*` — manage all restaurants, subscriptions, analytics |
| `OWNER`       | `/api/restaurant/*` — full control of their restaurant |
| `MANAGER`     | `/api/restaurant/*` — same as owner                   |
| `STAFF`       | `/api/restaurant/*` — same as owner                   |
| Customer      | `/api/customer/*` — public, session-scoped            |

## AI Integration

### Architecture

```
Customer Questionnaire
        │
        ▼
  analyzeMood(responses)
        │
        ├── AI_PROVIDER = "grok"  → Grok X API (grok-3-mini)
        ├── AI_PROVIDER = "claude" → Anthropic Claude (3.5 Sonnet)
        └── Fallback              → Rule-based keyword analysis
        │
        ▼
  {
    sentiment: "positive" | "negative" | "neutral",
    keyInsights: string[],
    interactionTips: string[],
    serviceApproach: string
  }
```

### Fallback Strategy

The rule-based fallback activates when:
- No API key is configured
- The AI API returns a non-200 response
- The response JSON cannot be parsed
- Any exception occurs during the API call

The fallback uses keyword matching on feeling/mood/energy fields to determine sentiment and generates templated interaction tips.

## Frontend Routing

| Route                     | Component         | Auth Required | Role              |
|---------------------------|-------------------|---------------|-------------------|
| `/`                       | Home              | No            | —                 |
| `/login`                  | Login             | No            | —                 |
| `/register`               | Register          | No            | —                 |
| `/bootstrap-super-admin`  | BootstrapAdmin    | No            | —                 |
| `/super-admin`            | SuperAdmin        | Yes           | SUPER_ADMIN       |
| `/dashboard`              | RestaurantDash    | Yes           | OWNER/MANAGER/STAFF |
| `/t/:tableUuid`           | CustomerFlow      | No            | —                 |
