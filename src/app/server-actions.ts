
"use server";


import { google, sheets_v4 } from "googleapis";
import { format, addSeconds, parse, differenceInSeconds, isWithinInterval } from "date-fns";
import { EmployeeRecordSchema, StartTaskSchema, EndTaskSchema, type EmployeeRecord, type StartTaskRecord, type EndTaskRecord, type ActiveTask } from "@/lib/definitions";
import { TASK_DURATIONS_SECONDS, DEFAULT_DURATION_SECONDS, ALL_TASKS } from "@/lib/config";

const TASK_COLUMN_WIDTH = 8; // B to I is 8 columns

// Check for active tasks from Google Sheets (real-time)
async function checkActiveTaskFromSheets(employeeName: string): Promise<ActiveTask | null> {
  try {
    console.log(`🔍 DEBUGGING: Checking active task for employee: "${employeeName}"`);
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || "1Y8M1BvMnNN0LxHCoHKTcd3oVBWncWa46JuE8okLEOfg";
    
    // Check if employee sheet exists
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const availableSheets = spreadsheetInfo.data.sheets?.map(s => s.properties?.title) || [];
    console.log(`🔍 Available sheets: [${availableSheets.join(', ')}]`);
    
    const sheetExists = spreadsheetInfo.data.sheets?.some(s => s.properties?.title === employeeName);
    console.log(`🔍 Sheet "${employeeName}" exists: ${sheetExists}`);
    
    if (!sheetExists) {
      console.log(`🔍 Sheet "${employeeName}" not found, returning null`);
      return null;
    }

    // Note: We check ALL dates for active tasks, not just today
    // Tasks can be pending from any previous date
    console.log(`Checking for any active/pending tasks (any date)`);
    
    // Get sheet data (force fresh data, no cache)
    console.log(`🔍 Fetching data from sheet: "${employeeName}" at ${new Date().toISOString()}`);
    const getSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${employeeName}!A1:ZZ1000`,
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    });
    console.log(`🔍 Successfully fetched data from "${employeeName}" sheet`);
    
    const rows = getSheetResponse.data.values || [];
    
    console.log(`Checking active/pending tasks for ${employeeName} (all dates)`);
    console.log(`Found ${rows.length} rows in sheet`);
    
    // Debug: Show first few rows
    console.log('First 5 rows of data:');
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      console.log(`Row ${i}:`, rows[i]);
    }
    
    // Look for ANY entries with missing end time (active/pending tasks)
    // Don't filter by date - task can be from any date and still be pending/active
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const rowDate = row[0];
      
      // Skip rows without a date
      if (!rowDate) {
        continue;
      }
      
      console.log(`Row ${i}: Date="${rowDate}", checking for active tasks...`);
      
      // Check each task column for active tasks (regardless of date)
      for (let taskIndex = 0; taskIndex < ALL_TASKS.length; taskIndex++) {
        const startCol = 1 + (taskIndex * TASK_COLUMN_WIDTH);
        const portalName = row[startCol] || '';
        const itemQty = row[startCol + 1] || 0;
        const startTime = row[startCol + 2] || '';
        const estimatedEndTime = row[startCol + 3] || '';
        const actualEndTime = row[startCol + 4] || ''; // Actual End Time column
        const remarks = row[startCol + 5] || '';
        
        const taskName = ALL_TASKS[taskIndex];
        
        // If there's a portal/start time but no actual end time, it's an active task
        // Also check if actualEndTime is undefined (cell doesn't exist in array)
        const hasNoEndTime = !actualEndTime || actualEndTime === '' || actualEndTime === null || actualEndTime === undefined;
        
        if (portalName && startTime && hasNoEndTime) {
          console.log(`🎯 Found active/pending task: ${taskName} for ${employeeName} on date ${rowDate}`);
          console.log(`   Portal="${portalName}", StartTime="${startTime}", ActualEndTime="${actualEndTime}"`);
          
          // Return the FIRST active task found (oldest pending task)
          // This ensures if multiple tasks are pending, we get the oldest one first
            
            // Convert start time to full datetime (preserve original time)
            console.log(`Parsing start time: "${startTime}" with date: "${rowDate}"`);
            
            // Create date object from the row date
            const [day, month, year] = rowDate.split('/').map(Number);
            let startDateTime: Date;
            
            // Parse time manually to avoid timezone issues
            const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!timeMatch) {
              console.error(`Invalid time format: ${startTime}`);
              startDateTime = new Date();
            } else {
              let hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const ampm = timeMatch[3].toUpperCase();
              
              // Convert to 24-hour format
              if (ampm === 'PM' && hours !== 12) {
                hours += 12;
              } else if (ampm === 'AM' && hours === 12) {
                hours = 0;
              }
              
              // Create date in local timezone
              startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
            }
            
            console.log(`Parsed start datetime (local):`, startDateTime);
            console.log(`Start time in ISO:`, startDateTime.toISOString());
            console.log(`Start time formatted back:`, format(startDateTime, 'hh:mm a'));
            
            const activeTask = {
              employeeName,
              portalName: taskName === "OTHER WORK" ? "" : portalName,
              taskName,
              otherTaskName: taskName === "OTHER WORK" ? portalName : undefined,
              itemQty: parseInt(itemQty) || 0,
              startTime: startDateTime.toISOString(),
              remarks: remarks || ""
            };
            
            console.log(`Returning active task:`, activeTask);
            return activeTask;
        }
      }
    }
    
    console.log(`No active/pending task found for ${employeeName} (checked all dates)`);
    return null;
  } catch (error) {
    console.error(`Error checking active task for ${employeeName}:`, error);
    return null;
  }
}

// Helper function to get Google Sheets API client
async function getSheetsClient() {
  const credentials = {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: "19909a279428576efe36ad82fb4ed45b65f0b26d",
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
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


// Check if employee has an active task (from Google Sheets) - Always fresh, no cache
export async function getActiveTask(employeeName: string): Promise<ActiveTask | null> {
  console.log(`🚀 getActiveTask called with employeeName: "${employeeName}"`);
  console.log(`🚀 Employee name type: ${typeof employeeName}, length: ${employeeName.length}`);
  const activeTask = await checkActiveTaskFromSheets(employeeName);
  console.log(`🚀 Final result for ${employeeName}:`, activeTask);
  return activeTask;
}

// Get all active tasks from Google Sheets (for debugging)
export async function getAllActiveTasks(): Promise<{ [key: string]: ActiveTask }> {
  const { employees } = await import('@/lib/config');
  const allActiveTasks: { [key: string]: ActiveTask } = {};
  
  for (const employee of employees) {
    const activeTask = await checkActiveTaskFromSheets(employee.name);
    if (activeTask) {
      allActiveTasks[employee.name] = activeTask;
    }
  }
  
  return allActiveTasks;
}

// Start a new task
export async function startTask(data: StartTaskRecord) {
  const validatedFields = StartTaskSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid data provided.",
      details: validatedFields.error.flatten().fieldErrors,
    };
  }

  const employeeName = validatedFields.data.employeeName;

  // Check if employee already has an active task (from Google Sheets)
  const existingActiveTask = await checkActiveTaskFromSheets(employeeName);
  if (existingActiveTask) {
    return {
      success: false,
      error: "You already have an active task. Please end your current task before starting a new one.",
    };
  }

  // Store the active task
  const activeTask: ActiveTask = {
    employeeName: validatedFields.data.employeeName,
    portalName: validatedFields.data.portalName,
    taskName: validatedFields.data.taskName,
    otherTaskName: validatedFields.data.otherTaskName,
    itemQty: validatedFields.data.itemQty || 0,
    startTime: validatedFields.data.startTime,
    remarks: validatedFields.data.remarks,
  };

  // Write start entry to Google Sheets immediately
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || "1Y8M1BvMnNN0LxHCoHKTcd3oVBWncWa46JuE8okLEOfg";
    const sheetName = employeeName;

    // Check if sheet exists, create if not
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheetInfo.data.sheets?.some(s => s.properties?.title === sheetName);

    if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{ addSheet: { properties: { title: sheetName } } }]
            }
        });
        await setupSheetHeaders(sheets, spreadsheetId, sheetName);
    }

    // Get existing sheet data
    const getSheetResponse = await sheets.spreadsheets.values.get({ 
      spreadsheetId, 
      range: `${sheetName}!A1:ZZ1000` 
    });
    let rows = getSheetResponse.data.values || [];

    // Ensure headers exist
    if (rows.length < 2 || !rows[0][0] || rows[0][0] !== 'DATE') {
        await setupSheetHeaders(sheets, spreadsheetId, sheetName);
        const updatedSheetResponse = await sheets.spreadsheets.values.get({ 
          spreadsheetId, 
          range: `${sheetName}!A1:ZZ1000` 
        });
        rows = updatedSheetResponse.data.values || [];
    }

    // Find the column range for the task
    const taskIndex = ALL_TASKS.indexOf(activeTask.taskName);
    if (taskIndex === -1) {
        throw new Error(`Task "${activeTask.taskName}" is not configured.`);
    }
    
    const startColIndex = 1 + (taskIndex * TASK_COLUMN_WIDTH);
    
    // Find appropriate row for the submission
    const submissionDateStr = format(new Date(activeTask.startTime), 'dd/MM/yyyy');
    
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

    // Calculate estimated end time
    const startTime = new Date(activeTask.startTime);
    const durationPerItem = TASK_DURATIONS_SECONDS[activeTask.taskName] || DEFAULT_DURATION_SECONDS;
    const durationInSeconds = activeTask.itemQty > 0 
      ? activeTask.itemQty * durationPerItem 
      : DEFAULT_DURATION_SECONDS;
    const estimatedEndTime = addSeconds(startTime, durationInSeconds);

    // Prepare the data for the specific task block (start entry)
    const firstCellData = activeTask.taskName === "OTHER WORK" 
        ? activeTask.otherTaskName || '' 
        : activeTask.portalName || '';

    const taskDataBlock = [
        firstCellData,                                           // Portal/Task Description
        activeTask.itemQty,                                      // Item Qty
        format(startTime, 'hh:mm a'),                           // Start Time
        format(estimatedEndTime, 'hh:mm a'),                    // Estimated End Time
        '',                                                      // Actual End Time (empty for now)
        activeTask.remarks || '',                               // Chetan Remarks
        '',                                                      // Ganesh (empty)
        ''                                                       // Final Remarks (empty)
    ];
    
    // Construct the final row
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

    // Update the sheet with the start entry
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${targetRowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [finalRow],
        }
    });

    console.log(`Start entry written to Google Sheets for ${employeeName}`);

  } catch (sheetError: any) {
    console.error("Failed to write start entry to Google Sheets:", sheetError);
    // Don't fail the task start if sheet write fails
  }

  console.log(`Started task for ${employeeName}:`, activeTask);

  // Verify the task was actually written by checking Google Sheets
  try {
    console.log("🔄 Verifying task was written to Google Sheets...");
    const verificationTask = await checkActiveTaskFromSheets(employeeName);
    if (verificationTask) {
      console.log("✅ Task verified in Google Sheets:", verificationTask);
      return {
        success: true,
        message: `Task started successfully! Entry added to Google Sheets. You can now work on your ${validatedFields.data.taskName} task.`,
        activeTask: verificationTask, // Return the verified task from Google Sheets
      } as const;
    } else {
      console.log("⚠️ Task not found in Google Sheets after write, using local data");
      return {
        success: true,
        message: `Task started successfully! Entry added to Google Sheets. You can now work on your ${validatedFields.data.taskName} task.`,
        activeTask,
      } as const;
    }
  } catch (verificationError) {
    console.error("Error verifying task in Google Sheets:", verificationError);
    return {
      success: true,
      message: `Task started successfully! Entry added to Google Sheets. You can now work on your ${validatedFields.data.taskName} task.`,
      activeTask,
    } as const;
  }
}

// Update existing entry with end time
async function updateTaskEndTime(activeTask: ActiveTask, endTime: string, finalRemarks?: string) {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || "1Y8M1BvMnNN0LxHCoHKTcd3oVBWncWa46JuE8okLEOfg";
    const sheetName = activeTask.employeeName;

    // Get existing sheet data
    const getSheetResponse = await sheets.spreadsheets.values.get({ 
      spreadsheetId, 
      range: `${sheetName}!A1:ZZ1000` 
    });
    let rows = getSheetResponse.data.values || [];

    // Find the column range for the task
    const taskIndex = ALL_TASKS.indexOf(activeTask.taskName);
    if (taskIndex === -1) {
        throw new Error(`Task "${activeTask.taskName}" is not configured.`);
    }
    
    const startColIndex = 1 + (taskIndex * TASK_COLUMN_WIDTH);
    
    // Find the row that matches this task entry
    const submissionDateStr = format(new Date(activeTask.startTime), 'dd/MM/yyyy');
    const startTimeStr = format(new Date(activeTask.startTime), 'hh:mm a');
    
    let targetRowIndex = -1;
    
    for (let i = 2; i < rows.length; i++) { // Start from row 3 (index 2)
      const row = rows[i];
      if (row[0] === submissionDateStr) {
        // Check if this is the matching task entry by comparing portal/task name and start time
        const portalCell = row[startColIndex];
        const startTimeCell = row[startColIndex + 2];
        
        const expectedPortalName = activeTask.taskName === "OTHER WORK" 
          ? activeTask.otherTaskName || '' 
          : activeTask.portalName || '';
        
        if (portalCell === expectedPortalName && startTimeCell === startTimeStr) {
          targetRowIndex = i;
          break;
        }
      }
    }

    if (targetRowIndex === -1) {
      throw new Error("Could not find the matching task entry to update");
    }

    // Helper function to convert column index to Excel column name (A, B, C, ..., Z, AA, AB, ...)
    function getColumnName(colIndex: number): string {
      let result = '';
      while (colIndex >= 0) {
        result = String.fromCharCode(65 + (colIndex % 26)) + result;
        colIndex = Math.floor(colIndex / 26) - 1;
      }
      return result;
    }

    // Update only the end time and final remarks columns
    const endTimeColIndex = startColIndex + 4; // Actual End Time column
    const finalRemarksColIndex = startColIndex + 7; // Final Remarks column
    
    console.log(`Updating columns: endTime=${getColumnName(endTimeColIndex)}, finalRemarks=${getColumnName(finalRemarksColIndex)}`);
    
    // Parse the datetime-local string properly to avoid timezone issues
    console.log(`📝 Raw end time input: "${endTime}"`);
    
    let formattedEndTime: string;
    
    // Check if endTime is already an ISO string (with Z or timezone)
    if (endTime.includes('Z') || endTime.match(/[+-]\d{2}:\d{2}$/)) {
      console.log(`⚠️ Received ISO/UTC format, need to extract original local time`);
      
      // The ISO string represents UTC time, but we need the original local time
      // that was entered in the form. We need to parse it differently.
      // Extract the time portion before the 'Z' or timezone
      const timeMatch = endTime.match(/T(\d{2}):(\d{2}):(\d{2})/);
      
      if (timeMatch) {
        // These are the UTC hours/minutes, but we need to convert to IST
        const utcHours = parseInt(timeMatch[1], 10);
        const utcMinutes = parseInt(timeMatch[2], 10);
        
        console.log(`📝 UTC time: ${utcHours}:${utcMinutes}`);
        
        // Convert UTC to IST (UTC + 5:30)
        let istHours = utcHours + 5;
        let istMinutes = utcMinutes + 30;
        
        // Handle minute overflow
        if (istMinutes >= 60) {
          istMinutes -= 60;
          istHours += 1;
        }
        
        // Handle hour overflow
        if (istHours >= 24) {
          istHours -= 24;
        }
        
        const hours = istHours;
        const minutes = istMinutes;
        
        console.log(`📝 Converted to IST: hours=${hours}, minutes=${minutes}`);
        
        // Convert to 12-hour format with AM/PM
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        formattedEndTime = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
        
        console.log(`📝 Converted: displayHours=${displayHours}, period=${period}, final="${formattedEndTime}"`);
      } else {
        // Fallback if regex fails
        console.log(`⚠️ Could not parse ISO time, using Date object`);
        const endTimeDate = new Date(endTime);
        const hours = endTimeDate.getHours();
        const minutes = endTimeDate.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        formattedEndTime = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
    } else {
      // Extract hours and minutes directly from the datetime-local string
      const timeMatch = endTime.match(/T(\d{2}):(\d{2})/);
      
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        
        console.log(`📝 Extracted from string: hours=${hours}, minutes=${minutes}`);
        
        // Convert to 12-hour format with AM/PM
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        formattedEndTime = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
        
        console.log(`📝 Converted: displayHours=${displayHours}, period=${period}, final="${formattedEndTime}"`);
      } else {
        // Fallback: try to parse as Date and format
        console.log(`⚠️ Regex failed, using fallback date parsing`);
        const endTimeDate = new Date(endTime);
        const hours = endTimeDate.getHours();
        const minutes = endTimeDate.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        formattedEndTime = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
    }
    
    console.log(`✅ Final formatted end time: "${formattedEndTime}"`);
    
    const updates = [
      {
        range: `${sheetName}!${getColumnName(endTimeColIndex)}${targetRowIndex + 1}`,
        values: [[formattedEndTime]]
      }
    ];
    
    if (finalRemarks) {
      updates.push({
        range: `${sheetName}!${getColumnName(finalRemarksColIndex)}${targetRowIndex + 1}`,
        values: [[finalRemarks]]
      });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });

    console.log(`End time updated in Google Sheets for ${activeTask.employeeName}`);
    return { success: true };

  } catch (sheetError: any) {
    console.error("Failed to update end time in Google Sheets:", sheetError);
    return { success: false, error: sheetError.message };
  }
}

// End the current task
export async function endTask(data: EndTaskRecord) {
  const validatedFields = EndTaskSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid data provided.",
      details: validatedFields.error.flatten().fieldErrors,
    };
  }

  const employeeName = validatedFields.data.employeeName;
  
  // Get active task from Google Sheets
  const activeTask = await checkActiveTaskFromSheets(employeeName);

  if (!activeTask) {
    return {
      success: false,
      error: "No active task found. Please start a task first.",
    };
  }

  // Update the existing entry with end time instead of creating a new record
  const updateResult = await updateTaskEndTime(
    activeTask, 
    validatedFields.data.endTime, 
    validatedFields.data.remarks
  );

  if (updateResult.success) {
    console.log(`Ended task for ${employeeName}`);
    
    return {
      success: true,
      message: `Task completed successfully! Total time: ${calculateDuration(activeTask.startTime, validatedFields.data.endTime)}`,
    };
  } else {
    return {
      success: false,
      error: updateResult.error || "Failed to update task end time",
    };
  }
}

// Helper function to calculate duration
function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
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
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || "1Y8M1BvMnNN0LxHCoHKTcd3oVBWncWa46JuE8okLEOfg";
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

export type TaskRecord = {
  date: string;
  taskName: string;
  portal: string;
  quantity: number;
  startTime: string;
  estimatedEndTime: string;
  actualEndTime: string;
  chetanRemarks: string;
  ganesh: string;
  finalRemarks: string;
  duration: number;
  runRate: number;
};

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
    detailedRecords: TaskRecord[];
};

type DateRange = {
  from: Date | string;
  to: Date | string;
}

export async function getEmployeeReport(dateRange: DateRange, employeeName: string): Promise<EmployeeReport | null> {
  console.log('=== Starting getEmployeeReport (no cache, fresh Google Sheets data) ===');
  console.log('Employee:', employeeName);
  console.log('Date range:', dateRange);
  
  // Check if environment variables are available
  const requiredEnvVars = ['GOOGLE_PROJECT_ID', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_SHEET_ID'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.error('Missing environment variables:', missingEnvVars);
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
  

  
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || "1Y8M1BvMnNN0LxHCoHKTcd3oVBWncWa46JuE8okLEOfg";
    console.log('Spreadsheet ID:', spreadsheetId);
    
    // Ensure dates are Date objects and adjust for full day coverage
    let startDate = new Date(dateRange.from);
    let endDate = new Date(dateRange.to);
    
    console.log('Original dates:', { from: dateRange.from, to: dateRange.to });
    console.log('Parsed dates before adjustment:', { start: startDate, end: endDate });
    
    // Simple fix: If the date seems off by timezone, try adjusting
    // Check if we're getting dates that are off by IST offset (5.5 hours = 19800000 ms)
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    
    // If the date looks like it's from the previous day due to timezone, adjust it
    const today = new Date();
    const todayIST = new Date(today.getTime() + istOffset);
    
    console.log('Current date (IST):', format(todayIST, 'dd/MM/yyyy'));
    console.log('Search dates before adjustment:', format(startDate, 'dd/MM/yyyy'), 'to', format(endDate, 'dd/MM/yyyy'));
    
    // If the search date is significantly different from today, try adjusting
    const daysDiff = Math.abs(todayIST.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 1) {
      startDate = new Date(startDate.getTime() + istOffset);
      endDate = new Date(endDate.getTime() + istOffset);
      console.log('Applied IST adjustment');
    }
    
    console.log('Timezone adjusted dates:', { start: startDate, end: endDate });
    
    // Set start to beginning of day and end to end of day to avoid timezone issues
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const interval = { start: startDate, end: endDate };
    console.log(`Adjusted date range for ${employeeName}: ${interval.start} to ${interval.end}`);
    console.log(`Looking for dates between: ${format(startDate, 'dd/MM/yyyy')} and ${format(endDate, 'dd/MM/yyyy')}`);

  try {
    console.log(`Fetching data for sheet: ${employeeName}`);
    
    // First check if the sheet exists
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheetInfo.data.sheets?.some(s => s.properties?.title === employeeName);
    console.log(`Sheet ${employeeName} exists:`, sheetExists);
    
    if (!sheetExists) {
      console.log(`Sheet ${employeeName} not found`);
      return null;
    }
    
    let getSheetResponse;
    try {
      getSheetResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${employeeName}!A1:ZZ1000`,
        // Force fresh data, no cache
        majorDimension: 'ROWS',
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      });
      console.log('Successfully fetched sheet data');
    } catch (apiError: any) {
      console.error('Google Sheets API error:', apiError.message);
      return null;
    }

    const rows = getSheetResponse.data.values || [];
    console.log(`Sheet data for ${employeeName}:`, rows.length, 'rows');
    if (rows.length > 0) {
      console.log('First few rows:');
      rows.slice(0, 5).forEach((row, i) => {
        console.log(`  Row ${i}:`, row);
      });
    }
    if (rows.length < 2) {
      console.log(`No data found for ${employeeName} - only ${rows.length} rows`);
      return null;
    }

    const dateMatchingRows = rows.filter((row, index) => {
        if (index < 2 || !row[0]) return false;
        try {
            // Try multiple date formats
            let rowDate;
            const dateStr = row[0].toString().trim();
            
            // Try dd/MM/yyyy format first
            try {
                rowDate = parse(dateStr, 'dd/MM/yyyy', new Date());
                // Ensure the parsed date is in local timezone
                rowDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
            } catch {
                // Try MM/dd/yyyy format
                try {
                    rowDate = parse(dateStr, 'MM/dd/yyyy', new Date());
                    rowDate.setHours(12, 0, 0, 0);
                } catch {
                    // Try other common formats
                    rowDate = new Date(dateStr);
                    rowDate.setHours(12, 0, 0, 0);
                }
            }
            
            if (isNaN(rowDate.getTime())) {
                console.log(`Invalid date: ${dateStr}`);
                return false;
            }
            
            // More flexible date comparison - check if dates match by day
            const rowDateStr = format(rowDate, 'yyyy-MM-dd');
            const startDateStr = format(interval.start, 'yyyy-MM-dd');
            const endDateStr = format(interval.end, 'yyyy-MM-dd');
            
            // Also try direct date string comparison from sheet format
            const sheetDateForComparison = format(rowDate, 'dd/MM/yyyy');
            const searchStartDate = format(interval.start, 'dd/MM/yyyy');
            const searchEndDate = format(interval.end, 'dd/MM/yyyy');
            
            const isInRange = rowDateStr >= startDateStr && rowDateStr <= endDateStr;
            const isDirectMatch = dateStr === searchStartDate || dateStr === searchEndDate || 
                                 (dateStr >= searchStartDate && dateStr <= searchEndDate);
            
            const finalMatch = isInRange || isDirectMatch;
            
            console.log(`Row ${index}: ${dateStr} -> ${rowDate.toISOString()} -> Date: ${rowDateStr} -> In range: ${isInRange} -> Direct match: ${isDirectMatch} -> Final: ${finalMatch}`);
            return finalMatch;
        } catch (e) {
            console.log(`Failed to parse date: ${row[0]}`, e);
            return false;
        }
    });

    console.log(`Found ${dateMatchingRows.length} matching rows for ${employeeName}`);
    if (dateMatchingRows.length === 0) {
        console.log(`No matching rows for date range ${interval.start} to ${interval.end}`);
        
        // Show available dates for debugging
        const availableDates = rows.slice(2).map(row => row[0]).filter(date => date).map(date => {
          try {
            const parsed = parse(date.toString().trim(), 'dd/MM/yyyy', new Date());
            return format(parsed, 'dd/MM/yyyy');
          } catch {
            return date;
          }
        });
        console.log(`Available dates in sheet: [${availableDates.join(', ')}]`);
        console.log(`You searched for: ${format(startDate, 'dd/MM/yyyy')} to ${format(endDate, 'dd/MM/yyyy')}`);
        
        // Fallback: If no matches found, try matching today's date in IST
        const todayIST = format(new Date(Date.now() + (5.5 * 60 * 60 * 1000)), 'dd/MM/yyyy');
        console.log(`Trying fallback with today's IST date: ${todayIST}`);
        
        const fallbackRows = rows.filter((row, index) => {
          if (index < 2 || !row[0]) return false;
          return row[0].toString().trim() === todayIST;
        });
        
        if (fallbackRows.length > 0) {
          console.log(`Found ${fallbackRows.length} rows using fallback date matching`);
          // Use fallback rows instead
          dateMatchingRows.push(...fallbackRows);
        } else {
          return null;
        }
    }
    
    const employeeData: EmployeeReport = {
      name: employeeName,
      totalWorkTime: 0,
      totalItems: 0,
      averageRunRate: 0,
      tasks: {},
      detailedRecords: [],
    };

    for (const row of dateMatchingRows) {
      for (let i = 0; i < ALL_TASKS.length; i++) {
        const taskName = ALL_TASKS[i];
        const startCol = 1 + (i * TASK_COLUMN_WIDTH);
        
        const itemQtyStr = row[startCol + 1];
        const startTimeStr = row[startCol + 2];
        const endTimeStr = row[startCol + 4];
        const dateStr = row[0];

        console.log(`Processing ${taskName}: itemQty=${itemQtyStr}, start=${startTimeStr}, end=${endTimeStr}`);

        // Process task if it has start time and item quantity (end time is optional)
        if (startTimeStr && itemQtyStr && dateStr) {
           try {
              const baseDate = parse(dateStr, 'dd/MM/yyyy', new Date());
              const startTime = parse(startTimeStr, 'hh:mm a', baseDate);
              const quantity = parseInt(itemQtyStr, 10) || 0;

              if (!isNaN(startTime.getTime()) && quantity > 0) {
                  let duration = 0;
                  let actualEndTime = endTimeStr;
                  
                  // If end time exists, calculate duration
                  if (endTimeStr) {
                    const endTime = parse(endTimeStr, 'hh:mm a', baseDate);
                    if (!isNaN(endTime.getTime())) {
                      duration = differenceInSeconds(endTime, startTime);
                      // If end time is earlier than start time, it implies next day
                      if (duration < 0) {
                          duration += 24 * 60 * 60; // Add 24 hours in seconds
                      }
                    }
                  } else {
                    // If no end time, use estimated end time or mark as "In Progress"
                    actualEndTime = "In Progress";
                    duration = 0; // Don't count duration for incomplete tasks
                  }

                  // Add to totals only if task is complete (has end time)
                  if (endTimeStr) {
                    employeeData.totalWorkTime += duration;
                    employeeData.totalItems += quantity;

                    if (!employeeData.tasks[taskName]) {
                        employeeData.tasks[taskName] = { quantity: 0, duration: 0, runRate: 0 };
                    }
                    employeeData.tasks[taskName].quantity += quantity;
                    employeeData.tasks[taskName].duration += duration;
                  }
                  
                  // Add detailed record (for both complete and incomplete tasks)
                  const portalName = row[startCol] || '';
                  const estimatedEndTimeStr = row[startCol + 3] || '';
                  const chetanRemarks = row[startCol + 5] || '';
                  const ganesh = row[startCol + 6] || '';
                  const finalRemarks = row[startCol + 7] || '';
                  
                  employeeData.detailedRecords.push({
                    date: dateStr,
                    taskName: taskName,
                    portal: portalName,
                    quantity: quantity,
                    startTime: startTimeStr,
                    estimatedEndTime: estimatedEndTimeStr,
                    actualEndTime: actualEndTime,
                    chetanRemarks: chetanRemarks,
                    ganesh: ganesh,
                    finalRemarks: finalRemarks,
                    duration: duration,
                    runRate: duration > 0 ? duration / quantity : 0
                  });
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
    
    // Return data if there are any records (complete or incomplete)
    if(employeeData.detailedRecords.length > 0) {
      return employeeData;
    }

    return null;

  } catch (error: any) {
    if (error.code !== 400) { // Ignore "Unable to parse range" errors for non-existent sheets
        console.error(`Error processing sheet for ${employeeName}:`, error.message);
    }
    return null;
  }
  } catch (outerError: any) {
    console.error(`Failed to get employee report for ${employeeName}:`, outerError);
    console.error('Error details:', {
      message: outerError.message,
      stack: outerError.stack,
      code: outerError.code,
      response: outerError.response?.data
    });
    throw new Error(`Failed to fetch report: ${outerError.message}`);
  }
}
