<<<<<<< HEAD

=======
>>>>>>> 1ffd1ce4f519a45920aebc1e7b8500617778dd05
import { z } from "zod";

export const EmployeeRecordSchema = z.object({
  employeeName: z.string().min(1, { message: "Please select your name." }),
  portalName: z.string().min(1, { message: "Please select a portal." }),
<<<<<<< HEAD
  taskName: z.string().min(1, { message: "Please select a task." }),
  otherTaskName: z.string().optional(),
=======
  taskName: z.string().min(3, { message: "Task name must be at least 3 characters." }),
>>>>>>> 1ffd1ce4f519a45920aebc1e7b8500617778dd05
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
<<<<<<< HEAD
}).refine((data) => {
  if (data.taskName === "OTHER WORK") {
    return data.otherTaskName && data.otherTaskName.trim().length > 0;
  }
  return true;
}, {
  message: "Please specify the other task.",
  path: ["otherTaskName"],
});


=======
});

>>>>>>> 1ffd1ce4f519a45920aebc1e7b8500617778dd05
export type EmployeeRecord = z.infer<typeof EmployeeRecordSchema>;

export type Employee = {
  id: string;
  name: string;
};
