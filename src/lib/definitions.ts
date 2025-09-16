import { z } from "zod";

export const EmployeeRecordSchema = z.object({
  employeeName: z.string().min(1, { message: "Please select your name." }),
  portalName: z.string().min(1, { message: "Please select a portal." }),
  taskName: z.string().min(3, { message: "Task name must be at least 3 characters." }),
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
});

export type EmployeeRecord = z.infer<typeof EmployeeRecordSchema>;

export type Employee = {
  id: string;
  name: string;
};
