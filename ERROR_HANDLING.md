# Error Handling

## Philosophy

The system should never crash silently. Every error is caught, classified, and returned to the user as a clear, human-readable message. Where a fallback exists, it is attempted automatically before surfacing an error.

---

## Error Types and Responses

### 1. Invalid Property Input

**Triggers:**
- The input field is empty
- The URL does not contain a recognisable listing ID
- The listing ID format is invalid

**Response to user:**
> "Please enter a valid property URL or listing ID."

**Handling:** Caught at the input parsing stage before any API calls are made. No external requests are fired.

---

### 2. Property Not Found

**Triggers:**
- A valid ID is parsed but no matching record exists in Supabase
- The listing exists but its status is not `active`

**Response to user:**
> "We couldn't find an active listing with that URL or ID. Please check and try again."

**Handling:** Caught in PropertyService after the Supabase response is evaluated.

---

### 3. Insufficient Property Data

**Triggers:**
- The listing exists but contains no usable fields (no title, no location, no price, no description, no images)

**Response to user:**
> "This listing doesn't have enough information to generate content. Please ensure the listing has a title, location, and at least one photo."

**Handling:** Caught in PropertyService after normalisation. A minimum data threshold is checked before passing to downstream services.

---

### 4. Supabase Connection Failure

**Triggers:**
- Network timeout reaching Supabase
- Supabase returns a 5xx error
- Invalid or expired credentials

**Response to user:**
> "Unable to connect to the database right now. Please try again in a moment."

**Handling:** HTTP errors and timeouts from the Supabase fetch are caught and classified. The raw error is logged server-side for debugging but never exposed to the user.

---

### 5. AI Caption Generation Failure — Primary (Groq)

**Triggers:**
- Groq API returns a 4xx or 5xx error
- Groq API call exceeds `AI_TIMEOUT_MS` (10 seconds)
- Groq rate limit hit

**Automatic action:** CaptionService silently retries **once** using OpenRouter with the identical prompt.

The user sees no error — the fallback is transparent.

---

### 6. AI Caption Generation Failure — Fallback (OpenRouter)

**Triggers:**
- OpenRouter also fails or times out after the Groq fallback attempt

**Response to user:**
> "Caption generation is temporarily unavailable. Your images have been processed and are ready to download."

**Handling:** Image processing and ZIP packaging continue normally. The user still receives their watermarked images. The captions.txt file contains a note explaining the outage.

---

### 7. Image Download Failure

**Triggers:**
- A specific image URL from ImageKit fails to load
- Image download times out

**Handling:** That specific image is skipped silently. Processing continues with the remaining images. If all images fail, the system substitutes the brand placeholder image (`/assets/placeholder-property.jpg`).

**Response to user (only if all images failed):**
> "We couldn't load the property photos. A placeholder image has been used instead."

---

## Fallback Logic Diagram

```
Generate Request
     |
     v
PropertyService
     |-- Supabase OK? --> Continue
     |-- Supabase FAIL --> Return error to user (stop)
     |
     v
CaptionService
     |-- Groq OK? --> Continue
     |-- Groq FAIL --> Try OpenRouter
                          |-- OpenRouter OK? --> Continue
                          |-- OpenRouter FAIL --> Return partial result (images only)
     |
     v
ImageService
     |-- Images OK? --> Continue
     |-- Some fail? --> Skip and continue
     |-- All fail? --> Use placeholder
     |
     v
ZipService --> Return download to user
```

---

## Performance Limits

These limits are enforced to prevent the free-tier server from being overloaded:

| Limit | Value | Reason |
|-------|-------|--------|
| Max images per request | 6 | Prevents excessive memory usage |
| AI call timeout | 10 seconds | Triggers fallback before user wait becomes unacceptable |
| Image processing timeout | 15 seconds | Prevents hung requests on slow image URLs |
| One active request per session | Enforced by disabling Generate button during processing | Prevents duplicate submissions |

---

## Server-Side Logging

All errors are logged to the server console with:
- Timestamp
- Error type and message
- Listing ID (if available)
- Which service threw the error

No sensitive data (API keys, user data) is ever written to logs.
Logs are visible in the Replit workflow console during development.