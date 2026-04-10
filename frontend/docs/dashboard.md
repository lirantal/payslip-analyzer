# Dashboard Implementation Guide

This document covers the implementation patterns, visual components, and best practices for the dashboard feature, including both frontend and backend considerations.

## Table of Contents

1. [Overview](#overview)
2. [Frontend Components](#frontend-components)
3. [Charting with Unovis](#charting-with-unovis)
4. [Date Handling](#date-handling)
5. [Backend API Endpoints](#backend-api-endpoints)
6. [Data Aggregation Patterns](#data-aggregation-patterns)
7. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## Overview

The dashboard provides event organizers with insights into their data through:

- **Stats Cards**: Quick metrics (Events, Files, Storage, Attendees)
- **Chart**: Time-series visualization of uploads (files count or storage bytes)
- **Uploaders Table**: Recent upload activity

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Nuxt)                        │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ HomeStats   │  │ HomeChart       │  │ HomeUploaders   │  │
│  │ (stats)     │  │ (time-series)   │  │ (table)         │  │
│  └──────┬──────┘  └────────┬────────┘  └────────┬────────┘  │
│         │                  │                    │           │
│         ▼                  ▼                    ▼           │
│  /api/dashboard/stats  /api/dashboard/chart  /api/dashboard/uploaders
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Hono + Drizzle)                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              dashboard.ts route handler             │    │
│  │  - Stats aggregation (count, sum)                   │    │
│  │  - Chart data (date_trunc, groupBy)                 │    │
│  │  - Uploaders list (joins, ordering)                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                             │                               │
│                             ▼                               │
│                    PostgreSQL (Neon)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Components

### Location

All dashboard components are in `frontend/app/components/home/`:

| Component | Purpose |
|-----------|---------|
| `HomeStats.vue` | Displays 4 stat cards with variations |
| `HomeChart.client.vue` | Time-series chart (client-side only) |
| `HomeUploaders.vue` | Table of recent uploaders |

### HomeStats.vue

Displays aggregated statistics with period-over-period variation.

```vue
<script setup lang="ts">
const config = useRuntimeConfig()

const { data: stats } = await useAsyncData('dashboard-stats', async () => {
  return await $fetch<DashboardStats>(
    `${config.public.apiBaseUrl}/api/dashboard/stats`,
    {
      credentials: 'include',
      query: {
        startDate: props.range.start.toISOString(),
        endDate: props.range.end.toISOString()
      }
    }
  )
})
</script>
```

**Key patterns:**
- Uses `useAsyncData` for SSR-compatible data fetching
- Passes `credentials: 'include'` for authentication
- Accepts `range` prop for date filtering
- Displays variation badges (+X% or -X%)

### HomeChart.client.vue

Time-series chart using Unovis library. The `.client.vue` suffix ensures it only renders on the client (required for canvas-based charts).

**Key features:**
- Toggle between "Files" and "Storage" views
- Supports daily, weekly, monthly periods
- Fills in missing dates with zero values
- Responsive width using `useElementSize`

### HomeUploaders.vue

Table showing recent upload activity using Nuxt UI's `UTable` component.

**Key patterns:**
- Groups uploads by uploader and event
- Shows anonymous uploaders as "Anonymous #X"
- Formats dates using `date-fns`
- Formats storage sizes (B, KB, MB, GB)

---

## Charting with Unovis

[Unovis](https://unovis.dev/) is the charting library used for visualizations.

### Installation

```bash
pnpm add @unovis/vue @unovis/ts
```

### Basic Usage

```vue
<script setup lang="ts">
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'

type DataRecord = {
  date: Date
  value: number
}

const data = ref<DataRecord[]>([...])

// Accessor functions
const x = (_: DataRecord, i: number) => i  // Use index for x-axis
const y = (d: DataRecord) => d.value       // Use value for y-axis
</script>

<template>
  <VisXYContainer :data="data" :padding="{ top: 40 }" class="h-96">
    <VisLine :x="x" :y="y" color="var(--ui-primary)" />
    <VisArea :x="x" :y="y" color="var(--ui-primary)" :opacity="0.1" />
    <VisAxis type="x" :x="x" :tick-format="formatXTicks" />
    <VisCrosshair color="var(--ui-primary)" :template="tooltipTemplate" />
    <VisTooltip />
  </VisXYContainer>
</template>
```

### Styling

Use CSS variables to match the app theme:

```vue
<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);
  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);
  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
```

### Filling Missing Dates

When displaying time-series data, generate all dates in the range and merge with API data:

```typescript
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format, parseISO } from 'date-fns'

const data = computed(() => {
  // Generate all dates in the range
  let dates: Date[]
  switch (period) {
    case 'weekly':
      dates = eachWeekOfInterval(range, { weekStartsOn: 1 }) // Monday start!
      break
    case 'monthly':
      dates = eachMonthOfInterval(range)
      break
    default:
      dates = eachDayOfInterval(range)
  }

  // Create lookup map from API data
  const apiDataMap = new Map<string, ApiDataPoint>()
  for (const point of apiData) {
    const dateKey = format(parseISO(point.date), 'yyyy-MM-dd')
    apiDataMap.set(dateKey, point)
  }

  // Merge: use API data if exists, otherwise default to 0
  return dates.map(date => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const apiPoint = apiDataMap.get(dateKey)
    return {
      date,
      value: apiPoint?.value ?? 0
    }
  })
})
```

---

## Date Handling

### ⚠️ Critical: Week Start Alignment

**PostgreSQL** and **date-fns** have different default week starts:

| Library | Default Week Start |
|---------|-------------------|
| PostgreSQL `date_trunc('week', ...)` | **Monday** |
| date-fns `eachWeekOfInterval` | **Sunday** |

This mismatch causes data to not display correctly in weekly view!

**Solution:** Always specify `weekStartsOn: 1` (Monday) in date-fns:

```typescript
// ✅ Correct - matches PostgreSQL
dates = eachWeekOfInterval(range, { weekStartsOn: 1 })

// ❌ Wrong - uses Sunday, won't match backend dates
dates = eachWeekOfInterval(range)
```

### Date Range Props

The dashboard uses a shared date range and period from the parent page:

```typescript
// types/index.d.ts
export type Period = 'daily' | 'weekly' | 'monthly'
export type Range = { start: Date; end: Date }

// Component props
defineProps<{
  period: Period
  range: Range
}>()
```

### Passing Dates to API

Always use ISO 8601 format:

```typescript
query: {
  startDate: range.start.toISOString(),
  endDate: range.end.toISOString(),
  period: period  // 'daily' | 'weekly' | 'monthly'
}
```

---

## Backend API Endpoints

All dashboard endpoints are in `backend/src/routes/dashboard.ts`.

### GET /api/dashboard/stats

Returns aggregated statistics with period-over-period variation.

**Query Parameters:**
- `startDate` (ISO 8601) - Start of current period
- `endDate` (ISO 8601) - End of current period

**Response:**
```typescript
{
  events: { count: number, variation: number },
  files: { count: number, variation: number },
  storageUsed: { bytes: number, variation: number },
  uniqueAttendees: { count: number, variation: number }
}
```

**Notes:**
- `count`/`bytes` are **all-time totals** (not filtered by date)
- `variation` is percentage change between current and previous periods

### GET /api/dashboard/chart

Returns time-series data for charting.

**Query Parameters:**
- `startDate` (ISO 8601)
- `endDate` (ISO 8601)
- `period` - `'daily'` | `'weekly'` | `'monthly'`

**Response:**
```typescript
{
  data: Array<{
    date: string,      // ISO date (e.g., "2026-01-09")
    fileCount: number,
    storageBytes: number
  }>
}
```

### GET /api/dashboard/uploaders

Returns recent upload activity grouped by uploader.

**Query Parameters:**
- `limit` (optional, default: 10)

**Response:**
```typescript
{
  uploaders: Array<{
    id: string,
    type: 'user' | 'anonymous',
    email: string | null,
    displayName: string,
    eventId: string,
    eventName: string,
    fileCount: number,
    totalSize: number,
    lastUploadAt: string
  }>
}
```

---

## Data Aggregation Patterns

### Counting with Drizzle

```typescript
import { sql, eq, and, isNull, gte, lt } from 'drizzle-orm'

// Count files
const [result] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(file)
  .innerJoin(event, eq(file.eventId, event.id))
  .where(and(
    eq(event.ownerId, userId),
    isNull(file.deletedAt),
    isNull(event.deletedAt)
  ))

return result?.count ?? 0
```

### Summing with Drizzle

```typescript
// Sum file sizes
const [result] = await db
  .select({ total: sql<number>`coalesce(sum(${file.size}), 0)::bigint` })
  .from(file)
  .innerJoin(event, eq(file.eventId, event.id))
  .where(and(
    eq(event.ownerId, userId),
    isNull(file.deletedAt)
  ))

return Number(result?.total ?? 0)
```

### Date Truncation for Grouping

⚠️ **Critical:** The `date_trunc` interval must be a **literal string**, not a parameter!

```typescript
// ❌ WRONG - Drizzle will parameterize this, causing SQL error
const dateTrunc = 'week'
sql`date_trunc(${dateTrunc}, ${file.uploadedAt})`
// Results in: date_trunc($1, ...) with params: ['week']
// PostgreSQL rejects this!

// ✅ CORRECT - Use switch statement with literal strings
switch (period) {
  case 'weekly':
    chartData = await db
      .select({
        date: sql<string>`date_trunc('week', ${file.uploadedAt})::date`,
        fileCount: sql<number>`count(*)::int`,
        storageBytes: sql<number>`coalesce(sum(${file.size}), 0)::bigint`
      })
      .from(file)
      .innerJoin(event, eq(file.eventId, event.id))
      .where(conditions)
      .groupBy(sql`date_trunc('week', ${file.uploadedAt})::date`)
      .orderBy(sql`date_trunc('week', ${file.uploadedAt})::date`)
    break
  case 'monthly':
    // Same pattern with 'month'
    break
  default: // daily
    // Same pattern with 'day'
}
```

### Calculating Variation Percentage

```typescript
function calculateVariation(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return Math.round(((current - previous) / previous) * 100)
}
```

---

## Common Pitfalls & Solutions

### 1. Chart Shows 0 in Weekly View

**Problem:** Data exists in daily view but not weekly.

**Cause:** Week start mismatch between PostgreSQL (Monday) and date-fns (Sunday).

**Solution:** Use `{ weekStartsOn: 1 }` in `eachWeekOfInterval`.

### 2. SQL Error with date_trunc

**Problem:** `DrizzleQueryError: Failed query: select date_trunc($1, ...)`

**Cause:** Drizzle parameterizes the interval argument, but PostgreSQL requires a literal.

**Solution:** Use a switch statement with literal strings instead of interpolating a variable.

### 3. Stats Show 0 Despite Having Data

**Problem:** Stats cards show 0 even though data exists.

**Cause:** Date range filtering applied to total counts.

**Solution:** Fetch **all-time totals** without date filters, only use date range for variation calculation.

### 4. UButtonGroup Not Found

**Problem:** `[Vue warn]: Failed to resolve component: UButtonGroup`

**Cause:** Component may not be available in current Nuxt UI version.

**Solution:** Use a `div` with flex styling and individual `UButton` components:

```vue
<div class="flex gap-1">
  <UButton
    v-for="option in options"
    :key="option.value"
    size="xs"
    :color="selected === option.value ? 'primary' : 'neutral'"
    :variant="selected === option.value ? 'solid' : 'ghost'"
    @click="selected = option.value"
  >
    {{ option.label }}
  </UButton>
</div>
```

### 5. API Call Pattern in Nuxt

**Problem:** `$api is of type 'unknown'`

**Cause:** Using incorrect API fetching pattern.

**Solution:** Use `useRuntimeConfig()` with `$fetch`:

```typescript
const config = useRuntimeConfig()

const { data } = await useAsyncData('key', async () => {
  return await $fetch<ResponseType>(
    `${config.public.apiBaseUrl}/api/endpoint`,
    {
      credentials: 'include',
      query: { ... }
    }
  )
})
```

---

## TypeScript Interfaces

```typescript
// frontend/app/types/index.d.ts

export interface DashboardStats {
  events: { count: number; variation: number }
  files: { count: number; variation: number }
  storageUsed: { bytes: number; variation: number }
  uniqueAttendees: { count: number; variation: number }
}

export interface ChartDataPoint {
  date: string
  fileCount: number
  storageBytes: number
}

export interface RecentUploader {
  id: string
  type: 'user' | 'anonymous'
  email: string | null
  displayName: string
  eventId: string
  eventName: string
  fileCount: number
  totalSize: number
  lastUploadAt: string
}

export type Period = 'daily' | 'weekly' | 'monthly'
export type Range = { start: Date; end: Date }
```

---

## Formatting Utilities

### Storage Size Formatter

```typescript
function formatStorage(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${bytes} B`
}
```

### Relative Time Formatter

```typescript
import { formatDistanceToNow, parseISO } from 'date-fns'

function formatRelativeTime(isoDate: string): string {
  return formatDistanceToNow(parseISO(isoDate), { addSuffix: true })
}
// Output: "2 hours ago", "yesterday", etc.
```

---

## i18n Keys

Dashboard-related translation keys are in `frontend/i18n/locales/en.json`:

```json
{
  "home": {
    "actions": {
      "new_event": "New event",
      "view_events": "View events"
    },
    "stats": {
      "events": "Events",
      "files": "Files",
      "storage": "Storage",
      "attendees": "Attendees"
    },
    "chart": {
      "files_uploaded": "Files Uploaded",
      "storage_used": "Storage Used",
      "files": "Files",
      "storage": "Storage"
    },
    "uploaders": {
      "title": "Recent Uploaders",
      "columns": {
        "uploader": "Uploader",
        "event": "Event",
        "time": "Time",
        "files": "Files",
        "storage": "Storage"
      }
    }
  }
}
```
