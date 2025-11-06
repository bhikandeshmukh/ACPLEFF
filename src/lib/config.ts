import type { Employee } from "@/lib/definitions";

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
