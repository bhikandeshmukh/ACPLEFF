
"use server";

import { headers } from "next/headers";
import { google, sheets_v4 } from "googleapis";
import { format, addSeconds, parse, differenceInSeconds, setHours, setMinutes, setSeconds, eachDayOfInterval, isWithinInterval } from "date-fns";
import { EmployeeRecordSchema, type EmployeeRecord } from "@/lib/definitions";
import { TASK_DURATIONS_SECONDS, DEFAULT_DURATION_SECONDS, ALL_TASKS, employees } from "@/lib/config";

const TASK_COLUMN_WIDTH = 8; // B to I is 8 columns

// Helper function to get Google Sheets API client
async function getSheetsClient() {
  const credentials = {
      type: "service_account",
      project_id: "studio-7650080096-85e78",
      private_key_id: "19909a279428576efe36ad82fb4ed45b65f0b26d",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQChZPvOYvgADfa7\nFIL+fYwOB8ks1ra6yiGbXq+LTLnG2c/Hxa9+Bv/LXHUbtohHlE38EQj8jH3dbxT1\n/Bll6i0ke68x7KNriqJCh44K72+ToeUToRkO6sXECZIoLPeeuDEJA1hAtZKZUBuP\nOL1NOvurEYCVpdZPTz0n007KdPTFslvxiI5s3UmeE4ZvJrg74ATLjeAojjDAyRAr\n44ZKxM+vz6ftZHM3/vHc7rV+s0v3e7SxJIRZfljT1TnGOgzRIIlCFC4+HA0CfT3b\nuIPWVwM+7uw0Z20wpZHvxF0N8kWt5GL/Rfg7DR4G4SBPsCje/yQDn0D/Cwps/WPV\nwzTrCUhXAgMBAAECggEAHEGj3GRzav8G3YYf0RKF/MbcL99/qoBNFfij302VkPz9\nZcp0iSoMirwrPKjefzm11ZXd7ulh9+zEzLRQdglj0eldqO33RpLFCcTV15BIBp7n\nnjI8EuKDsWjDkAkfaUhyPVO6lcm0WuctjAuxCN50xWSREKIyPTxwRpK2TrffSuVC\nAhbyDFgS4eRdb2ZmG36DMYeV7qGKP9Nqp8J3uGw/f3wpeJa/6kfvVD0t3CwX+J4f\no+fDYOaHQ26xC2fSTC178UhiZamSrJMXfMnykQFGZWyUhX/XpPaGhC9qqhzdNyH4\nWD3Fyq/77cQBimws6KmHMnHHALQrqxt138Usg50CAQKBgQDRppdWxmrw2WTe3J+X\nGVpPc4zrgZD9ITXIcrRZOnng3y++l6ecAfFCZUPUh17f7AgSOQWjY6c0S1mdv8Bc\nLfuDEcqHjtw9GCGXUbDT+vkg37T542TtxxUIzRMLxuiELG56IRppwkdcluHvieFg\nlf7OYlMZCE1b0EhiJug4ZMAlgQKBgQDFE0bM7cA7AXmdAIa9I0/J9V7PHq3A9RRo\nRYrA1XsVG2t1Y3n8F0/TKWNYs/7JvIMc6b49+9Jot6ZkVYb+gPfz4FEQy870PCgQ\nvmKNkMLg7a9CuYIA7xJawbqrViGOAuJmHmySKklKE9pCKnuTelgcPvjbpf4QcOg2\nIbw8LvhJ1wKBgHcbbyWEiqMUzwLyUtS0OaOj4S63KJk28ehUinObDj0cb3KXlEjE\nrb1r7LJkyhjrbtZzgOmHpynFmT9O/kkgcqDPTcHf/u3StNrUNWLpVfpAPgAuGVwh\nW6jpYWWyds0ItSc7gVcOYh6PNgMx0VJfRSkZoV46YkDEPytMMWhAjQ2BAoGAMckI\n3cRCB6X7vvnfD/DXu0FNTi2F33UKTr0irExB57chkmoq6tBIziNqgYIXH4eL58X0\n1VvEb8fVNQuWKr0R5n4IfKHAClsYFALEitbDJGdnGwgaG3pJvLusGJSNrX51Cy8s\nZlBga2JQhN6OkVca4yfVXke0wxqCzwn+r4V+G8kCgYABN9tTs8GwtfjoECRAVG5I\nRsWkCDyrGN+ZepxlOfvuNqzHEix+o2IuwYK70ggDDCyRkYTMYQI0ecixzhoAT4wz\nkucu4lLr2sJ2cKQ+LjNPgLSqYtujo5fBGoO7AFUVjATTtcxntYbUGYnOkQGI5UYm\njHhyMfNhpWBS7rv6kwRR4Q==\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
      client_email: "firebase-adminsdk-fbsvc@studio-7650080096-85e78.iam.gserviceaccount.com",
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// Helper to get sheetId from sheetName, required for merge requests
async function getSheetIdByName(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetName: string): Promise<number | null | undefined> {
    try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
        return sheet?.properties?.sheetId;
    } catch (error) {
        console.error(`Error getting sheetId for "${sheetName}":`, error);
        return null;
    }
}

async function setupSheetHeaders(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetName: string) {
    const headerRow1: any[] = ["DATE"];
    const headerRow2: any[] = [""];
    const requests: sheets_v4.Schema$Request[] = [];
    const sheetId = await getSheetIdByName(sheets, spreadsheetId, sheetName);

    if (sheetId === null || sheetId === undefined) {
        throw new Error(`Could not find sheet ID for sheet named "${sheetName}".`);
    }

    // Add merge for Date cell A1:A2
    requests.push({
        mergeCells: {
            range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: 1,
            },
            mergeType: "MERGE_ALL",
        }
    });
    
    // Add center alignment for all columns
    requests.push({
        repeatCell: {
            range: {
                sheetId: sheetId,
                startColumnIndex: 0,
                endColumnIndex: (ALL_TASKS.length * TASK_COLUMN_WIDTH) + 1,
            },
            cell: {
                userEnteredFormat: {
                    horizontalAlignment: "CENTER",
                    verticalAlignment: "MIDDLE"
                }
            },
            fields: "userEnteredFormat(horizontalAlignment,verticalAlignment)"
        }
    });
    
    for (const task of ALL_TASKS) {
        const taskIndex = ALL_TASKS.indexOf(task);
        const startCol = 1 + (taskIndex * TASK_COLUMN_WIDTH);
        headerRow1.push(task, ...Array(TASK_COLUMN_WIDTH - 1).fill(""));
        
        let subHeaders = ["Portal", "No. Of Piece", "Start Time", "Estimated End Time", "Actual End Time", "Chetan Remarks", "Ganesh", "Final Remarks"];
        if (task === "OTHER WORK") {
            subHeaders[0] = "Task Description";
        }
        headerRow2.push(...subHeaders);
        
        // Add merge request for the main task header cell (e.g., B1:I1)
        requests.push({
            mergeCells: {
                range: {
                    sheetId: sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: startCol,
                    endColumnIndex: startCol + TASK_COLUMN_WIDTH,
                },
                mergeType: "MERGE_ALL",
            }
        });

        // Add 12-hour time format for Start Time, Estimated End Time, and Actual End Time columns
        const timeFormatRequest = {
            repeatCell: {
                range: {
                    sheetId: sheetId,
                    startRowIndex: 2, // Apply from 3rd row downwards
                },
                cell: {
                    userEnteredFormat: {
                        numberFormat: {
                            type: "TIME",
                            pattern: "hh:mm AM/PM"
                        }
                    }
                },
                fields: "userEnteredFormat.numberFormat"
            }
        };

        // Start Time Column (e.g., D, L, T, ...) -> index 2 in subheaders
        requests.push(JSON.parse(JSON.stringify({
            ...timeFormatRequest,
            repeatCell: { ...timeFormatRequest.repeatCell, range: { ...timeFormatRequest.repeatCell.range, startColumnIndex: startCol + 2, endColumnIndex: startCol + 3 } }
        })));
        // Estimated End Time Column (e.g., E, M, U, ...) -> index 3 in subheaders
        requests.push(JSON.parse(JSON.stringify({
            ...timeFormatRequest,
            repeatCell: { ...timeFormatRequest.repeatCell, range: { ...timeFormatRequest.repeatCell.range, startColumnIndex: startCol + 3, endColumnIndex: startCol + 4 } }
        })));
        // Actual End Time Column (e.g., F, N, V, ...) -> index 4 in subheaders
        requests.push(JSON.parse(JSON.stringify({
            ...timeFormatRequest,
            repeatCell: { ...timeFormatRequest.repeatCell, range: { ...timeFormatRequest.repeatCell.range, startColumnIndex: startCol + 4, endColumnIndex: startCol + 5 } }
        })));
    }

    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: [
                { range: `${sheetName}!A1`, values: [headerRow1] },
                { range: `${sheetName}!A2`, values: [headerRow2] },
            ]
        }
    });

    if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: requests,
            }
        });
    }
}


export async function submitRecord(data: EmployeeRecord) {
  const validatedFields = EmployeeRecordSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid data provided.",
      details: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const startTime = new Date(validatedFields.data.startTime);
  const taskName = validatedFields.data.taskName;
    
  let estimatedEndTime: Date | null = null;
  if (taskName !== "OTHER WORK") {
    const itemQty = validatedFields.data.itemQty ?? 0;
    const durationPerItem = TASK_DURATIONS_SECONDS[taskName] || DEFAULT_DURATION_SECONDS;
    const durationInSeconds = itemQty > 0 
      ? itemQty * durationPerItem 
      : DEFAULT_DURATION_SECONDS;
    estimatedEndTime = addSeconds(startTime, durationInSeconds);
  }

  const recordToSave = {
    ...validatedFields.data,
    taskName,
    startTime: startTime,
    estimatedEndTime: estimatedEndTime,
  };

  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = "1Y8M1BvMnNN0LxHCoHKTcd3oVBWncWa46JuE8okLEOfg";
    const sheetName = recordToSave.employeeName;

    // 1. Get spreadsheet metadata to check if the sheet exists
    let spreadsheetInfo;
    try {
        spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    } catch (err) {
        console.error("Failed to get spreadsheet details:", err);
        return { success: false, error: "Could not access the spreadsheet." };
    }

    const sheetExists = spreadsheetInfo.data.sheets?.some(s => s.properties?.title === sheetName);

    // 2. If sheet does not exist, create and set it up
    if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{ addSheet: { properties: { title: sheetName } } }]
            }
        });
        await setupSheetHeaders(sheets, spreadsheetId, sheetName);
    }
    
    // 3. Get all rows from the sheet to check for headers and find a row.
    const getSheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    let rows = getSheetResponse.data.values || [];

    // If headers are still not present (e.g., empty pre-existing sheet), set them up.
    if (rows.length < 2 || !rows[0][0] || rows[0][0] !== 'DATE') {
        await setupSheetHeaders(sheets, spreadsheetId, sheetName);
        const updatedSheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
        rows = updatedSheetResponse.data.values || [];
    }

    // 4. Find the column range for the submitted task.
    const taskIndex = ALL_TASKS.indexOf(recordToSave.taskName);

     if (taskIndex === -1) {
         return { success: false, error: `Task "${recordToSave.taskName}" is not configured.` };
     }
    
    const startColIndex = 1 + (taskIndex * TASK_COLUMN_WIDTH);
    
    // 5. Find an appropriate row for the submission.
    const submissionDateStr = format(recordToSave.startTime, 'dd/MM/yyyy');
    
    const dateMatchingRows = rows
      .map((row, index) => ({ row, index }))
      .filter((r, index) => index >= 2 && r.row[0] === submissionDateStr);

    let targetRowIndex = -1;
    let existingRowData: any[] = [];
    
    for (const { row, index } of dateMatchingRows) {
      const portalCell = row[startColIndex];
      if (!portalCell || portalCell.trim() === '') {
        targetRowIndex = index;
        existingRowData = row;
        break;
      }
    }

    if (targetRowIndex === -1) {
      targetRowIndex = rows.length; 
      existingRowData = []; 
    }

    // 6. Prepare the data to be inserted for the specific task block.
    const firstCellData = recordToSave.taskName === "OTHER WORK" 
        ? recordToSave.otherTaskName || '' 
        : recordToSave.portalName || '';

    const taskDataBlock = [
        firstCellData,
        recordToSave.itemQty,
        format(recordToSave.startTime, 'hh:mm a'),
        recordToSave.estimatedEndTime ? format(recordToSave.estimatedEndTime, 'hh:mm a') : '',
        recordToSave.endTime ? format(new Date(recordToSave.endTime), 'hh:mm a') : '',
        recordToSave.remarks || '',
        '', // Ganesh
        ''  // Final Remarks
    ];
    
    // 7. Construct the final row, preserving existing data.
    const finalRow = [...existingRowData];
    if (finalRow.length === 0) {
        finalRow[0] = submissionDateStr;
    }
    
    // Ensure row is long enough
    while (finalRow.length < startColIndex + taskDataBlock.length) {
        finalRow.push('');
    }

    for (let i = 0; i < taskDataBlock.length; i++) {
        finalRow[startColIndex + i] = taskDataBlock[i];
    }

    // 8. Update the sheet with the final row.
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${targetRowIndex + 1}`, // +1 because sheet rows are 1-indexed
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [finalRow],
        }
    });

    return {
      success: true,
      message: `Record submitted successfully to ${sheetName}'s sheet!`,
    };
  } catch (error: any) {
    console.error("Failed to save record to Google Sheets:", error);
    
    let errorMessage = "An unexpected error occurred while saving to Google Sheets.";
    if (error.code === 400 && error.errors?.[0]?.message.includes("Unable to parse range")) {
      errorMessage = `The sheet (tab) named "${recordToSave.employeeName}" does not exist. Please create it first.`;
    } else if (error.response?.data?.error) {
        errorMessage = `Error from Google Sheets: ${error.response.data.error.message}`;
    } else if (error.message) {
      errorMessage = `Error details: ${error.message}`;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export type EmployeeReport = {
    name: string;
    totalWorkTime: number;
    totalItems: number;
    averageRunRate: number;
    tasks: {
      [taskName: string]: {
        quantity: number;
        duration: number;
        runRate: number;
      };
    };
};

type DateRange = {
  from: Date | string;
  to: Date | string;
}

export async function getEmployeeReport(dateRange: DateRange, employeeName: string): Promise<EmployeeReport | null> {
  const sheets = await getSheetsClient();
  const spreadsheetId = "1Y8M1BvMnNN0LxHCoHKTcd3oVBWncWa46JuE8okLEOfg";
  
  // Ensure dates are Date objects
  const interval = { start: new Date(dateRange.from), end: new Date(dateRange.to) };

  try {
    const getSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${employeeName}!A:`, 
    });

    const rows = getSheetResponse.data.values || [];
    if (rows.length < 2) return null;

    const dateMatchingRows = rows.filter((row, index) => {
        if (index < 2 || !row[0]) return false;
        try {
            const rowDate = parse(row[0], 'dd/MM/yyyy', new Date());
            return isWithinInterval(rowDate, interval);
        } catch {
            return false;
        }
    });

    if (dateMatchingRows.length === 0) {
        return null;
    };
    
    const employeeData: EmployeeReport = {
      name: employeeName,
      totalWorkTime: 0,
      totalItems: 0,
      averageRunRate: 0,
      tasks: {},
    };

    for (const row of dateMatchingRows) {
      for (let i = 0; i < ALL_TASKS.length; i++) {
        const taskName = ALL_TASKS[i];
        const startCol = 1 + (i * TASK_COLUMN_WIDTH);
        
        const itemQtyStr = row[startCol + 1];
        const startTimeStr = row[startCol + 2];
        const endTimeStr = row[startCol + 4];
        const dateStr = row[0];

        if (startTimeStr && endTimeStr && itemQtyStr && dateStr) {
           try {
              const baseDate = parse(dateStr, 'dd/MM/yyyy', new Date());
              const startTime = parse(startTimeStr, 'hh:mm a', baseDate);
              const endTime = parse(endTimeStr, 'hh:mm a', baseDate);

              if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
                  let duration = differenceInSeconds(endTime, startTime);
                  // If end time is earlier than start time, it implies next day
                  if (duration < 0) {
                      duration += 24 * 60 * 60; // Add 24 hours in seconds
                  }
                  
                  const quantity = parseInt(itemQtyStr, 10) || 0;

                  if (quantity > 0) {
                    employeeData.totalWorkTime += duration;
                    employeeData.totalItems += quantity;

                    if (!employeeData.tasks[taskName]) {
                        employeeData.tasks[taskName] = { quantity: 0, duration: 0, runRate: 0 };
                    }
                    employeeData.tasks[taskName].quantity += quantity;
                    employeeData.tasks[taskName].duration += duration;
                  }
              }
           } catch(e) {
              console.error(`Could not parse time for ${employeeName}, task ${taskName}:`, e);
           }
        }
      }
    }

    // Calculate run rates
    for (const taskName in employeeData.tasks) {
      const task = employeeData.tasks[taskName];
      if (task.quantity > 0) {
        task.runRate = task.duration / task.quantity;
      } else {
          task.runRate = 0;
      }
    }

    if (employeeData.totalItems > 0) {
        employeeData.averageRunRate = employeeData.totalWorkTime / employeeData.totalItems;
    }
    
    if(employeeData.totalItems > 0) {
      return employeeData;
    }

    return null;

  } catch (error: any) {
    if (error.code !== 400) { // Ignore "Unable to parse range" errors for non-existent sheets
        console.error(`Error processing sheet for ${employeeName}:`, error.message);
    }
    return null;
  }
}

    
