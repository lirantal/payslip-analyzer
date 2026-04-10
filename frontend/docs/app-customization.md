# App Customization Guide

This guide explains how to customize the app's identity, branding, and metadata when using this project as a template for a new application.

## Quick Start Checklist

When forking this project for a new app, update the following:

- [ ] `app/app.config.ts` - App identity, branding, SEO, and links
- [ ] `public/logo.svg` - Replace with your app's logo (used for both sidebar and favicon)
- [ ] `public/og-image.png` - Add your Open Graph image for social sharing
- [ ] `package.json` - Update name, description, repository fields
- [ ] `README.md` - Update project documentation
- [ ] `layouts/default.vue` - Customize sidebar navigation (optional)
- [ ] `components/UserMenu.vue` - Customize user menu items (optional)

---

## Configuration Reference

All app metadata is centralized in `app/app.config.ts`. This is the single source of truth for app identity.

### Full Configuration Structure

```typescript
export default defineAppConfig({
  // App Identity
  identity: {
    name: 'Your App Name',
    tagline: 'A short tagline for your app',
    description: 'A longer description used for SEO and about pages'
  },

  // SEO Defaults
  seo: {
    ogImage: '/og-image.png',        // Open Graph image for social sharing
    twitterCard: 'summary_large_image' // Twitter card type
  },

  // Branding Assets
  branding: {
    logo: '/logo.svg',               // Path to logo (relative to public/)
    logoAlt: 'Your App Name',        // Alt text for logo
    favicon: '/logo.svg'             // Path to favicon (uses same logo as sidebar)
  },

  // Teams/Workspaces (optional - enables team switcher in sidebar)
  teams: [],                         // Empty = show app branding, populated = show dropdown

  // External Links (leave empty string to hide)
  links: {
    documentation: 'https://docs.yourapp.com',
    support: 'mailto:support@yourapp.com',
    feedback: 'https://feedback.yourapp.com',
    repository: 'https://github.com/your-org/your-app'
  },

  // UI Configuration
  ui: {
    colors: {
      primary: 'green',              // Primary color from Tailwind palette
      neutral: 'zinc'                // Neutral color from Tailwind palette
    }
  },

  // Feature Flags (for development/testing)
  features: {
    showThemePicker: false,          // Show theme color picker in user menu
    showAppearanceToggle: false      // Show light/dark mode toggle in user menu
  }
})
```

### Configuration Sections

#### `identity`

| Field | Description | Used In |
|-------|-------------|---------|
| `name` | The app's display name | Page titles, sidebar, SEO |
| `tagline` | Short description | Marketing, headers |
| `description` | Long description | SEO meta tags, about pages |

#### `seo`

| Field | Description | Used In |
|-------|-------------|---------|
| `ogImage` | Path to Open Graph image | Social media previews |
| `twitterCard` | Twitter card type | Twitter previews |

#### `branding`

| Field | Description | Used In |
|-------|-------------|---------|
| `logo` | Path to logo file (SVG recommended) | Sidebar header, favicon |
| `logoAlt` | Alt text for logo | Accessibility |
| `favicon` | Path to favicon (defaults to logo) | Browser tab icon |

**Note:** By default, the logo and favicon use the same SVG file (`/logo.svg`). Modern browsers support SVG favicons, which scale perfectly at any size. When creating your logo, design it to be recognizable at small sizes (16x16 to 32x32 pixels) since it will appear in browser tabs.

#### `teams`

Optional team/workspace switcher configuration. When empty, shows simple app branding. When populated, shows a dropdown menu to switch between teams.

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Team display name |
| `logo` | string | Team logo URL or path |

**Usage:** Leave as empty array `[]` for simple app branding, or populate for multi-team support:

```typescript
// Simple app branding (default)
teams: []

// Multi-team dropdown
teams: [
  { label: 'Acme Corp', logo: 'https://example.com/acme.png' },
  { label: 'Personal', logo: '/team-personal.png' }
]
```

#### `links`

| Field | Description | Used In |
|-------|-------------|---------|
| `documentation` | Docs URL | User menu, help links |
| `support` | Support URL or mailto: | User menu, help links |
| `feedback` | Feedback form URL | User menu, sidebar |
| `repository` | GitHub/GitLab repo URL | User menu, source links |

**Note:** Leave any link as an empty string `''` to hide it from the UI.

#### `ui.colors`

| Field | Options | Description |
|-------|---------|-------------|
| `primary` | red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose | Main accent color |
| `neutral` | slate, gray, zinc, neutral, stone | Background/text color |

#### `features`

Feature flags for development and testing. These are disabled by default for production.

| Field | Default | Description |
|-------|---------|-------------|
| `showThemePicker` | `false` | Shows theme color picker (primary/neutral) in user menu |
| `showAppearanceToggle` | `false` | Shows light/dark mode toggle in user menu |

**Usage:** Enable these during development to test different color schemes:

```typescript
features: {
  showThemePicker: true,      // Enable for dev
  showAppearanceToggle: true  // Enable for dev
}
```

---

## Navigation Customization

Navigation is defined in component files rather than `app.config.ts` because it typically requires more complex logic (icons, nested menus, badges, etc.).

### Navigation Files Overview

| File | What It Controls |
|------|------------------|
| `layouts/default.vue` | Sidebar navigation (main app pages) |
| `components/UserMenu.vue` | User dropdown menu (Profile, Billing, Settings, Logout) |
| `components/TeamsMenu.vue` | App logo/branding or team switcher (configured via `teams` in config) |

### Sidebar Navigation

**File:** `layouts/default.vue`

The sidebar links are defined in the `mainLinks` array:

```typescript
const mainLinks: NavigationMenuItem[] = [{
  label: 'Home',
  icon: 'i-lucide-house',
  to: '/',
  onSelect: () => { open.value = false }
}, {
  label: 'Events',
  icon: 'i-lucide-calendar',
  to: '/events',
  onSelect: () => { open.value = false }
}, {
  // ... more items
}]
```

**To customize:**
- **Add a link:** Add a new object to the `mainLinks` array
- **Remove a link:** Delete the object from the array
- **Change icon:** Update the `icon` property (uses [Lucide icons](https://lucide.dev/icons/) with `i-lucide-` prefix)
- **Add badge:** Add `badge: '4'` property to show a notification badge
- **Add submenu:** Add `type: 'trigger'` and `children: [...]` array

**Example - Adding a new page:**
```typescript
{
  label: 'Reports',
  icon: 'i-lucide-bar-chart',
  to: '/reports',
  onSelect: () => { open.value = false }
}
```

### User Menu

**File:** `components/UserMenu.vue`

The user menu items are defined in the `items` computed property. The menu has several sections:

1. **User label** - Shows current user name/avatar (auto-generated)
2. **Quick actions** - Profile, Billing, Settings links
3. **Dev features** - Theme/Appearance toggles (controlled by `features` flags)
4. **External links** - Documentation, Support, etc. (controlled by `links` in config)
5. **Logout** - Sign out action (always shown)

**To customize quick actions (Profile, Billing, Settings):**

Find this section in `UserMenu.vue`:
```typescript
const items = computed<DropdownMenuItem[][]>(() => {
  const menuItems: DropdownMenuItem[][] = [[{
    type: 'label',
    label: currentUser.value.name,
    avatar: currentUser.value.avatar
  }], [{
    label: 'Profile',
    icon: 'i-lucide-user'
  }, {
    label: 'Billing',
    icon: 'i-lucide-credit-card'
  }, {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings'
  }]]
  // ...
})
```

**Common customizations:**

**Remove an item (e.g., Billing):**
```typescript
[{
  label: 'Profile',
  icon: 'i-lucide-user',
  to: '/settings'  // Add route if needed
}, {
  label: 'Settings',
  icon: 'i-lucide-settings',
  to: '/settings'
}]
```

**Add a route to Profile:**
```typescript
{
  label: 'Profile',
  icon: 'i-lucide-user',
  to: '/settings'  // or '/profile' if you have a dedicated page
}
```

**Add a new item:**
```typescript
{
  label: 'My Account',
  icon: 'i-lucide-wallet',
  to: '/account'
}
```

### Menu Item Properties

| Property | Type | Description |
|----------|------|-------------|
| `label` | string | Display text |
| `icon` | string | Lucide icon name (`i-lucide-*`) |
| `to` | string | Internal route path |
| `href` | string | External URL (use instead of `to`) |
| `target` | string | Link target (`_blank` for new tab) |
| `badge` | string | Badge text to display |
| `onClick` | function | Click handler |
| `children` | array | Submenu items |

### Icon Reference

Icons use the [Lucide](https://lucide.dev/icons/) icon set with prefix `i-lucide-`. Common icons:

| Icon | Name |
|------|------|
| Home | `i-lucide-house` |
| Settings | `i-lucide-settings` |
| User | `i-lucide-user` |
| Calendar | `i-lucide-calendar` |
| Inbox | `i-lucide-inbox` |
| Users | `i-lucide-users` |
| Credit Card | `i-lucide-credit-card` |
| Help | `i-lucide-help-circle` |
| Logout | `i-lucide-log-out` |

Browse all icons at: https://lucide.dev/icons/

---

## Asset Replacement Guide

### Logo & Favicon

The app uses a single SVG file (`public/logo.svg`) for both the sidebar logo and the browser tab favicon. This approach:
- Ensures consistent branding across the app
- Leverages SVG's perfect scaling at any size
- Simplifies asset management (one file instead of two)

**To replace the logo:**

1. Create your logo as an SVG file
   - Design it to be recognizable at small sizes (favicon appears at 16x16 to 32x32 pixels)
   - Use simple shapes and high contrast colors
   - Avoid fine details that won't be visible at small sizes
2. Replace `public/logo.svg` with your new logo
3. Update `app.config.ts`:
   ```typescript
   branding: {
     logo: '/logo.svg',
     logoAlt: 'Your App Name',
     favicon: '/logo.svg'
   }
   ```

**Using separate favicon (optional):**

If you need a different favicon from your logo (e.g., a simplified icon version), you can use separate files:

1. Add your favicon as `public/favicon.svg` (or `.ico` for legacy browser support)
2. Update the favicon link in `nuxt.config.ts`:
   ```typescript
   app: {
     head: {
       link: [
         { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
       ]
     }
   }
   ```
3. Update `app.config.ts` to reflect the separate path:
   ```typescript
   branding: {
     logo: '/logo.svg',
     favicon: '/favicon.svg'
   }
   ```

**Note:** The favicon is configured in `nuxt.config.ts` under `app.head.link`. Modern browsers support SVG favicons natively.

### Open Graph Image

1. Create an OG image (recommended: 1200x630 PNG)
2. Add to `public/og-image.png`
3. Ensure `app.config.ts` has `seo.ogImage: '/og-image.png'`

---

## Page SEO Guide

Use the `usePageSeo` composable for consistent page-level SEO:

```typescript
// In any page component
usePageSeo('Page Title', 'Optional page-specific description')
```

This automatically:
- Appends the app name: "Page Title | Your App Name"
- Uses the app's default description if none provided
- Sets Open Graph and Twitter meta tags
- Uses the configured OG image

### Examples

```typescript
// Login page
usePageSeo('Login', 'Sign in to your account')
// Result: "Login | Your App Name"

// Dashboard (using default description)
usePageSeo('Dashboard')
// Result: "Dashboard | Your App Name" with app's default description
```

---

## Package.json Updates

Update these fields in `frontend/package.json`:

```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "description": "Your app description",
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/your-app"
  }
}
```

---

## README Template

Update `frontend/README.md` with:

1. **Project Name** - Replace "Nuxt Dashboard Template" with your app name
2. **Description** - Add your app's description
3. **Features** - List your app's key features
4. **Installation** - Keep or customize setup instructions
5. **Configuration** - Document any environment variables
6. **License** - Update as needed

---

## Environment Variables

These environment-specific values should remain in `.env` or `nuxt.config.ts` runtime config:

| Variable | Description |
|----------|-------------|
| `NUXT_PUBLIC_API_BASE_URL` | Backend API URL |
| `NUXT_PUBLIC_R2_CDN_URL` | CDN URL for file storage |

Do NOT put these in `app.config.ts` as they vary by environment.

---

## Type Safety

The app config has TypeScript definitions in `app/types/app-config.d.ts`. If you add new fields to `app.config.ts`, update the type definitions:

```typescript
// app/types/app-config.d.ts
export interface AppIdentity {
  name: string
  tagline: string
  description: string
  // Add new fields here
}
```

---

## Components Using Config

These components read from `app.config.ts`:

| Component | What It Uses |
|-----------|--------------|
| `app/app.vue` | `identity`, `seo`, `branding` |
| `components/TeamsMenu.vue` | `identity.name`, `branding`, `teams` |
| `components/UserMenu.vue` | `links`, `ui.colors`, `features` |
| `layouts/default.vue` | `links` |
| `composables/useSeo.ts` | `identity`, `seo` |

---

## AI Agent Instructions

When customizing this app for a new project:

1. **Start with `app/app.config.ts`** - This is the single source of truth for identity, branding, SEO
2. **Replace assets** - Replace `public/logo.svg` (used for both sidebar logo and favicon) and `public/og-image.png`
3. **Update package.json** - name, description, repository
4. **Update README.md** - Project documentation
5. **Customize navigation** (if needed):
   - `layouts/default.vue` - Edit `mainLinks` array for sidebar navigation
   - `components/UserMenu.vue` - Edit `items` computed for user dropdown menu
6. **Run linter** - `pnpm run lint:fix` to catch any issues
7. **Run typecheck** - `pnpm run typecheck` to verify types

**Key files summary:**
| What to change | Where to change it |
|----------------|-------------------|
| App name, description, SEO | `app/app.config.ts` |
| Logo & favicon | `public/logo.svg` (single file for both) |
| Favicon configuration | `nuxt.config.ts` → `app.head.link` |
| Sidebar navigation | `layouts/default.vue` → `mainLinks` |
| User menu (Profile, Billing, etc.) | `components/UserMenu.vue` → `items` |
| External links (docs, support) | `app/app.config.ts` → `links` |
| Feature flags (theme picker) | `app/app.config.ts` → `features` |
