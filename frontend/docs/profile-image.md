# Profile image (avatar) on the frontend

This document explains how profile pictures flow through the Nuxt app: what the API stores, how we turn that into a URL for `<img>` / `UAvatar`, and where each piece of UI gets its `src`.

## What `user.image` actually is

After an R2 upload, the backend persists an **R2 object key** (often a UUID) on the user row. Better Auth exposes that value as `user.image` in the session.

That value is **not** always a public HTTPS URL:

- **OAuth providers** may store a full `https://…` avatar URL.
- **Our R2 flow** stores an **opaque key** string.

`<img src>` and `UAvatar` need a real URL. Passing a raw key (e.g. `550e8400-e29b-41d4-a716-446655440000`) is invalid: the browser does not load it as an image, and it is truthy so fallbacks like “use initials service when missing” never run.

## Resolution rules (`useResolveAvatarUrl`)

All display logic should go through **`useResolveAvatarUrl()`** (`app/composables/useResolveAvatarUrl.ts`). It returns `Promise<string | undefined>` suitable for `src`.

Order of resolution:

1. **No value** → `undefined` (caller shows a placeholder, e.g. ui-avatars).
2. **Already `http://` or `https://`** → returned unchanged (OAuth / external avatars).
3. **`NUXT_PUBLIC_R2_CDN_URL` is set** →  
   `{cdn}/gallery/{key}`  
   Trailing slashes on the CDN base are normalized.
4. **No CDN** → `GET {apiOrigin}/api/user/profile/image` with `credentials: 'include'`.  
   The backend responds with JSON including a **presigned** `downloadUrl` when `hasImage` is true. That URL is used as `src`.

The **`apiOrigin`** comes from **`useApiOrigin()`** (same rules as the rest of the app: explicit `NUXT_PUBLIC_API_BASE_URL` in dev, or same-origin when proxied).

## Where it is used

| Location | Behavior |
|----------|----------|
| **`useProfile`** | `loadProfile` / `saveProfile` map `ProfileResponse.image` through the resolver into `profile.avatar` for the settings form and `UAvatar` there. |
| **`UserMenu`** (`app/components/navigation/UserMenu.vue`) | Watches `user.image` from **`useAuth`**, resolves with the same composable, then sets `avatar.src` or falls back to ui-avatars. |
| **`useProfile.getAvatarUrl`** | Exposed as the same resolver for tests or one-off use. |

Settings upload (`useAvatarUpload`) puts bytes in R2 via a presigned PUT; it does not change how we **display** the image. Display always depends on resolving `user.image` after the DB (and session) reflect the new key.

## Configuration

```env
# Optional: public R2 bucket / custom domain base (no trailing slash required)
NUXT_PUBLIC_R2_CDN_URL=https://your-cdn.example.com

# API base for the SPA (see useApiOrigin / nuxt.config)
NUXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

With **`NUXT_PUBLIC_R2_CDN_URL`**, the app never calls `GET /api/user/profile/image` for display (fewer round trips, no short-lived presigned URL in the DOM).

Without it, every resolution that hits an opaque key triggers the profile-image endpoint (see expiry below).

## Backend endpoints (reference)

- **`POST /api/user/profile/image`** – presigned upload; updates `user.image` when a new key is allocated.
- **`GET /api/user/profile/image`** – JSON with `hasImage`, `downloadUrl` (presigned GET), `expiresIn`, etc. Used by the resolver when CDN is not configured.

## Operational notes

**Presigned URL lifetime**  
Presigned `downloadUrl` values expire (backend-controlled, e.g. one hour). After expiry, the same URL in the DOM stops working until the page reloads or something re-runs the resolver (which fetches a fresh URL). Prefer a stable public CDN URL in production if avatars must stay valid without refresh.

**Session vs profile API**  
The nav uses **`user` from Better Auth** (`useAuth`). The settings page can load **`GET /api/user/profile`**. Both should eventually expose the same `image` key after upload; if the menu looks stale immediately after changing the avatar, the session may need a refresh (`getSession()`).

## Related files

- `app/composables/useResolveAvatarUrl.ts` – single source of truth for `src` resolution.
- `app/composables/useProfile.ts` – profile form state and `getAvatarUrl`.
- `app/composables/useAuth.ts` – session user (including `image`).
- `app/composables/useAvatarUpload.ts` – presigned upload to R2.
- `app/components/navigation/UserMenu.vue` – resolved avatar in the shell.
- `app/pages/settings/index.vue` – profile editor and local file preview.

For backend R2 and presigning details, see the backend docs (e.g. R2 uploads feature doc) if present in the repo.
