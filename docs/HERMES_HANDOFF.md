# Bunana V2 — Hermes Agent Handoff

> **Project Path:** `D:\Codex\小布\bunana-v2`
> **Current Branch:** `design/fabric-workbench`
> **Handoff Date:** 2026-07-31
> **Previous Agent:** WorkBuddy

---

## 1. Project Overview

Bunana V2 is an AI fabric identification and matching platform built with Next.js 16, React 19, TypeScript, and Supabase. The core user flow is:

```
Image or text input
→ AI fabric analysis (Zhipu → Dify → Demo fallback)
→ Ask for missing information (follow-up questions)
→ Generate Fabric DNA (14-field identity card)
→ Save or publish (to Supabase)
→ Match buyers and suppliers (via /square marketplace)
```

### Tech Stack
- **Framework:** Next.js 16.2.9 (App Router, Turbopack)
- **UI:** React 19.2.3, TypeScript 5.5.3
- **Database:** Supabase (PostgreSQL + Storage)
- **AI Providers:** Zhipu GLM-4.6V-Flash (primary), Dify (secondary), Demo rules-based engine (fallback)
- **Styling:** CSS Modules with CSS custom properties (design tokens)
- **Image Export:** html-to-image for PNG export of Fabric DNA card

---

## 2. Completed Pages and Features

### Pages
| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Fabric Workbench — main analysis UI | Functional |
| `/square` | Marketplace — published fabric requirements | Functional |
| `/api/bunana/analyze` | AI analysis API (initial + refine modes) | Functional |
| `/api/bunana/requirements` | Publish/fetch requirements API | Functional |
| `/api/bunana/images/[id]` | Image proxy/redirect API | Functional |

### Core Features
- **Image Upload:** 1-3 images max, SHA-256 hashing for deduplication, base64 dataUrl processing
- **Text Input:** Fabric requirement description (up to 1200 characters)
- **AI Analysis Pipeline:** Provider fallback chain: Zhipu (GLM-4.6V-Flash) → Dify workflow → Demo (rules-based)
- **Fabric DNA Card:** 14 fields with status tracking (identified, inferred, confirmed, missing)
- **Follow-up Questions:** Structured questions prioritized by importance, max 4 at a time
- **PNG Export:** html-to-image based export of Fabric DNA card
- **Supabase Integration:** Image storage (fabric-samples bucket) + requirement records
- **Visual Design System:** Fabric workbench layout, weaving channel, shuttle track, tactile materials styling

### Key Files
```
app/
├── page.tsx                          # Main workbench page
├── square/page.tsx                   # Marketplace page
├── layout.tsx                        # Root layout with TopBar
├── globals.css                       # Design tokens + component styles (678 lines)
├── types/index.ts                    # TypeScript types (FabricDNA, DemandResult, etc.)
├── components/
│   ├── FabricDNACard.tsx             # DNA card display (14 fields)
│   ├── FollowUpQuestions.tsx         # Question/answer UI
│   ├── ImageUploader.tsx             # Image upload component
│   ├── TextInput.tsx                 # Text requirement input
│   ├── TopBar.tsx                    # Navigation header
│   ├── WeavingLoader.tsx             # Loading spinner
│   ├── SavePngButton.tsx             # PNG export button
│   └── PublishButton.tsx             # Publish to square button
├── hooks/
│   ├── useAnalyze.ts                 # Initial analysis hook
│   └── useFollowUp.ts                # Refinement hook
├── lib/
│   ├── ai/
│   │   ├── demo.ts                   # Rules-based fallback engine
│   │   ├── normalize.ts              # AI response standardization
│   │   └── providers/
│   │       ├── zhipu.ts              # Zhipu GLM provider
│   │       └── dify.ts               # Dify workflow provider
│   ├── supabase/
│   │   ├── client.ts                 # Supabase REST client (serviceRole)
│   │   ├── images.ts                 # Image asset CRUD + dedup
│   │   ├── requirements.ts           # Requirement publish/list
│   │   └── storage.ts                # Storage upload
│   ├── dna.ts                        # DNA utilities (create, merge, specs)
│   ├── hash.ts                       # SHA-256 hashing (Web Crypto API)
│   ├── image.ts                      # Image payload processing
│   └── prompts.ts                    # AI prompt templates
├── api/
│   └── bunana/
│       ├── analyze/route.ts          # Analysis endpoint
│       ├── requirements/route.ts     # Publish/list endpoint
│       └── images/[id]/route.ts      # Image proxy endpoint
supabase/
├── migrations/
│   ├── 0001_initial_schema.sql       # Tables: image_assets, requirements
│   └── 0002_storage_setup.sql        # fabric-samples bucket
└── .temp/                            # Linked project metadata
```

---

## 3. WorkBuddy's Unfinished Content

### In Progress
- **Visual Design Polish** — The `design/fabric-workbench` branch contains modified `FabricDNACard.tsx`, `globals.css`, and `page.tsx` with significant design changes. However, the implementation appears partially complete:
  - CSS design tokens and layout rules are extensive (678 lines in `globals.css`)
  - But component files (ImageUploader, TextInput, FollowUpQuestions) still use inline styles rather than the CSS class system
  - Visual mismatch between designed workbench aesthetic and actual rendered UI

### Left Behind Artifacts
- **Screenshot files** (untracked): `screenshot-step1.png`, `screenshot-step1-v2.png`, `screenshot-dna-idle.png` — 1440x900 PNGs suggesting visual progress capture that wasn't completed
- **Empty `scripts/` directory** — Planned utility scripts were never created
- **No `README.md`** — Project has no documentation for onboarding or deployment

### Code Quality Issues
- **Debug elements in production** — `page.tsx` lines 237-242 include a debug `<details>` block showing `answeredLog` that should be removed
- **Hardcoded status text** — `page.tsx` line 224 shows hardcoded "已识别 2 · 已确认 10" instead of dynamic counts from actual DNA fields
- **Inconsistent styling approach** — Some components use CSS classes, others use inline styles

---

## 4. Top Three Blockers for Real User Testing

### 1. No Verified Supabase Credentials
- `.env.local` exists but is secret-bearing (cannot be read during audit)
- Without `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, the publish-to-square flow fails completely
- The entire "Save or publish → Match buyers and suppliers" product flow cannot be demonstrated
- **Impact:** Critical — blocks end-to-end testing

### 2. Incomplete Visual Design Implementation
- The `design/fabric-workbench` branch has extensive CSS design tokens but components don't consistently use them
- ImageUploader, TextInput, and FollowUpQuestions use inline styles instead of CSS classes
- Visual mismatch between the designed fabric workbench aesthetic and the actual rendered UI
- **Impact:** High — degrades user experience and brand consistency

### 3. Hardcoded/Dead UI States
- The "done" phase shows hardcoded status text ("已识别 2 · 已确认 10") instead of dynamic values from the DNA
- Debug `<details>` block for answeredLog is visible in production UI
- These indicate the UI was not finalized for user testing — users would see confusing or incorrect information
- **Impact:** Medium — causes user confusion and unprofessional appearance

---

## 5. Recommended Next Task

**Verify and fix the Supabase integration so the publish → square flow works end-to-end.**

This is the highest priority because:
1. The AI analysis and DNA card features work locally with the demo provider (no external dependencies)
2. But the publish/square functionality — which is core to the "Save or publish" step in the product flow — requires Supabase and is currently unverified
3. Without a working publish flow, the entire product value chain cannot be demonstrated to users

### Sub-tasks:
1. Confirm `.env.local` has valid Supabase credentials
2. Verify the Supabase project (`miyjzwjqxvkihmfevvmk`) has required tables and storage bucket
3. Run `npm run dev` and test the full flow: text input → AI analysis → follow-up questions → Fabric DNA card → publish → square display
4. Fix any errors in the Supabase client/storage/requirements code

---

## 6. Environment Setup

### Prerequisites
- Node.js (compatible with Next.js 16)
- npm
- Supabase account with project `miyjzwjqxvkihmfevvmk`

### Environment Variables (`.env.local`)
```
# AI Providers (optional — demo fallback works without these)
ZHIPU_API_KEY=          # Zhipu GLM-4.6V-Flash API key
ZHIPU_MODEL=GLM-4.6V-Flash
ZHIPU_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions

DIFY_API_KEY=           # Dify workflow fallback (optional)
DIFY_API_URL=

# Supabase (REQUIRED for publish/square)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# CORS
BUNANA_ALLOWED_ORIGIN=http://localhost:3000
```

### Development Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
```

---

## 7. Git State

- **Branch:** `design/fabric-workbench`
- **Modified files (uncommitted):**
  - `app/components/FabricDNACard.tsx`
  - `app/globals.css`
  - `app/page.tsx`
  - `next-env.d.ts`
- **Untracked files:**
  - `AGENTS.md`
  - `screenshot-dna-idle.png`
  - `screenshot-step1-v2.png`
  - `screenshot-step1.png`
- **Recent commits (most recent first):**
  - `ee69e40` V2-DESIGN-STEP1
  - `a61f2ec` chore: add supabase/.temp to .gitignore
  - `df3a405` V2-F: new Supabase project + verified publish flow
  - `fdd998c` V2-F: Supabase publish + square
  - `0ca0ade` V2-E: save Fabric DNA as PNG via html-to-image
  - `f7438d2` fix(demo): followUpQuestions never reaches 0
  - `5eb428f` V2-D: AI follow-up question loop with refine API integration
  - `c998720` V2-C-DNA-WORKS: upload + initial Fabric DNA display
  - `f84d353` V2-B-AI-WORKS: AI analyze API with initial + refine modes
  - `1d6e64e` V2-A-SKELETON: project skeleton with types, lib, configs

---

## 8. Notes

- Do NOT access or modify the `bunana-mvp-github` project (old project, out of scope)
- The `scripts/` directory exists but is empty — no utility scripts have been created
- The project uses the App Router (Next.js 16) with Turbopack for development
- The demo AI provider is a pure rules-based engine that works without any external API keys
- Supabase integration uses direct REST API calls (no `@supabase/supabase-js` SDK) with service role key for writes
- Image deduplication is handled via SHA-256 hashing at both frontend (Web Crypto API) and backend levels
