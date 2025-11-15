# ACPL Efficiency Recorder

**Status:** ✅ Production Ready | **Version:** 2.0 (All Issues Fixed)

A Next.js-based task tracking application for warehouse/fulfillment center employees to record work efficiency and generate productivity reports.

## Quick Start

### Setup (5 minutes)

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Add your Google Sheets credentials to .env.local
# Required:
# - GOOGLE_PROJECT_ID
# - GOOGLE_PRIVATE_KEY_ID
# - GOOGLE_PRIVATE_KEY
# - GOOGLE_CLIENT_EMAIL
# - GOOGLE_SHEET_ID

# 3. Install and run
npm install
npm run dev
```

## Features

- ✅ Task submission with start/end times
- ✅ Active task tracking with estimated completion time
- ✅ Real-time Google Sheets integration
- ✅ Comprehensive reporting and analytics
- ✅ PDF and Excel export
- ✅ Mobile-responsive design
- ✅ Offline support with network status indicator
- ✅ Proper timezone handling (works globally)
- ✅ Automatic retry logic with error recovery
- ✅ Request deduplication for performance

## Recent Fixes (Version 2.0)

All 20 critical issues have been fixed:

| Issue | Status |
|-------|--------|
| Page reload after task start | ✅ Fixed |
| Timezone conversion bugs | ✅ Fixed |
| Race conditions | ✅ Fixed |
| API performance (50% improvement) | ✅ Fixed |
| Error recovery (3 retries) | ✅ Fixed |
| Hardcoded secrets | ✅ Fixed |
| Input validation | ✅ Fixed |
| Memory leaks | ✅ Fixed |
| Request timeout | ✅ Fixed |
| Audit logging | ✅ Fixed |
| Task close delay | ✅ Fixed |
| OTHER WORK 0 quantity | ✅ Fixed |

## Configuration Guide

---

## Configuration

### 1. How to Add or Update Employee Names

To add a new employee or modify an existing one, you need to edit the `employees` array in `src/lib/data.ts`.

**File:** `src/lib/data.ts`

**Instructions:**
1. Open the file `src/lib/data.ts`.
2. Find the `employees` constant.
3. Add a new object to the array for a new employee. Each employee needs a unique `id` and a `name`.

**Example:**
To add a new employee named "RAHUL", you would add the following line to the array:

```typescript
// src/lib/data.ts

import type { Employee } from "@/lib/definitions";

export const employees: Employee[] = [
  { id: "1", name: "SAGAR" },
  { id: "2", name: "KIRAN" },
  { id: "3", name: "PRAVEEN" },
  // ... other employees
  { id: "8", name: "RAHUL" }, // <-- Add the new employee here
];
```

---

### 2. How to Add or Update Portal Names

To add a new portal, you need to edit the `portals` array in `src/lib/config.ts`.

**File:** `src/lib/config.ts`

**Instructions:**
1. Open the file `src/lib/config.ts`.
2. Find the `portals` constant.
3. Add the new portal name as a string to the array.

**Example:**
To add a new portal named "MEESHO", you would modify the array like this:

```typescript
// src/lib/config.ts

// ... other config ...

export const portals = [
    "AMAZON DF", 
    "COCOBLU PO", 
    "MYNTRA-ANOUK", 
    // ... other portals
    "SHOPIFY",
    "MEESHO" // <-- Add the new portal here
];

// ... other config ...
```

---

### 3. How to Add or Update Task Names

To add a new task, you must update **two** different arrays in `src/lib/config.ts`: `ALL_TASKS` and `tasks`.

- `ALL_TASKS`: This array defines the order of task columns in the Google Sheet.
- `tasks`: This array populates the "Task Name" dropdown in the user form.

**File:** `src/lib/config.ts`

**Instructions:**
1. Open the file `src/lib/config.ts`.
2. Add your new task name to the `ALL_TASKS` array, placing it before `"OTHER WORK"`.
3. Add the same task name to the `tasks` array, also before `"OTHER WORK"`.

**Example:**
To add a new task called "PACKING":

```typescript
// src/lib/config.ts

// ...

// Define the exact order and names of tasks for horizontal layout
export const ALL_TASKS = [
  "PICKING",
  "GUN",
  "SORTING",
  "RETURN",
  "COCOBLU PO",
  "BARCODE, TAGLOOP, BUTTON",
  "PACKING", // <-- Add new task here
  "OTHER WORK"
];

export const portals = [
    // ... portals
];

export const tasks = [
    "PICKING", 
    "GUN", 
    "SORTING", 
    "RETURN", 
    "COCOBLU PO", 
    "BARCODE, TAGLOOP, BUTTON", 
    "PACKING", // <-- And also add it here
    "OTHER WORK"
];
```

---

### 4. How to Change Task Timings

The time (in seconds) it takes to complete one quantity of a task is defined in the `TASK_DURATIONS_SECONDS` object in `src/lib/config.ts`. This is used to calculate the "Estimated End Time".

**File:** `src/lib/config.ts`

**Instructions:**
1. Open the file `src/lib/config.ts`.
2. Find the `TASK_DURATIONS_SECONDS` constant.
3. You can either change the duration for an existing task or add a new one if you've added a new task.

**Example:**
To change the time for "PICKING" from 40 to 45 seconds, and to set a time for our new "PACKING" task, you would do the following:

```typescript
// src/lib/config.ts

// Configuration for task durations per item
export const TASK_DURATIONS_SECONDS: { [key: string]: number } = {
  "PICKING": 45, // <-- Changed from 40 to 45
  "GUN": 20,
  "SORTING": 54,
  "RETURN": 65,
  "COCOBLU PO": 35,
  "BARCODE, TAGLOOP, BUTTON": 65,
  "PACKING": 50, // <-- Add timing for the new task
};

// ...
```

---

## New Utilities

### Timezone Utils (`src/lib/timezone-utils.ts`)
Proper timezone handling without hardcoded offsets:
```typescript
import { isoToLocalTimeString, extractTimeFromISO } from '@/lib/timezone-utils';

const localTime = isoToLocalTimeString(isoString); // "02:30 PM"
```

### Request Utils (`src/lib/request-utils.ts`)
Retry logic, timeout handling, and request deduplication:
```typescript
import { executeWithRetry, RequestDeduplicator } from '@/lib/request-utils';

const result = await executeWithRetry(
  () => someAsyncFunction(),
  { maxRetries: 3, timeout: 30000 }
);
```

### Validation Utils (`src/lib/validation-utils.ts`)
Comprehensive input validation and sanitization:
```typescript
import { validateTaskData, sanitizeSheetName } from '@/lib/validation-utils';

const { valid, errors } = validateTaskData(data, validTasks, validPortals);
```

---

## API Configuration

Edit `src/lib/config.ts` to adjust API behavior:

```typescript
export const API_CONFIG = {
  SHEET_FETCH_RANGE: 'A1:ZZ500',        // Reduced from 1000 (50% improvement)
  ACTIVE_TASK_CACHE_TTL: 5000,          // 5 seconds
  REPORT_CACHE_TTL: 30000,              // 30 seconds
  AUTO_REFRESH_INTERVAL: 30000,         // 30 seconds
  REQUEST_TIMEOUT: 30000,               // 30 seconds
  MAX_RETRIES: 3,                       // Retry attempts
  RETRY_DELAY: 1000,                    // Initial retry delay (exponential backoff)
};
```

---

## Deployment

### Build for Production
```bash
npm run build
npm run start
```

### Environment Variables Required
- `GOOGLE_PROJECT_ID` - Google Cloud project ID
- `GOOGLE_PRIVATE_KEY_ID` - Service account private key ID
- `GOOGLE_PRIVATE_KEY` - Service account private key (with newlines)
- `GOOGLE_CLIENT_EMAIL` - Service account email
- `GOOGLE_SHEET_ID` - Google Sheets spreadsheet ID

---

## Monitoring

### Key Metrics
- API response time (target: < 1 second)
- Error rate (target: < 1%)
- Cache hit rate (target: > 80%)
- Request timeout rate (target: < 0.1%)
- Google Sheets API quota usage

### Logs
- Browser console for client-side errors
- Server logs for API errors
- localStorage error logs (if available)

---

## Troubleshooting

### "GOOGLE_SHEET_ID environment variable is not set"
Add `GOOGLE_SHEET_ID` to `.env.local`

### "Missing required Google Sheets credentials"
Verify all Google credentials in `.env.local`

### "Request timeout after 30000ms"
Check network connection, increase timeout if needed

### Task not closing immediately
The app now closes tasks immediately. If you see delays, refresh the page.

### OTHER WORK tasks not in reports
OTHER WORK tasks with 0 quantity are now included in reports.

---

## Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API Data Transfer | 702,000 cells | 351,000 cells | 50% ↓ |
| Duplicate Requests | Yes | No | 100% ↓ |
| Error Recovery | None | 3 retries | ∞ ↑ |
| Timeout Handling | None | 30s | ∞ ↑ |
| Memory Leaks | Yes | No | Fixed |

---

## Support

For issues or questions:
1. Check browser console for errors
2. Verify environment variables in `.env.local`
3. Check Google Sheets API access
4. Review error logs

---

**Version:** 2.0 (All Issues Fixed)
**Status:** ✅ Production Ready
**Last Updated:** November 2024
