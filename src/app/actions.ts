"use server";

import { headers } from "next/headers";
import { google } from "googleapis";
import { format } from "date-fns";
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
  
  const now = new Date();
  const utcOffset = now.getTimezoneOffset() * 60000;
  const istOffset = 330 * 60000; // 5 hours and 30 minutes
  const istDate = new Date(now.getTime() + utcOffset + istOffset);

  const recordToSave = {
    ...validatedFields.data,
    ipAddress: ip,
    timestamp: format(istDate, "dd/MM/yyyy hh:mm a"),
    startTime: format(new Date(validatedFields.data.startTime), "dd/MM/yy hh:mm a"),
    endTime: format(new Date(validatedFields.data.endTime), "dd/MM/yy hh:mm a"),
  };

  try {
    const sheetId = process.env.GOOGLE_SHEET_ID || "1Y8M1BvMnNN0LxHCoHKTcd3oVBWncWa46JuE8okLEOfg";
    
    // Construct credentials object from environment variables
    const credentials = {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL?.replace('@', '%40')}`
    };

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const range = "Sheet1!A:I";
    const headerRange = "Sheet1!A1:I1";

    const headerRow = [
      "Timestamp",
      "Employee Name",
      "Portal Name",
      "Task Name",
      "Item Qty",
      "Start Time",
      "End Time",
      "Remarks",
      "IP Address",
    ];

    // Check for headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: headerRange,
    });

    const currentHeaders = headerResponse.data.values?.[0] || [];
    const headersAreMissing = headerRow.some((header, i) => header !== currentHeaders[i]);

    if (headersAreMissing) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: headerRange,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headerRow],
        },
      });
    }

    const values = [
      [
        recordToSave.timestamp,
        recordToSave.employeeName,
        recordToSave.portalName,
        recordToSave.taskName,
        recordToSave.itemQty,
        recordToSave.startTime,
        recordToSave.endTime,
        recordToSave.remarks || "",
        recordToSave.ipAddress,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
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
