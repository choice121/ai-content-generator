# Handoff Document

## Purpose

This file is the continuity document for this project. It is written for any future developer, AI agent, or collaborator who needs to understand the current state of this project and continue work without confusion or rework.

---

## Current Status

**Planning is complete. Implementation has not started.**

All architectural decisions have been made, debated, and locked in. All documentation is written. The project is fully ready to begin Phase 1 implementation.

---

## What Has Been Decided

| Decision | Choice | Documented In |
|----------|--------|--------------|
| Language | Node.js | ARCHITECTURE.md |
| Server framework | Express.js | ARCHITECTURE.md |
| Primary AI model | Groq free tier (Llama 3) | PROJECT_PLAN.md |
| AI fallback | OpenRouter (free models) | ERROR_HANDLING.md |
| Image processing | Sharp (Node.js) | ARCHITECTURE.md |
| Output packaging | archiver (ZIP) | ARCHITECTURE.md |
| Data source | Supabase REST API | DATA_FLOW.md |
| Storage strategy | In-memory only, no disk writes | DATA_FLOW.md |
| Location | /ai-content/ inside main project | ARCHITECTURE.md |
| Hosting | Replit second workflow | PROJECT_PLAN.md |
| UI approach | Vanilla HTML/CSS/JS, mobile-first | OUTPUT_SPEC.md |
| Phase 1 scope | Captions + watermarked images only | PHASES.md |

---

## What Has NOT Been Built

Nothing has been implemented. The following are planned but not yet created:

- `/ai-content/` directory and all files within it
- `server.js` (Express server)
- `brand.config.js` (brand settings file)
- `package.json` for the ai-content module
- `/services/PropertyService.js`
- `/services/CaptionService.js`
- `/services/ImageService.js`
- `/services/ZipService.js`
- `/prompts/tiktok.js`
- `/prompts/instagram.js`
- `/prompts/facebook.js`
- `/public/index.html` (mobile UI)
- `/public/app.js` (frontend JS)
- `/public/style.css` (stylesheet)
- Replit second workflow configuration

---

## Exact Next Step

**Begin Phase 1 implementation.**

The implementation order should be:

1. Create `/ai-content/` directory with its own `package.json`
2. Install dependencies: `express`, `sharp`, `archiver`, `node-fetch`
3. Create `brand.config.js` using the structure in BRAND_CONFIG.md
4. Create `PropertyService.js` using the Supabase query in DATA_FLOW.md
5. Create prompt template files using the structures in PROMPTS.md
6. Create `CaptionService.js` with Groq primary + OpenRouter fallback
7. Create `ImageService.js` using Sharp for watermarking and resizing
8. Create `ZipService.js` to package captions.txt and images
9. Create `server.js` to wire all services together via Express
10. Create the mobile-friendly UI in `/public/` as per OUTPUT_SPEC.md
11. Configure a second Replit workflow to run the service
12. Test with a real property listing from the Choice Properties database

---

## Environment Variables Required

The following environment variables must be set in the Replit environment before the service can run:

| Variable | Source | Purpose |
|----------|--------|---------|
| `SUPABASE_URL` | Already set in main project | Supabase REST API base URL |
| `SUPABASE_ANON_KEY` | Already set in main project | Supabase authentication |
| `GROQ_API_KEY` | Obtain free at console.groq.com | Primary AI model access |
| `OPENROUTER_API_KEY` | Obtain free at openrouter.ai | AI fallback access |

Note: SUPABASE_URL and SUPABASE_ANON_KEY are already configured in the main Choice Properties Replit project. They do not need to be re-entered.

---

## Key Constraints for the Implementer

- No paid tools, APIs, or services. Everything must remain free.
- No npm packages that introduce a local database. Data lives in Supabase only.
- No temp files written to disk. All image processing is in-memory.
- Max 6 images processed per request.
- AI call timeout is 10 seconds. Image processing timeout is 15 seconds.
- The main Choice Properties site must not be modified.
- The UI must work correctly on a mobile browser.

---

## Related Documentation

Read in this order for full context:

1. README.md — Project overview
2. PROJECT_PLAN.md — Goals and phased roadmap
3. ARCHITECTURE.md — Technical structure and service design
4. DATA_FLOW.md — How data moves through the system
5. PROMPTS.md — Prompt template system
6. BRAND_CONFIG.md — Brand configuration file
7. OUTPUT_SPEC.md — UI behaviour and output format
8. ERROR_HANDLING.md — All error types and fallback logic
9. PHASES.md — Phased development plan

---

## Contact and Ownership

This project is owned and operated by the owner of the Choice Properties platform.
The main platform repository is separate from this documentation repository.
All implementation takes place inside the main Replit project under `/ai-content/`.