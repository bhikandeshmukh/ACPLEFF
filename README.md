# ACPL Efficiency Recorder

**Status:** ✅ Production Ready | **Version:** 3.0

A comprehensive Next.js-based task tracking application for warehouse/fulfillment center employees to record work efficiency, manage configurations, and generate detailed productivity reports with performance analytics.

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

### Core Functionality
- ✅ Task submission with start/end times
- ✅ Active task tracking with estimated completion time
- ✅ Real-time Google Sheets integration
- ✅ Multi-employee task management
- ✅ Mobile-responsive design with touch optimization
- ✅ Offline support with network status indicator

### Configuration Management
- ✅ **Configuration Dashboard** - Centralized task duration management
- ✅ **Task Duration Settings** - Configurable time per item for each task
- ✅ **Employee Management** - Add/edit employee profiles
- ✅ **Portal Configuration** - Manage available work portals
- ✅ **Export Configuration** - CSV/JSON export of system settings

### Advanced Reporting & Analytics
- ✅ **Performance Comparison** - Configured vs actual performance tracking
- ✅ **Color-coded Performance** - Visual indicators for target achievement
- ✅ **Comprehensive Reports** - Employee, task, and portal-wise analytics
- ✅ **Multi-format Export** - PDF, Excel with configuration sheets
- ✅ **Real-time Monitoring** - Live active task status across all employees

### Technical Features
- ✅ Proper timezone handling (works globally)
- ✅ Automatic retry logic with error recovery
- ✅ Request deduplication for performance
- ✅ Intelligent caching system
- ✅ Business hours validation

## New in Version 3.0

### Configuration Management System
- **Configuration Dashboard** (`/config`) - Complete system settings management
- **Task Duration Configuration** - Set and view time allocations per task
- **Performance Analytics** - Compare configured vs actual performance
- **Export Capabilities** - Download configuration as CSV/JSON

### Enhanced Reporting
- **Task Configuration Sheets** - All exports now include configuration data
- **Performance Comparison Tables** - Visual indicators for target vs actual
- **Comprehensive Analytics** - Task-wise, portal-wise, and employee-wise breakdowns
- **Real-time Status Monitoring** - Live view of all active tasks

### User Experience Improvements
- **Tabbed Configuration Interface** - Organized settings management
- **Color-coded Performance Indicators** - Green for on-target, red for over-target
- **Mobile-optimized Configuration** - Responsive design for all devices
- **Export Options** - Multiple format support with configuration data

## Configuration Guide

### Using the Configuration Dashboard

The easiest way to manage your system is through the **Configuration Dashboard** at `/config`:

1. **Access Configuration**: Click "Configuration" on the main page
2. **View Task Durations**: See all task time allocations with formatted display
3. **Monitor System Settings**: Check employee count, portal count, and overview metrics
4. **Export Configuration**: Download system settings as CSV or JSON

### Manual Configuration (Advanced Users)

### 1. How to Add or Update Employee Names

To add a new employee or modify an existing one, you need to edit the `employees` array in `src/lib/config.ts`.

**File:** `src/lib/config.ts`

**Instructions:**
1. Open the file `src/lib/config.ts`.
2. Find the `employees` constant.
3. Add a new object to the array for a new employee. Each employee needs a unique `id` and a `name`.

**Example:**
To add a new employee named "RAHUL", you would add the following line to the array:

```typescript
// src/lib/config.ts

export const employees: Employee[] = [
  { id: "1", name: "SAGAR" },
  { id: "2", name: "KIRAN" },
  { id: "3", name: "KARAN" },
  { id: "4", name: "LATA" },
  { id: "5", name: "VAISHALI" },
  { id: "6", name: "NIRBHAY" },
  { id: "7", name: "RAHUL" }, // <-- Add the new employee here
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
    "MYNTRA-HANUKU", 
    "FLIPKART", 
    "AJIO-BE ACTIVE", 
    "AJIO-HANUKU", 
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
  "PACKING",
  "PENDING ORDER",
  "SORTING",
  "RETURN OMS",
  "RETURN RECEVING",
  "ONLINE PICKUP",
  "COCOBLU PO",
  "MYNTRA PO",
  "BARCODE, TAGLOOP, BUTTON",
  "NEW TASK", // <-- Add new task here
  "OTHER WORK"
];

export const tasks = [
    "PICKING", 
    "GUN", 
    "PACKING", 
    "PENDING ORDER", 
    "SORTING", 
    "RETURN", 
    "COCOBLU PO", 
    "BARCODE, TAGLOOP, BUTTON", 
    "NEW TASK", // <-- And also add it here
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
  "PICKING": 40,
  "GUN": 20,
  "PACKING": 38,
  "PENDING ORDER": 200,
  "SORTING": 54,
  "RETURN OMS": 65,
  "RETURN RECEVING": 30,
  "ONLINE PICKUP": 30,
  "COCOBLU PO": 35,
  "MYNTRA PO": 35,
  "BARCODE, TAGLOOP, BUTTON": 65,
  "NEW TASK": 50, // <-- Add timing for the new task
  "OTHER WORK": 60,
};

// ...
```

---

## Application Structure

### Pages
- **`/`** - Main dashboard with navigation to all features
- **`/task`** - Task submission and management interface
- **`/report`** - Comprehensive reporting and analytics
- **`/config`** - Configuration management dashboard

### Key Components
- **`EnhancedTrackerForm`** - Main task submission interface
- **`ConfigurationView`** - System configuration management
- **`EmployeeReportCard`** - Individual employee performance display
- **`ActiveTaskStatus`** - Real-time task monitoring

---

## Technical Utilities

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

## Configuration Features

### Task Duration Management
- **Visual Display**: See all task durations with formatted time (e.g., "1m 20s")
- **Type Indicators**: Distinguish between custom and default durations
- **Performance Comparison**: Compare configured vs actual employee performance
- **Export Options**: Download configuration as CSV or JSON

### Employee & Portal Management
- **Employee Overview**: View all registered employees with status
- **Portal Configuration**: Manage available work portals
- **System Metrics**: Total counts and overview statistics

### Report Enhancements
- **Configuration Sheets**: All PDF/Excel exports include task configuration
- **Performance Analytics**: Color-coded performance indicators in reports
- **Comprehensive Data**: Task-wise, portal-wise, and employee-wise breakdowns

---

## Support

For issues or questions:
1. Check browser console for errors
2. Verify environment variables in `.env.local`
3. Check Google Sheets API access
4. Review error logs

---

**Version:** 3.0 - Configuration Management
**Status:** ✅ Production Ready
**Last Updated:** December 2024
