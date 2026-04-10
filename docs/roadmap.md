# Feature Roadmap

This document tracks the implementation status of features across the frontend and backend applications.

## User Authentication

- [x] Login
  - Frontend: [frontend/app/pages/login.vue](frontend/app/pages/login.vue)
  - Backend: [backend/src/index.ts](backend/src/index.ts) (Better Auth mounted at `/api/auth/*`)
- [ ] Register
- [ ] Forgot Password
- [ ] Password Reset
- [ ] Social Authentication (Google, GitHub)
- [ ] Email Verification
- [ ] Two-Factor Authentication
- [ ] Session Management

## User Profile

- [x] Update user name
  - Frontend: [frontend/app/pages/settings/index.vue](frontend/app/pages/settings/index.vue)
  - Backend: [backend/src/routes/profile.ts](backend/src/routes/profile.ts) (mounted at `/api/user/profile`)
- [x] Update profile picture
  - Frontend: [frontend/app/pages/settings/index.vue](frontend/app/pages/settings/index.vue)
  - Backend: [backend/src/routes/profile.ts](backend/src/routes/profile.ts) (mounted at `/api/user/profile`)
- [ ] View user profile
- [ ] Update email address
- [ ] Update bio/description
- [ ] Profile privacy settings

## User Settings

- [x] Notification preferences
  - Frontend: [frontend/app/pages/settings/notifications.vue](frontend/app/pages/settings/notifications.vue)
  - Backend: [backend/src/routes/notifications.ts](backend/src/routes/notifications.ts) (mounted at `/api/user/notifications`)
  - Database: [backend/src/db/schema.ts](backend/src/db/schema.ts) (user_notifications table)
  - Migration: [backend/drizzle/0001_spicy_silver_centurion.sql](backend/drizzle/0001_spicy_silver_centurion.sql)

