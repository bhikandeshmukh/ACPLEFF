import type { Employee } from "@/lib/definitions";

// Validate required environment variables (server-side only)
if (typeof window === 'undefined') {
  const requiredEnvVars = ['GOOGLE_PROJECT_ID', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CLIENT_EMAIL'];
  const missingEnvVars = requiredEnvVars.filter(envVar => {
    const env = process as any;
    return !env.env?.[envVar];
  });

  if (missingEnvVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingEnvVars.join(', ')}`);
  }
}

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

// Get spreadsheet ID from environment, with validation
export const GOOGLE_SHEET_ID = (() => {
  if (typeof window !== 'undefined') {
    // Client-side: return placeholder, actual value from server
    const env = process as any;
    return env.env?.NEXT_PUBLIC_GOOGLE_SHEET_ID || '';
  }
  // Server-side: get from environment
  const env = process as any;
  const id = env.env?.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error('GOOGLE_SHEET_ID environment variable is not set');
  }
  return id;
})();

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
