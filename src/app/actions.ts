"use server";

import { headers } from "next/headers";
import { google } from "googleapis";
import { format } from "date-fns";
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
    timestamp: format(new Date(), "dd/MM/yyyy hh:mm a"),
  };

  try {
    const sheetId = process.env.SHEET_ID;

    if (!sheetId) {
      throw new Error("SHEET_ID is not configured correctly in .env.local.");
    }
    
    // Construct credentials object directly
    const credentials = {
      type: "service_account",
      project_id: "studio-7650080096-85e78",
      private_key_id: "19909a279428576efe36ad82fb4ed45b65f0b26d",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQChZPvOYvgADfa7\nFIL+fYwOB8ks1ra6yiGbXq+LTLnG2c/Hxa9+Bv/LXHUbtohHlE38EQj8jH3dbxT1\n/Bll6i0ke68x7KNriqJCh44K72+ToeUToRkO6sXECZIoLPeeuDEJA1hAtZKZUBuP\nOL1NOvurEYCVpdZPTz0n007KdPTFslvxiI5s3UmeE4ZvJrg74ATLjeAojjDAyRAr\n44ZKxM+vz6ftZHM3/vHc7rV+s0v3e7SxJIRZfljT1TnGOgzRIIlCFC4+HA0CfT3b\nuIPWVwM+7uw0Z20wpZHvxF0N8kWt5GL/Rfg7DR4G4SBPsCje/yQDn0D/Cwps/WPV\nwzTrCUhXAgMBAAECggEAHEGj3GRzav8G3YYf0RKF/MbcL99/qoBNFfij302VkPz9\nZcp0iSoMirwrPKjefzm11ZXd7ulh9+zEzLRQdglj0eldqO33RpLFCcTV15BIBp7n\njmI8EuKDsWjDkAkfaUhyPVO6lcm0WuctjAuxCN50xWSREKIyPTxwRpK2TrffSuVC\nAhbyDFgS4eRdb2ZmG36DMYeV7qGKP9Nqp8J3uGw/f3wpeJa/6kfvVD0t3CwX+J4f\no+fDYOaHQ26xC2fSTC178UhiZamSrJMXfMnykQFGZWyUhX/XpPaGhC9qqhzdNyH4\nWD3Fyq/77cQBimws6KmHMnHHALQrqxt138Usg50CAQKBgQDRppdWxmrw2WTe3J+X\nGVpPc4zrgZD9ITXIcrRZOnng3y++l6ecAfFCZUPUh17f7AgSOQWjY6c0S1mdv8Bc\nLfuDEcqHjtw9GCGXUbDT+vkg37T542TtxxUIzRMLxuiELG56IRppwkdcluHvieFg\nlf7OYlMZCE1b0EhiJug4ZMAlgQKBgQDFE0bM7cA7AXmdAIa9I0/J9V7PHq3A9RRo\nRYrA1XsVG2t1Y3n8F0/TKWNYs/7JvIMc6b49+9Jot6ZkVYb+gPfz4FEQy870PCgQ\nvmKNkMLg7a9CuYIA7xJawbqrViGOAuJmHmySKklKE9pCKnuTelgcPvjbpf4QcOg2\nIbw8LvhJ1wKBgHcbbyWEiqMUzwLyUtS0OaOj4S63KJk28ehUinObDj0cb3KXlEjE\nrb1r7LJkyhjrbtZzgOmHpynFmT9O/kkgcqDPTcHf/u3StNrUNWLpVfpAPgAuGVwh\nW6jpYWWyds0ItSc7gVcOYh6PNgMx0VJfRSkZoV46YkDEPytMMWhAjQ2BAoGAMckI\n3cRCB6X7vvnfD/DXu0FNTi2F33UKTr0irExB57chkmoq6tBIziNqgYIXH4eL58X0\n1VvEb8fVNQuWKr0R5n4IfKHAClsYFALEitbDJGdnGwgaG3pJvLusGJSNrX51Cy8s\nZlBga2JQhN6OkVca4yfVXke0wxqCzwn+r4V+G8kCgYABN9tTs8GwtfjoECRAVG5I\nRsWkCDyrGN+ZepxlOfvuNqzHEix+o2IuwYK70ggDDCyRkYTMYQI0ecixzhoAT4wz\nkucu4lLr2sJ2cKQ+LjNPgLSqYtujo5fBGoO7AFUVjATTtcxntYbUGYnOkQGI5UYm\njHhyMfNhpWBS7rv6kwRR4Q==\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
      client_email: "firebase-adminsdk-fbsvc@studio-7650080096-85e78.iam.gserviceaccount.com",
      client_id: "112455475972197498656",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40studio-7650080096-85e78.iam.gserviceaccount.com"
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
