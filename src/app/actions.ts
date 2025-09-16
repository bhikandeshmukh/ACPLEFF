"use server";

import { headers } from "next/headers";
import { google } from "googleapis";
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
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.SHEET_ID;
    const range = "Sheet1!A:H";

    // Ensure the order matches the columns in your Google Sheet
    const values = [
      [
        recordToSave.timestamp,
        recordToSave.employeeName,
        recordToSave.portalName,
        recordToSave.taskName,
        recordToSave.startTime,
        recordToSave.endTime,
        recordToSave.remarks || "", // Ensure optional fields are handled
        recordToSave.ipAddress,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: values,
      },
    });

    return {
      success: true,
      message: "Record submitted successfully to Google Sheets!",
      data: recordToSave,
    };
  } catch (error: any) {
    console.error("Failed to save record to Google Sheets:", error);
    
    // Provide more specific error feedback
    let errorMessage = "An unexpected error occurred while saving to Google Sheets.";
    if (error.message) {
      errorMessage += ` (Details: ${error.message})`;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
