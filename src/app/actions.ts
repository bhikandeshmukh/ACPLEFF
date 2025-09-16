"use server";

import { headers } from "next/headers";
import { EmployeeRecordSchema, type EmployeeRecord } from "@/lib/definitions";

export async function submitRecord(data: EmployeeRecord) {
  const validatedFields = EmployeeRecordSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid data provided.",
      details: validatedFields.error.flatten().fieldErrors,
    };
  }

  const headerList = headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0].trim() || "IP Not Found";
  
  const recordToSave = {
    ...validatedFields.data,
    ipAddress: ip,
    timestamp: new Date().toISOString(),
  };

  try {
    // Here you would typically send the data to Google Sheets
    // For this example, we'll just log it to the console.
    console.log("--- New Record Submitted ---");
    console.log(JSON.stringify(recordToSave, null, 2));
    console.log("--------------------------");

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: "Record submitted successfully!",
      data: recordToSave,
    };
  } catch (error) {
    console.error("Failed to save record:", error);
    return {
      success: false,
      error: "An unexpected error occurred on the server.",
    };
  }
}
