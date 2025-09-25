# ACPL Efficiency Recorder - Configuration Guide

This guide explains how to update the core data used in the application, such as employee names, portal names, task names, and task timings.

---

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
