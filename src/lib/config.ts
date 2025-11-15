import type { Employee } from "@/lib/definitions";

// Validate required environment variables (server-side only)
// This validation is moved to server-actions.ts to avoid client-side process access

// Configuration for task durations per item
export const TASK_DURATIONS_SECONDS: { [key: string]: number } = {
  "PICKING": 40,
  "GUN": 20,
  "PACKING": 38,
  "PENDING ORDER": 720,
  "SORTING": 54,
  "RETURN": 65,
  "COCOBLU PO": 35,
  "BARCODE, TAGLOOP, BUTTON": 65,
  "OTHER WORK": 60,
};
export const DEFAULT_DURATION_SECONDS = 40;

// Define the exact order and names of tasks for horizontal layout
export const ALL_TASKS = [
  "PICKING",
  "GUN",
  "PACKING",
  "PENDING ORDER",
  "SORTING",
  "RETURN",
  "COCOBLU PO",
  "BARCODE, TAGLOOP, BUTTON",
  "OTHER WORK"
];

export const portals = ["AMAZON DF", "COCOBLU PO", "MYNTRA-ANOUK", "MYNTRA-HANUKU", "FLIPKART", "AJIO-BE ACTIVE", "AJIO-HANUKU", "SHOPIFY"];
export const tasks = ["PICKING", "GUN", "PACKING", "PENDING ORDER", "SORTING", "RETURN", "COCOBLU PO", "BARCODE, TAGLOOP, BUTTON", "OTHER WORK"];

export const employees: Employee[] = [
  { id: "1", name: "SAGAR" },
  { id: "2", name: "KIRAN" },
  { id: "3", name: "PRAVEEN" },
  { id: "4", name: "KARAN" },
  { id: "5", name: "LATA" },
  { id: "6", name: "VAISHALI" },
  { id: "7", name: "HITESH" },  
  { id: "8", name: "NIRBHAY" }
];

// Get spreadsheet ID from environment (server-side only)
// This will be used only in server-actions.ts
export const getGoogleSheetId = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: should not be called
    throw new Error('GOOGLE_SHEET_ID should only be accessed on server-side');
  }
  // Server-side: get from environment
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error('GOOGLE_SHEET_ID environment variable is not set');
  }
  return id;
};

// For backward compatibility, export a placeholder
export const GOOGLE_SHEET_ID = '';

// API configuration
export const API_CONFIG = {
  SHEET_FETCH_RANGE: 'A1:ZZ500', // Reduced from 1000 to 500 rows
  ACTIVE_TASK_CACHE_TTL: 5000, // 5 seconds
  REPORT_CACHE_TTL: 30000, // 30 seconds
  AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;
