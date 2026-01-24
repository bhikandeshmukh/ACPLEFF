# ACPL Efficiency Recorder

**Status:** ✅ Production Ready | **Version:** 4.0

A comprehensive Next.js-based task tracking application for warehouse/fulfillment center employees to record work efficiency, manage configurations, and generate detailed productivity reports with advanced performance analytics and efficiency tracking.

## Quick Start

### Setup (5 minutes)

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Add your Google Sheets and Firebase credentials to .env.local
# Required:
# - GOOGLE_PROJECT_ID
# - GOOGLE_PRIVATE_KEY_ID
# - GOOGLE_PRIVATE_KEY
# - GOOGLE_CLIENT_EMAIL
# - GOOGLE_SHEET_ID
# - NEXT_PUBLIC_FIREBASE_* (Firebase config)

# 3. Install and run
npm install
npm run dev
```

## Features

### Core Functionality
- ✅ Task submission with start/end times
- ✅ Active task tracking with estimated completion time
- ✅ Real-time Google Sheets integration
- ✅ **Firebase backup database** - Automatic data backup
- ✅ Multi-employee task management
- ✅ **Dynamic task detection** - Tasks read from Google Sheet headers
- ✅ **Auto-create task columns** - New tasks automatically create sheet columns
- ✅ Mobile-responsive design with touch optimization
- ✅ Offline support with network status indicator

### Advanced Efficiency Tracking
- ✅ **Task-wise Efficiency** - Per-task performance tracking with config comparison
- ✅ **Overall Efficiency** - Daily efficiency based on work schedule
- ✅ **Break Time Management** - Lunch (12:30-1:00 PM) and Tea 1 (3:00-3:15 PM) deducted
- ✅ **Gender-based Schedules** - Male (9 AM-7 PM), Female (9 AM-6 PM)
- ✅ **Overlapping Task Detection** - Prevents double counting of work time
- ✅ **Work During Breaks** - Automatically excludes break time work
- ✅ **In-Time Detection** - Uses first task start time as employee in-time

### Comprehensive Reporting
- ✅ **Consolidated Report** - All employees in single sheet with summaries
- ✅ **Task Efficiency Columns** - Config Time, Expected Time, Actual vs Expected
- ✅ **Performance Comparison** - Configured vs actual performance tracking
- ✅ **Color-coded Performance** - Visual indicators for target achievement
- ✅ **Multi-format Export** - PDF, Excel with detailed analytics
- ✅ **Task-wise Grouping** - Reports grouped by task matching Google Sheet structure

### Configuration Management
- ✅ **Configuration Dashboard** - Centralized task duration management
- ✅ **Task Duration Settings** - Configurable time per item for each task
- ✅ **Employee Management** - Add/edit employee profiles
- ✅ **Portal Configuration** - Manage available work portals
- ✅ **Export Configuration** - CSV/JSON export of system settings

### Technical Features
- ✅ Proper timezone handling (works globally)
- ✅ Automatic retry logic with error recovery
- ✅ Request deduplication for performance
- ✅ Intelligent caching system
- ✅ Business hours validation
- ✅ **Vercel Mumbai (BOM1) deployment** - Optimized for India region

## New in Version 4.0

### Efficiency Tracking System
- **Advanced Efficiency Calculation** - Based on actual work schedule
  - Male employees: 540 minutes available (9 AM - 7 PM, minus 45 min breaks)
  - Female employees: 480 minutes available (9 AM - 6 PM, minus 45 min breaks)
  - Efficiency = (Actual Work Time / Available Time) × 100
- **Break Time Management** - Only Lunch and Tea 1 deducted (45 min total)
  - Lunch: 12:30 PM - 1:00 PM (30 min) - Deducted
  - Tea Break 1: 3:00 PM - 3:15 PM (15 min) - Deducted
  - Tea Break 2: 5:00 PM - 5:15 PM (15 min) - **Counted as work time**
- **Overlapping Task Handling** - Prevents double counting when tasks overlap
- **Work During Breaks** - Automatically excludes work done during break times

### Consolidated Reporting
- **All-in-One Report Sheet** - All employees data in single sheet
- **Employee Summary Rows** - Total quantity, duration, run rate, efficiency
- **Task Efficiency Metrics** - Config time, expected time, actual vs expected
- **Performance Indicators** - Visual comparison of target vs actual

### Firebase Integration
- **Automatic Backup** - All task data backed up to Firebase
- **Dual Database** - Google Sheets (primary) + Firebase (backup)
- **Data Migration** - Scripts to migrate historical data to Firebase

### Dynamic Task Management
- **Header-based Detection** - Tasks read from Google Sheet Row 1
- **Auto-column Creation** - New tasks create 8-column sections automatically
- **Merged Headers** - Task names in merged cells with proper formatting
- **No Overwriting** - New tasks always placed after existing tasks

## Efficiency Calculation Details

### Work Schedule
- **Male Employees**: 9:00 AM - 7:00 PM (10 hours total)
- **Female Employees** (Lata & Vaishali): 9:00 AM - 6:00 PM (9 hours total)

### Break Times
- **Lunch**: 12:30 PM - 1:00 PM (30 minutes) - **Deducted**
- **Tea Break 1**: 3:00 PM - 3:15 PM (15 minutes) - **Deducted**
- **Tea Break 2**: 5:00 PM - 5:15 PM (15 minutes) - **Counted** (not deducted)
- **Total Deducted**: 45 minutes

### Available Work Time Calculation
```
Male: (Out Time - In Time) - 45 min breaks
Female: (Out Time - In Time) - 45 min breaks

Example (Male, In Time 10:00 AM):
= (7:00 PM - 10:00 AM) - 45 min
= 540 min - 45 min
= 495 minutes available
```

### Efficiency Formula
```
Efficiency % = (Actual Work Time / Fixed Available Time) × 100

Fixed Available Time:
- Male: 540 minutes (9 hours)
- Female: 480 minutes (8 hours)

Example:
Actual Work: 445 minutes
Fixed Available: 540 minutes (male)
Efficiency: (445 / 540) × 100 = 82.4%
```

### Task Efficiency
```
Task Efficiency % = (Expected Time / Actual Time) × 100

Expected Time = Quantity × Config Time per Item

Example:
Task: PICKING
Quantity: 100 pieces
Config: 40 sec/piece
Expected: 100 × 40 = 4000 sec
Actual: 4200 sec
Task Efficiency: (4000 / 4200) × 100 = 95.2%
```

## Excel Report Structure

### Consolidated Report Sheet
All employees in one sheet with:
- **Columns**: NAME, Task Name, Portal, Quantity, Start Time, Actual End, Duration, Our time (s), Run Rate (s), Expected, Actual vs Expected
- **Summary Rows**: Total quantity, duration (minutes), run rate, available time (540/480), efficiency %
- **Format**: Each employee's tasks followed by summary, then empty row

### Individual Employee Sheets
- **Summary Sheet**: Overall performance, work schedule, efficiency metrics
- **Detailed Records**: All tasks with config time, expected time, efficiency %
- **Task Configuration**: All task durations and settings
- **Portal Summary**: Portal-wise performance breakdown

## Configuration Guide

### Break Time Configuration
Break times are now hardcoded for consistency:
- Lunch: 12:30 PM - 1:00 PM (deducted)
- Tea 1: 3:00 PM - 3:15 PM (deducted)
- Tea 2: 5:00 PM - 5:15 PM (counted)

### Female Employee Detection
Female employees (Lata & Vaishali) are automatically detected for:
- Work schedule (9 AM - 6 PM)
- Available time calculation (480 minutes)
- Efficiency reporting

### Task Duration Configuration
Edit `src/lib/config.ts` to change task durations:
```typescript
export const TASK_DURATIONS_SECONDS: { [key: string]: number } = {
  "PICKING": 40,
  "GUN": 15,
  "PACKING": 25,
  // ... other tasks
};
```

## Firebase Setup

### Environment Variables
Add to `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Data Migration
To migrate existing Google Sheets data to Firebase:
```bash
npm run migrate:firebase:client
```

## Deployment

### Vercel (Recommended)
The app is configured for Mumbai (BOM1) region deployment:
```json
{
  "regions": ["bom1"]
}
```

Deploy to Vercel:
```bash
vercel --prod
```

### Environment Variables Required
- Google Sheets credentials (GOOGLE_*)
- Firebase credentials (NEXT_PUBLIC_FIREBASE_*)
- GOOGLE_SHEET_ID

---

## Troubleshooting

### Efficiency showing wrong value
- Check if employee is correctly identified as male/female
- Verify break times are being deducted (45 min total)
- Ensure fixed 540/480 minutes are used, not dynamic

### Tasks overlapping in report
- System automatically merges overlapping tasks
- Check if tasks have correct start/end times

### Break time work not excluded
- Only Lunch and Tea 1 are excluded
- Tea 2 (5:00-5:15 PM) is counted as work time

---

**Version:** 4.0 - Advanced Efficiency Tracking
**Status:** ✅ Production Ready
**Last Updated:** January 2025

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

