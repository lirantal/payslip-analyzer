# Authentication System

This document describes the authentication system implemented in the Nuxt application using Better Auth with a separate Hono API server.

## Overview

The authentication system provides a complete user authentication flow with three main pages:
- **Login** (`/login`) - User authentication
- **Register** (`/register`) - User registration
- **Forgot Password** (`/forgot-password`) - Password recovery

The system uses Better Auth running on a separate Hono API server, with the Nuxt frontend making API calls through a proxy configuration.

## Architecture

### Backend Architecture

- **Hono API Server**: Runs Better Auth authentication server
- **Database**: Neon database with Better Auth tables (user, session, account, verification)
- **API Endpoints**: `/api/auth/sign-up/email`, `/api/auth/sign-in/email`, `/api/auth/get-session`, `/api/auth/sign-out`

### Frontend Architecture

- **Better Auth Client**: Vue client for authentication
- **API Proxy**: Nitro dev proxy forwards `/api/**` requests to Hono server
- **Auth Layout**: Dedicated layout for authentication pages
- **Auth Middleware**: Global middleware for route protection
- **useAuth Composable**: Reactive authentication state management

### Layout Structure

The authentication system uses a dedicated `auth.vue` layout that provides:
- Clean, centered design without dashboard elements
- Back button navigation to home page
- Responsive card-based layout
- Dark mode support

### Components Used

- **UAuthForm** - Nuxt UI's built-in authentication form component
- **UPageCard** - Card container for form content
- **UButton** - Back navigation button
- **ULink** - Cross-page navigation links

## Configuration

### Environment Variables

Create `.env` file with Hono API URL:
```env
NUXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

### Nuxt Configuration

The `nuxt.config.ts` includes:
- Runtime config for API base URL
- Nitro dev proxy configuration
- CORS settings for API routes

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8787'
    }
  },
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8787',
        changeOrigin: true,
        prependPath: true
      }
    }
  }
})
```

### Better Auth Client Plugin

The `app/plugins/auth.client.ts` creates the Better Auth client:
```typescript
import { createAuthClient } from 'better-auth/vue'

export default defineNuxtPlugin(() => {
  const authClient = createAuthClient({
    baseURL: '/api/auth' // Relative URL, proxied by Nitro in dev
  })
  
  return {
    provide: {
      authClient
    }
  }
})
```

## Authentication Composable

The `useAuth` composable provides reactive authentication state and methods:

### State Properties
- `session` - Current user session
- `user` - Current user information
- `isLoading` - Loading state for auth operations
- `error` - Error messages from auth operations
- `isAuthenticated` - Computed boolean for authentication status

### Methods
- `getSession()` - Fetch current session from server
- `signIn(email, password)` - Sign in with email and password
- `signUp(email, password, name)` - Create new user account
- `signOut()` - Sign out current user

### Usage Example
```vue
<script setup>
const { user, isAuthenticated, signIn, signOut } = useAuth()

const handleLogin = async (email, password) => {
  try {
    await signIn(email, password)
    // User is now authenticated
  } catch (error) {
    // Handle error
  }
}
</script>
```

## Pages

### Login Page (`/login`)

**Purpose**: Authenticate existing users

**Features**:
- Email and password fields with validation
- "Remember me" checkbox option
- Social login providers (Google, GitHub) - placeholder functionality
- Cross-navigation to registration page
- Password recovery link
- Integration with Better Auth sign-in endpoint

**Form Fields**:
- `email` (required) - Email validation
- `password` (required) - Minimum 8 characters
- `remember` (optional) - Checkbox for persistent login

**Validation Schema**:
```typescript
const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})
```

### Register Page (`/register`)

**Purpose**: Create new user accounts

**Features**:
- Extended form with personal information
- Password confirmation with matching validation
- Terms of service agreement
- Social login providers (Google, GitHub) - placeholder functionality
- Cross-navigation to login page
- Integration with Better Auth sign-up endpoint

**Form Fields**:
- `firstName` (required) - Minimum 2 characters
- `lastName` (required) - Minimum 2 characters
- `email` (required) - Email validation
- `password` (required) - Minimum 8 characters
- `confirmPassword` (required) - Must match password
- `terms` (required) - Must be checked

**Validation Schema**:
```typescript
const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
  terms: z.boolean().refine(val => val === true, 'You must agree to the terms')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})
```

### Forgot Password Page (`/forgot-password`)

**Purpose**: Initiate password recovery process

**Features**:
- Simple email-only form
- Cross-navigation to login page
- Support contact link
- Ready for Better Auth email features integration

**Form Fields**:
- `email` (required) - Email validation

**Validation Schema**:
```typescript
const schema = z.object({
  email: z.string().email('Invalid email')
})
```

## Route Protection

### Auth Middleware

The `app/middleware/auth.global.ts` provides global route protection:

- **Protected Routes**: All routes except auth pages require authentication
- **Auth Pages**: `/login`, `/register`, `/forgot-password` are accessible without authentication
- **Public Pages**: Pages with `auth: false` in their page meta are accessible without authentication
- **Redirects**: Unauthenticated users are redirected to `/login`, authenticated users accessing auth pages are redirected to `/`

### Implementation
```typescript
export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, getSession } = useAuth()

  // Check if the page has auth: false in its meta (public page)
  if (to.meta.auth === false) {
    return // Allow access without authentication
  }
  
  await getSession()
  
  if (!isAuthenticated.value) {
    const authPages = ['/login', '/register', '/forgot-password']
    if (authPages.includes(to.path)) {
      return
    }
    return navigateTo('/login')
  }
  
  const authPages = ['/login', '/register', '/forgot-password']
  if (authPages.includes(to.path)) {
    return navigateTo('/')
  }
})
```

### Creating Public Pages

To make a page publicly accessible without authentication, use `definePageMeta` with `auth: false`:

```vue
<script setup lang="ts">
// This is a public page - no auth required
definePageMeta({
  layout: false,  // Optional: use custom or no layout
  auth: false     // Required: marks page as public
})
</script>
```

**Example Use Cases:**
- Upload pages (`/upload/:linkId`) - Allow anonymous file uploads
- Public landing pages
- Shared content views

**Important Notes:**
- The `auth: false` check happens before `getSession()` is called, avoiding unnecessary API calls for public pages
- This is more flexible than hardcoding paths in the middleware
- Pages can still check authentication state internally if needed (e.g., to show different UI for logged-in users)

## User Interface Integration

### UserMenu Component

The `UserMenu` component displays authenticated user information:
- **User Avatar**: Generated from user name or image
- **User Name**: Displayed in collapsed/expanded states
- **Sign Out**: Integrated with Better Auth sign-out functionality
- **Theme Controls**: Preserved from original implementation

### Default Layout

The dashboard layout (`default.vue`) shows:
- Authenticated user information in sidebar
- Sign-out functionality in user menu
- Protected navigation items

## Technical Implementation

### Dependencies

- **better-auth** - Authentication client library
- **@nuxt/ui** - UI component library
- **zod** - Schema validation
- **@vueuse/nuxt** - Vue composition utilities

### Form Validation

All forms use Zod schemas for client-side validation with:
- Type-safe validation rules
- Custom error messages
- Cross-field validation (password confirmation)
- Real-time validation feedback

### State Management

Authentication state is managed by the `useAuth` composable:
- Reactive form data
- Validation state
- Submission state
- Error handling
- Session persistence

### User Feedback

Toast notifications provide user feedback for:
- Successful form submissions
- Social provider interactions
- Error states (handled by validation)
- Authentication success/failure

## API Integration

### Better Auth Endpoints

The system integrates with Better Auth endpoints on the Hono server:

- `POST /api/auth/sign-up/email` - User registration
- `POST /api/auth/sign-in/email` - User login
- `GET /api/auth/get-session` - Get current session
- `POST /api/auth/sign-out` - User logout

### Request Flow

1. Frontend makes request to `/api/auth/endpoint`
2. Nitro dev proxy forwards request to `http://localhost:8787/api/auth/endpoint`
3. Hono server processes request with Better Auth
4. Response is returned to frontend
5. Better Auth client updates session state

## Styling and Design

### Layout Features

- **Responsive design** - Works on all screen sizes
- **Dark mode support** - Automatic theme switching
- **Centered layout** - Professional, focused appearance
- **Card-based design** - Clean, modern interface

### Navigation

- **Back button** - Returns to home page
- **Cross-page links** - Seamless navigation between auth pages
- **Consistent styling** - Unified design language

## Production Deployment

### Environment Configuration

For production deployment:

1. **Set environment variables**:
   ```env
   NUXT_PUBLIC_API_BASE_URL=https://your-hono-api.com
   ```

2. **Configure CDN/Hosting proxy**:
   - Cloudflare Pages: Use `_redirects` file
   - Netlify: Use `_redirects` file
   - Vercel: Use `vercel.json`

3. **Example Cloudflare Pages `_redirects`**:
   ```
   /api/* https://your-hono-api.com/api/:splat 200
   ```

### Security Considerations

- **HTTPS Required**: All production traffic must use HTTPS
- **CORS Configuration**: Restrict origins in Hono server
- **Secret Management**: Secure Better Auth secret keys
- **Cookie Security**: Ensure secure cookie transmission

## Future Enhancements

### Backend Integration

The forms are ready for additional Better Auth features:
- Email verification flow
- Two-factor authentication
- Social login integration
- Password reset with email

### Additional Features

Potential enhancements include:
- Account activation pages
- Password strength indicators
- Session management
- Multi-device login tracking

## Usage

### Accessing Authentication Pages

Users can access authentication pages via:
- Direct URL navigation (`/login`, `/register`, `/forgot-password`)
- Cross-page navigation links within forms
- Back button navigation
- Middleware redirects

### Development Workflow

1. **Start Hono API server** on `http://localhost:8787`
2. **Start Nuxt dev server** with `pnpm dev`
3. **Test authentication flow** through the UI
4. **Check browser network tab** for API requests

## File Structure

```
app/
├── layouts/
│   └── auth.vue              # Authentication layout
├── pages/
│   ├── login.vue             # Login page
│   ├── register.vue          # Registration page
│   ├── forgot-password.vue   # Password recovery page
│   └── upload/
│       └── [linkId].vue      # Public upload page (auth: false)
├── plugins/
│   └── auth.client.ts        # Better Auth client plugin
├── composables/
│   └── useAuth.ts            # Authentication composable
├── middleware/
│   └── auth.global.ts        # Route protection middleware
└── components/
    └── UserMenu.vue          # User menu with auth integration
```

## SEO Optimization

Each authentication page includes:
- Page-specific meta titles
- Descriptive meta descriptions
- Proper semantic HTML structure
- Accessibility features

## Troubleshooting

### Common Issues

1. **API Connection Errors**:
   - Verify Hono server is running on correct port
   - Check environment variable configuration
   - Ensure CORS is properly configured

2. **Authentication State Issues**:
   - Check browser cookies are enabled
   - Verify Better Auth secret is consistent
   - Clear browser storage and retry

3. **Proxy Issues**:
   - Verify Nitro dev proxy configuration
   - Check network requests in browser dev tools
   - Ensure API endpoints match expected paths
