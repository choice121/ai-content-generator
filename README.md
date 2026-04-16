# AI Content Generator

  > AI-powered social media content generator for real estate property listings.

  ---

  ## ⚠️ Status: Planning Phase Only

  **This repository is currently in the planning and documentation phase. No implementation has started yet.**

  All architectural decisions, data flows, prompt systems, and output specifications have been fully defined. The next step is to begin Phase 1 implementation as described in [PHASES.md](./PHASES.md).

  ---

  ## What This System Does

  The AI Content Generator is a standalone tool that connects to the Choice Properties real estate platform and automatically produces ready-to-post social media content for property listings.

  Given a property URL or listing ID, the system:

  1. Fetches full property data directly from the Supabase database
  2. Normalises incomplete or messy listing data gracefully
  3. Generates platform-specific captions (TikTok, Instagram, Facebook) using a free AI model (Groq)
  4. Downloads and watermarks property photos with brand identity
  5. Packages everything into a clean, downloadable output for immediate posting

  ---

  ## Key Design Principles

  - **Free tools only** — No paid APIs, no subscriptions, no billing
  - **Node.js throughout** — Same ecosystem as the main Choice Properties site
  - **Mobile-first UI** — Designed to be used from a mobile browser
  - **Simplicity over cleverness** — No overengineering, no unnecessary dependencies
  - **Expandable core** — Built to support a future chat assistant, recommendation engine, and automation layer

  ---

  ## Documentation Index

  | File | Purpose |
  |------|---------|
  | [PROJECT_PLAN.md](./PROJECT_PLAN.md) | Full system goals and phased roadmap |
  | [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture and service design |
  | [DATA_FLOW.md](./DATA_FLOW.md) | Step-by-step data flow from input to output |
  | [PROMPTS.md](./PROMPTS.md) | Prompt template system for AI caption generation |
  | [BRAND_CONFIG.md](./BRAND_CONFIG.md) | Brand configuration system documentation |
  | [OUTPUT_SPEC.md](./OUTPUT_SPEC.md) | Output format, UI behaviour, and download structure |
  | [ERROR_HANDLING.md](./ERROR_HANDLING.md) | Error types, fallback logic, and performance limits |
  | [PHASES.md](./PHASES.md) | Phase-by-phase development roadmap |
  | [HANDOFF.md](./HANDOFF.md) | Continuity file for future developers or AI agents |

  ---

  ## Related Project

  This tool is built as a companion to the **Choice Properties** rental marketplace platform. It reads data from the same Supabase instance and follows the same brand identity.
  