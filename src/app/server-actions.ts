"use server";

import { google, sheets_v4 } from "googleapis";
import { format, addSeconds, parse, differenceInSeconds } from "date-fns";
import { EmployeeRecordSchema, StartTaskSchema, EndTaskSchema, type EmployeeRecord, type StartTaskRecord, type EndTaskRecord, type ActiveTask } from "@/lib/definitions";
import { TASK_DURATIONS_SECONDS, DEFAULT_DURATION_SECONDS, ALL_TASKS, getGoogleSheetId, API_CONFIG } from "@/lib/config";
import { dataCache, DataCache } from "@/lib/data-cache";
import { errorLogger } from "@/lib/error-logger";
import { executeWithRetry, RequestDeduplicator } from "@/lib/request-utils";
import { sanitizeSheetName, validateEmployeeName, validateTaskName, validatePortalName, validateItemQty, validateISODateTime, validateTaskData, escapeForSheets } from "@/lib/validation-utils";
import { isoToLocalTimeString, extractTimeFromISO, formatDateForSheet, parseDateFromSheet, getCurrentDatetimeLocal, datetimeLocalToISO } from "@/lib/timezone-utils";

const TASK_COLUMN_WIDTH = 8;
const requestDeduplicator = new RequestDeduplicator();

/**
 * Get Google Sheets API client with proper authentication
 */
async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const credentials = {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  };

  // Validate credentials
  if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
    throw new Error('Missing required Google Sheets credentials in environment variables');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

/**
 * Get sheet ID by name
 */
async function getSheetIdByName(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetName: string): Promise<number | null> {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
    return sheet?.properties?.sheetId ?? null;
  } catch (error) {
    errorLogger.error(`Error getting sheetId for "${sheetName}"`, error, 'getSheetIdByName');
    return null;
  }
}

/**
 * Check for active tasks from Google Sheets with deduplication
 */
async function checkActiveTaskFromSheets(employeeName: string): Promise<ActiveTask | null> {
  // Validate input
  if (!validateEmployeeName(employeeName)) {
    errorLogger.error('Invalid employee name', new Error(employeeName), 'checkActiveTaskFromSheets');
    return null;
  }

  // Deduplicate concurrent requests
  return requestDeduplicator.execute(
    `active_task:${employeeName}`,
    async () => {
      try {
        // Check cache first
        const cacheKey = DataCache.activeTaskKey(employeeName);
        const cached = dataCache.get<ActiveTask | null>(cacheKey);
        if (cached !== undefined) {
          return cached;
        }

        const sheets = await getSheetsClient();
        const sanitizedName = sanitizeSheetName(employeeName);

        // Check if sheet exists
        const spreadsheetId = getGoogleSheetId();
        const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetExists = spreadsheetInfo.data.sheets?.some(s => s.properties?.title === sanitizedName);

        if (!sheetExists) {
          dataCache.set(cacheKey, null, API_CONFIG.ACTIVE_TASK_CACHE_TTL);
          return null;
        }

        // Fetch sheet data with retry
        const getSheetResponse = await executeWithRetry(
          () => sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sanitizedName}!${API_CONFIG.SHEET_FETCH_RANGE}`,
            majorDimension: 'ROWS',
            valueRenderOption: 'UNFORMATTED_VALUE',
            dateTimeRenderOption: 'FORMATTED_STRING'
          }),
          { timeout: API_CONFIG.REQUEST_TIMEOUT }
        );

        const rows = getSheetResponse.data.values || [];

        // Look for active tasks (missing end time)
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          const rowDate = row[0];

          if (!rowDate) continue;

          for (let taskIndex = 0; taskIndex < ALL_TASKS.length; taskIndex++) {
            const startCol = 1 + (taskIndex * TASK_COLUMN_WIDTH);
            const portalName = row[startCol] || '';
            const itemQty = row[startCol + 1] || 0;
            const startTime = row[startCol + 2] || '';
            const actualEndTime = row[startCol + 4] || '';

            const taskName = ALL_TASKS[taskIndex];
            const hasNoEndTime = !actualEndTime || actualEndTime === '' || actualEndTime === null || actualEndTime === undefined;

            if (portalName && startTime && hasNoEndTime) {
              // Parse start time properly
              const [day, month, year] = rowDate.toString().split('/').map(Number);
              const timeMatch = startTime.toString().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

              if (!timeMatch) continue;

              let hours = parseInt(timeMatch[1], 10);
              const minutes = parseInt(timeMatch[2], 10);
              const ampm = timeMatch[3].toUpperCase();

              if (ampm === 'PM' && hours !== 12) hours += 12;
              else if (ampm === 'AM' && hours === 12) hours = 0;

              const startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

              const activeTask: ActiveTask = {
                employeeName,
                portalName: taskName === "OTHER WORK" ? "" : portalName,
                taskName,
                otherTaskName: taskName === "OTHER WORK" ? portalName : undefined,
                itemQty: parseInt(itemQty) || 0,
                startTime: startDateTime.toISOString(),
                remarks: row[startCol + 5] || ""
              };

              dataCache.set(cacheKey, activeTask, API_CONFIG.ACTIVE_TASK_CACHE_TTL);
              return activeTask;
            }
          }
        }

        dataCache.set(cacheKey, null, API_CONFIG.ACTIVE_TASK_CACHE_TTL);
        return null;
      } catch (error) {
        errorLogger.error(`Failed to check active task for ${employeeName}`, error, 'checkActiveTaskFromSheets');
        return null;
      }
    }
  );
}

/**
 * Get active task for employee
 */
export async function getActiveTask(employeeName: string): Promise<ActiveTask | null> {
  return checkActiveTaskFromSheets(employeeName);
}

/**
 * Start a new task
 */
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

  // Validate employee name
  if (!validateEmployeeName(employeeName)) {
    return {
      success: false,
      error: "Invalid employee name",
    };
  }

  // Check for existing active task
  const existingActiveTask = await checkActiveTaskFromSheets(employeeName);
  if (existingActiveTask) {
    return {
      success: false,
      error: "You already have an active task. Please end your current task before starting a new one.",
    };
  }

  try {
    const sheets = await getSheetsClient();
    const sanitizedName = sanitizeSheetName(employeeName);

    // Check if sheet exists, create if not
    const spreadsheetId = getGoogleSheetId();
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheetInfo.data.sheets?.some(s => s.properties?.title === sanitizedName);

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sanitizedName } } }]
        }
      });
    }

    // Get sheet data
    const getSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: getGoogleSheetId(),
      range: `${sanitizedName}!${API_CONFIG.SHEET_FETCH_RANGE}`
    });

    let rows = getSheetResponse.data.values || [];

    // Find task column
    const taskIndex = ALL_TASKS.indexOf(validatedFields.data.taskName);
    if (taskIndex === -1) {
      return {
        success: false,
        error: `Task "${validatedFields.data.taskName}" is not configured.`,
      };
    }

    const startColIndex = 1 + (taskIndex * TASK_COLUMN_WIDTH);
    const submissionDateStr = formatDateForSheet(new Date(validatedFields.data.startTime));

    // Find or create row
    let targetRowIndex = -1;
    let existingRowData: any[] = [];

    for (let i = 2; i < rows.length; i++) {
      if (rows[i][0] === submissionDateStr && (!rows[i][startColIndex] || rows[i][startColIndex].trim() === '')) {
        targetRowIndex = i;
        existingRowData = rows[i];
        break;
      }
    }

    if (targetRowIndex === -1) {
      targetRowIndex = rows.length;
      existingRowData = [];
    }

    // Calculate estimated end time (only for non-OTHER WORK tasks)
    const startTime = new Date(validatedFields.data.startTime);
    let estimatedEndTimeStr = '';
    
    if (validatedFields.data.taskName !== "OTHER WORK") {
      const durationPerItem = TASK_DURATIONS_SECONDS[validatedFields.data.taskName] || DEFAULT_DURATION_SECONDS;
      const durationInSeconds = validatedFields.data.itemQty > 0
        ? validatedFields.data.itemQty * durationPerItem
        : DEFAULT_DURATION_SECONDS;
      const estimatedEndTime = addSeconds(startTime, durationInSeconds);
      estimatedEndTimeStr = isoToLocalTimeString(estimatedEndTime.toISOString());
    }
    // OTHER WORK tasks don't get estimated end time

    // Prepare task data
    const firstCellData = validatedFields.data.taskName === "OTHER WORK"
      ? validatedFields.data.otherTaskName || ''
      : validatedFields.data.portalName || '';

    const taskDataBlock = [
      escapeForSheets(firstCellData),
      validatedFields.data.itemQty,
      isoToLocalTimeString(validatedFields.data.startTime),
      estimatedEndTimeStr, // Empty for OTHER WORK
      '',
      escapeForSheets(validatedFields.data.remarks || ''),
      '',
      ''
    ];

    // Construct final row
    const finalRow = [...existingRowData];
    if (finalRow.length === 0) {
      finalRow[0] = submissionDateStr;
    }

    while (finalRow.length < startColIndex + taskDataBlock.length) {
      finalRow.push('');
    }

    for (let i = 0; i < taskDataBlock.length; i++) {
      finalRow[startColIndex + i] = taskDataBlock[i];
    }

    // Write to sheet with retry
    await executeWithRetry(
      () => sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sanitizedName}!A${targetRowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [finalRow] }
      }),
      { timeout: API_CONFIG.REQUEST_TIMEOUT }
    );

    // Invalidate cache
    dataCache.invalidate(DataCache.activeTaskKey(employeeName));

    // Verify task was written
    const verificationTask = await checkActiveTaskFromSheets(employeeName);

    return {
      success: true,
      message: `Task started successfully!`,
      activeTask: verificationTask || {
        employeeName,
        portalName: validatedFields.data.portalName || '',
        taskName: validatedFields.data.taskName,
        otherTaskName: validatedFields.data.otherTaskName,
        itemQty: validatedFields.data.itemQty || 0,
        startTime: validatedFields.data.startTime,
        remarks: validatedFields.data.remarks,
      },
    };
  } catch (error) {
    errorLogger.error(`Failed to start task for ${employeeName}`, error, 'startTask');
    return {
      success: false,
      error: "Failed to start task. Please try again.",
    };
  }
}

/**
 * End current task
 */
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

  try {
    // Get active task
    const activeTask = await checkActiveTaskFromSheets(employeeName);
    if (!activeTask) {
      return {
        success: false,
        error: "No active task found.",
      };
    }

    const sheets = await getSheetsClient();
    const sanitizedName = sanitizeSheetName(employeeName);
    const spreadsheetId = getGoogleSheetId();

    // Get sheet data
    const getSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sanitizedName}!${API_CONFIG.SHEET_FETCH_RANGE}`
    });

    const rows = getSheetResponse.data.values || [];
    const taskIndex = ALL_TASKS.indexOf(activeTask.taskName);
    const startColIndex = 1 + (taskIndex * TASK_COLUMN_WIDTH);
    const submissionDateStr = formatDateForSheet(new Date(activeTask.startTime));
    const startTimeStr = isoToLocalTimeString(activeTask.startTime);

    // Find matching row
    let targetRowIndex = -1;
    for (let i = 2; i < rows.length; i++) {
      if (rows[i][0] === submissionDateStr &&
          rows[i][startColIndex] === (activeTask.taskName === "OTHER WORK" ? activeTask.otherTaskName : activeTask.portalName) &&
          rows[i][startColIndex + 2] === startTimeStr) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return {
        success: false,
        error: "Could not find the matching task entry.",
      };
    }

    // Format end time
    console.log(`📝 Raw end time received: "${validatedFields.data.endTime}"`);
    
    // Convert datetime-local to ISO if needed, then extract time
    let endTimeISO = validatedFields.data.endTime;
    if (!endTimeISO.includes('Z') && !endTimeISO.match(/[+-]\d{2}:\d{2}$/)) {
      // It's datetime-local format, convert to ISO
      endTimeISO = datetimeLocalToISO(endTimeISO);
      console.log(`📝 Converted to ISO: "${endTimeISO}"`);
    }
    
    const endTimeStr = extractTimeFromISO(endTimeISO);
    console.log(`📝 Formatted end time: "${endTimeStr}"`);
    const endTimeColIndex = startColIndex + 4;
    const finalRemarksColIndex = startColIndex + 7;

    // Helper to convert column index to letter
    const getColumnName = (colIndex: number): string => {
      let result = '';
      while (colIndex >= 0) {
        result = String.fromCharCode(65 + (colIndex % 26)) + result;
        colIndex = Math.floor(colIndex / 26) - 1;
      }
      return result;
    };

    // Update sheet with retry
    await executeWithRetry(
      () => sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: `${sanitizedName}!${getColumnName(endTimeColIndex)}${targetRowIndex + 1}`,
              values: [[endTimeStr]]
            },
            ...(validatedFields.data.remarks ? [{
              range: `${sanitizedName}!${getColumnName(finalRemarksColIndex)}${targetRowIndex + 1}`,
              values: [[escapeForSheets(validatedFields.data.remarks)]]
            }] : [])
          ]
        }
      }),
      { timeout: API_CONFIG.REQUEST_TIMEOUT }
    );

    // Invalidate cache - clear both data cache and request deduplicator
    dataCache.invalidate(DataCache.activeTaskKey(employeeName));
    // Force fresh check next time by clearing deduplicator for this employee
    requestDeduplicator.clearKey(`active_task:${employeeName}`);

    return {
      success: true,
      message: "Task completed successfully!",
    };
  } catch (error) {
    errorLogger.error(`Failed to end task for ${employeeName}`, error, 'endTask');
    return {
      success: false,
      error: "Failed to end task. Please try again.",
    };
  }
}

/**
 * Get employee report
 */
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
  totalWorkTime: number; // All work time including OTHER WORK
  productiveWorkTime: number; // Only time from tasks with items (for average calculation)
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

export async function getEmployeeReport(dateRange: { from: Date | string; to: Date | string }, employeeName: string): Promise<EmployeeReport | null> {
  try {
    // Validate input
    if (!validateEmployeeName(employeeName)) {
      errorLogger.error('Invalid employee name', new Error(employeeName), 'getEmployeeReport');
      return null;
    }

    const sheets = await getSheetsClient();
    const sanitizedName = sanitizeSheetName(employeeName);
    const spreadsheetId = getGoogleSheetId();

    // Parse dates
    let startDate = new Date(dateRange.from);
    let endDate = new Date(dateRange.to);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      errorLogger.error('Invalid date range', new Error(`from: ${dateRange.from}, to: ${dateRange.to}`), 'getEmployeeReport');
      return null;
    }

    // Normalize dates to noon local time
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0, 0);
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 12, 0, 0, 0);

    // Check if sheet exists
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheetInfo.data.sheets?.some(s => s.properties?.title === sanitizedName);

    if (!sheetExists) {
      return null;
    }

    // Fetch sheet data with retry
    const getSheetResponse = await executeWithRetry(
      () => sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sanitizedName}!${API_CONFIG.SHEET_FETCH_RANGE}`,
        majorDimension: 'ROWS',
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      }),
      { timeout: API_CONFIG.REQUEST_TIMEOUT }
    );

    const rows = getSheetResponse.data.values || [];

    if (rows.length < 2) {
      return null;
    }

    // Filter rows by date range
    const dateMatchingRows = rows.filter((row, index) => {
      if (index < 2 || !row[0]) return false;

      try {
        const rowDate = parseDateFromSheet(row[0].toString().trim());
        rowDate.setHours(12, 0, 0, 0);

        return rowDate >= startDate && rowDate <= endDate;
      } catch {
        return false;
      }
    });

    if (dateMatchingRows.length === 0) {
      return null;
    }

    // Process records
    const employeeData: EmployeeReport = {
      name: employeeName,
      totalWorkTime: 0,
      productiveWorkTime: 0,
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

        if (!startTimeStr || !dateStr) continue;
        
        // Special handling for OTHER WORK - ensure it's always processed if it has start time
        if (taskName === "OTHER WORK" && startTimeStr) {
          console.log(`🔍 Processing OTHER WORK: Date=${dateStr}, Portal=${row[startCol] || 'N/A'}, Qty=${row[startCol + 1] || 0}, Start=${startTimeStr}, End=${row[startCol + 4] || 'N/A'}`);
        }

        try {
          const baseDate = parseDateFromSheet(dateStr);
          const quantity = parseInt(itemQtyStr, 10) || 0;

          // For OTHER WORK, quantity can be 0, but for other tasks it must be > 0
          // CRITICAL: OTHER WORK tasks should ALWAYS be included, even with 0 quantity
          if (taskName !== "OTHER WORK" && quantity <= 0) {
            continue; // Skip non-OTHER WORK tasks with 0 quantity
          }
          
          // For OTHER WORK: Always process regardless of quantity (time-based calculation)
          // This ensures OTHER WORK with 0 quantity appears in reports (as per requirement)
          if (taskName === "OTHER WORK") {
            console.log(`📝 OTHER WORK Processing: Date=${dateStr}, Qty=${quantity}, Start=${startTimeStr}, End=${endTimeStr || 'In Progress'}`);
          }

          const startTimeMatch = startTimeStr.toString().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (!startTimeMatch) {
            // For OTHER WORK, still add to detailed records even if time parsing fails
            if (taskName === "OTHER WORK") {
              console.log(`⚠️ OTHER WORK time parsing failed but adding to records: ${startTimeStr}`);
              employeeData.detailedRecords.push({
                date: dateStr,
                taskName,
                portal: row[startCol] || '',
                quantity,
                startTime: startTimeStr,
                estimatedEndTime: row[startCol + 3] || '',
                actualEndTime: row[startCol + 4] || "In Progress",
                chetanRemarks: row[startCol + 5] || '',
                ganesh: row[startCol + 6] || '',
                finalRemarks: row[startCol + 7] || '',
                duration: 0,
                runRate: 0
              });
            }
            continue;
          }

          let hours = parseInt(startTimeMatch[1], 10);
          const minutes = parseInt(startTimeMatch[2], 10);
          const ampm = startTimeMatch[3].toUpperCase();

          if (ampm === 'PM' && hours !== 12) hours += 12;
          else if (ampm === 'AM' && hours === 12) hours = 0;

          const startTime = new Date(baseDate);
          startTime.setHours(hours, minutes, 0, 0);

          let duration = 0;
          let actualEndTime = endTimeStr || "In Progress";

          if (endTimeStr) {
            const endTimeMatch = endTimeStr.toString().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (endTimeMatch) {
              let endHours = parseInt(endTimeMatch[1], 10);
              const endMinutes = parseInt(endTimeMatch[2], 10);
              const endAmpm = endTimeMatch[3].toUpperCase();

              if (endAmpm === 'PM' && endHours !== 12) endHours += 12;
              else if (endAmpm === 'AM' && endHours === 12) endHours = 0;

              const endTime = new Date(baseDate);
              endTime.setHours(endHours, endMinutes, 0, 0);

              duration = differenceInSeconds(endTime, startTime);
              if (duration < 0) duration += 24 * 60 * 60;

              if (endTimeStr) {
                // Always add to totalWorkTime (includes all work including OTHER WORK)
                employeeData.totalWorkTime += duration;
                
                // Add to productiveWorkTime and totalItems only for tasks with items
                if (taskName !== "OTHER WORK") {
                  employeeData.productiveWorkTime += duration;
                  employeeData.totalItems += quantity;
                } else if (taskName === "OTHER WORK" && quantity > 0) {
                  // OTHER WORK with quantity > 0 counts as productive work
                  employeeData.productiveWorkTime += duration;
                  employeeData.totalItems += quantity;
                }
                // OTHER WORK with quantity <= 0 only adds to totalWorkTime, not productiveWorkTime

                if (!employeeData.tasks[taskName]) {
                  employeeData.tasks[taskName] = { quantity: 0, duration: 0, runRate: 0 };
                }
                
                // For OTHER WORK, always track both quantity and duration (even if quantity is 0)
                // For other tasks, only track if quantity > 0
                if (taskName === "OTHER WORK") {
                  // OTHER WORK: Always track quantity (even 0) and duration
                  employeeData.tasks[taskName].quantity += quantity;
                  employeeData.tasks[taskName].duration += duration;
                } else if (quantity > 0) {
                  // Other tasks: Only track if quantity > 0
                  employeeData.tasks[taskName].quantity += quantity;
                  employeeData.tasks[taskName].duration += duration;
                }
              }
            }
          }

          // SPECIAL HANDLING: Add OTHER WORK to task summary even if no end time (in progress)
          if (taskName === "OTHER WORK" && !endTimeStr) {
            if (!employeeData.tasks[taskName]) {
              employeeData.tasks[taskName] = { quantity: 0, duration: 0, runRate: 0 };
            }
            // Add quantity even for in-progress OTHER WORK tasks
            employeeData.tasks[taskName].quantity += quantity;
            console.log(`📝 OTHER WORK (In Progress) added to task summary: Qty=${quantity}`);
          }

          // CRITICAL FIX: Always add OTHER WORK to detailed records (even if in progress)
          // For other tasks, only add if they have proper duration calculation
          const shouldAddToRecords = taskName === "OTHER WORK" || (duration > 0 && endTimeStr);
          
          if (shouldAddToRecords) {
            employeeData.detailedRecords.push({
              date: dateStr,
              taskName,
              portal: row[startCol] || '',
              quantity,
              startTime: startTimeStr,
              estimatedEndTime: row[startCol + 3] || '',
              actualEndTime,
              chetanRemarks: row[startCol + 5] || '',
              ganesh: row[startCol + 6] || '',
              finalRemarks: row[startCol + 7] || '',
              duration,
              runRate: taskName === "OTHER WORK" ? 
                (quantity > 0 ? (duration > 0 ? duration / quantity : 0) : duration) : 
                ((duration > 0 && quantity > 0) ? duration / quantity : 0)
            });
            
            // Log for debugging
            if (taskName === "OTHER WORK") {
              console.log(`✅ OTHER WORK added to detailed records: ${dateStr}, Qty=${quantity}, Duration=${duration}, Status=${actualEndTime}`);
            }
          }
        } catch (error) {
          errorLogger.warning(`Error processing record for ${taskName}`, error, 'getEmployeeReport');
          continue;
        }
      }
    }

    // Calculate run rates
    for (const taskName in employeeData.tasks) {
      const task = employeeData.tasks[taskName];
      
      if (taskName === "OTHER WORK") {
        // For OTHER WORK: if quantity > 0, calculate per item; if quantity = 0, use total duration
        if (task.quantity > 0) {
          task.runRate = task.duration / task.quantity;
        } else {
          task.runRate = task.duration; // Time-based for 0 quantity
        }
      } else {
        // For other tasks, run rate is duration per item
        task.runRate = task.quantity > 0 ? task.duration / task.quantity : 0;
      }
    }

    employeeData.averageRunRate = employeeData.totalItems > 0 ? employeeData.productiveWorkTime / employeeData.totalItems : 0;

    // Sort detailed records by date and start time (ascending order)
    employeeData.detailedRecords.sort((a, b) => {
      try {
        // Parse dates (format: DD/MM/YYYY)
        const parseDateStr = (dateStr: string) => {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
          }
          return new Date(dateStr);
        };
        
        const dateA = parseDateStr(a.date);
        const dateB = parseDateStr(b.date);
        
        // First sort by date
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        
        // If same date, sort by start time
        const parseTime = (timeStr: string) => {
          if (!timeStr) return 0;
          
          const match = timeStr.toString().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (!match) return 0;
          
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const ampm = match[3].toUpperCase();
          
          // Convert to 24-hour format
          if (ampm === 'PM' && hours !== 12) {
            hours += 12;
          } else if (ampm === 'AM' && hours === 12) {
            hours = 0;
          }
          
          return hours * 60 + minutes; // Convert to minutes for comparison
        };
        
        const timeA = parseTime(a.startTime);
        const timeB = parseTime(b.startTime);
        
        return timeA - timeB;
      } catch (error) {
        console.error('Error sorting records:', error, { a: a.date + ' ' + a.startTime, b: b.date + ' ' + b.startTime });
        return 0;
      }
    });

    return employeeData.detailedRecords.length > 0 ? employeeData : null;
  } catch (error) {
    errorLogger.error(`Failed to get employee report for ${employeeName}`, error, 'getEmployeeReport');
    return null;
  }
}
