import { z } from "zod";

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
});

export type EmployeeRecord = z.infer<typeof EmployeeRecordSchema>;

export type