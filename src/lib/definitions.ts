
import { z } from "zod";

// Schema for starting a task (only start time required)
export const StartTaskSchema = z.object({
  employeeName: z.string().min(1, { message: "Please select your name." }),
  portalName: z.string().min(1, { message: "Please select a portal." }),
  taskName: z.string().min(1, { message: "Please select a task." }),
  otherTaskName: z.string().optional(),
  itemQty: z.coerce.number().optional().default(0),
  startTime: z.string().min(1, { message: "Start time is required." }),
  remarks: z.string().optional(),
}).refine((data) => {
  if (data.taskName === "OTHER WORK") {
    return data.otherTaskName && data.otherTaskName.trim().length > 0;
  }
  return true;
}, {
  message: "Please specify the other task.",
  path: ["otherTaskName"],
}).refine((data) => {
  // Item quantity is mandatory for all tasks except "OTHER WORK"
  if (data.taskName !== "OTHER WORK") {
    return data.itemQty && data.itemQty > 0;
  }
  return true;
}, {
  message: "Item quantity is required and must be greater than 0.",
  path: ["itemQty"],
});

// Schema for ending a task (only end time required)
export const EndTaskSchema = z.object({
  employeeName: z.string().min(1, { message: "Employee name is required." }),
  endTime: z.string().min(1, { message: "End time is required." }),
  remarks: z.string().optional(),
});

// Complete record schema (for backward compatibility)
export const EmployeeRecordSchema = z.object({
  employeeName: z.string().min(1, { message: "Please select your name." }),
  portalName: z.string().min(1, { message: "Please select a portal." }),
  taskName: z.string().min(1, { message: "Please select a task." }),
  otherTaskName: z.string().optional(),
  itemQty: z.coerce.number().optional().default(0),
  startTime: z.string().min(1, { message: "Start time is required." }),
  endTime: z.string().min(1, { message: "End time is required." }),
  remarks: z.string().optional(),
}).refine((data) => {
    // only validate if both times are present
    if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
}, {
  message: "End time must be after the start time.",
  path: ["endTime"],
}).refine((data) => {
  if (data.taskName === "OTHER WORK") {
    return data.otherTaskName && data.otherTaskName.trim().length > 0;
  }
  return true;
}, {
  message: "Please specify the other task.",
  path: ["otherTaskName"],
}).refine((data) => {
  // Item quantity is mandatory for all tasks except "OTHER WORK"
  if (data.taskName !== "OTHER WORK") {
    return data.itemQty && data.itemQty > 0;
  }
  return true;
}, {
  message: "Item quantity is required and must be greater than 0.",
  path: ["itemQty"],
});


export type StartTaskRecord = z.infer<typeof StartTaskSchema>;
export type EndTaskRecord = z.infer<typeof EndTaskSchema>;
export type EmployeeRecord = z.infer<typeof EmployeeRecordSchema>;

export type ActiveTask = {
  employeeName: string;
  portalName: string;
  taskName: string;
  otherTaskName?: string;
  itemQty: number;
  startTime: string;
  remarks?: string;
};

export type Employee = {
  id: string;
  name: string;
};
