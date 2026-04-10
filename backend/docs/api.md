# Payslip Analyzer — HTTP API

Reference for the Hono Worker mounted at the Worker’s public URL (or, in production, the same paths via the Nuxt `/api` proxy on Pages).

**Typical base URLs**

- **Development (direct to Worker):** `http://127.0.0.1:8787` (or your `wrangler dev` URL)
- **Production (browser):** your Pages origin with relative `/api/...` (recommended), or `https://<worker-name>.<account>.workers.dev` for server-to-server calls with correct `Origin` / cookies

Session-based routes require `credentials: 'include'` from the browser when using cookie auth.

---

## Routes

### `GET /`

Plain-text health identifier.

**Response:** `200` — body text `Payslip Analyzer API`

---

### Better Auth — `/api/auth/*`

Better Auth handles registration, sign-in, sign-out, OAuth callbacks, and session endpoints under `/api/auth/`.

For request shapes, local vs production base URL, and CORS notes, see [features/auth.md](./features/auth.md).

---

### User profile — `/api/user`

Mounted from `src/routes/profile.ts`.

#### `GET /api/user/profile`

Returns the authenticated user’s profile.

- **Auth:** Session required  
- **200:** `{ id, name, email, image, emailVerified, createdAt, updatedAt }`  
- **401:** `{ error: "Authentication required" }`  
- **404:** User missing in DB  

#### `POST /api/user/profile`

Updates profile fields.

- **Auth:** Session required  
- **Body (JSON):** `{ "name": string, "image"?: string | null }` — `name` required, 1–100 characters; `image` optional  
- **200:** `{ success: true, user: { ... } }`  
- **400 / 401 / 404 / 500:** Error JSON as applicable  

#### `DELETE /api/user/account`

Deletes the account and related auth rows.

- **Auth:** Session required  
- **Body (JSON):**  
  - If the user has a credential (email/password) account: `{ "password": string }`  
  - Otherwise (e.g. OAuth-only): `{ "confirmationText": "DELETE" }`  
- **200:** `{ success: true, message: "Account deleted" }`  
- **400:** Password or confirmation required  
- **403:** Invalid password  

---

### Payslip analysis — `/api/payslip`

#### `POST /api/payslip/analyze`

Runs the payslip vision pipeline (Gemini), persists a row in `payslip_analysis`, and returns the result payload.

- **Auth:** Session required  
- **Content-Type:** `multipart/form-data`  
- **Form field:** `file` — image file (**PNG, JPEG, or WebP**; PDF is not accepted server-side)  
- **200:** JSON including:
  - `analysis` — structured extraction result  
  - `featureLogs` — feature detector output  
  - `annotationSpecs` — optional overlay hints  
  - `meta` — e.g. MIME type  
  - `recordId` — UUID of the stored row  
- **400:** Missing file, wrong content type, or invalid multipart  
- **401:** Not authenticated  
- **500:** Missing `GEMINI_API_KEY`, DB unavailable, or pipeline failure (failure may still insert an error row)

**Worker configuration**

- `GEMINI_API_KEY` — required  
- `DISABLE_NEKUDOT_REFINE` — optional; `"true"` / `"1"` skips the second refinement pass  

Implementation: `src/routes/payslip.ts`, pipeline: `src/payslip/pipeline.ts`.

---

## Related docs

- [features/auth.md](./features/auth.md) — Better Auth setup and endpoints  
- [testing.md](./testing.md) — integration tests for routes  
- [Deployment (repo root)](../../docs/deployment.md) — Workers, Pages, secrets, CORS  
