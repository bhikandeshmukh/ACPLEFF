"use server";

import { headers } from "next/headers";
import { google } from "googleapis";
import { EmployeeRecordSchema, type EmployeeRecord } from "@/lib/definitions";
import "dotenv/config";

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
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const sheetId = process.env.SHEET_ID;
    const projectId = process.env.GOOGLE_PROJECT_ID;

    if (!privateKey || !clientEmail || !sheetId || !projectId) {
      throw new Error("Google Sheets credentials (private key, client email, sheet ID, or project ID) are not configured correctly in .env.local.");
    }
    
    // Construct credentials object
    const credentials = {
      type: "service_account",
      project_id: projectId,
      private_key_id: process.env.GOOGLE_SHEETS_PRIVATE_KEY_ID, // This is optional but good practice
      private_key: privateKey.replace(/\\n/g, "\n"),
      client_email: clientEmail,
      client_id: process.env.GOOGLE_SHEETS_CLIENT_ID, // This is optional
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`
    };

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const range = "Sheet1!A:H";

    const values = [
      [
        recordToSave.timestamp,
        recordToSave.employeeName,
        recordToSave.portalName,
        recordToSave.taskName,
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
