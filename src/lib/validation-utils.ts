/**
 * Validation and Sanitization Utilities
 */

/**
 * Sanitize sheet name for Google Sheets API
 * Removes special characters and limits length
 */
export function sanitizeSheetName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Sheet name must be a non-empty string');
  }

  // Remove leading/trailing whitespace
  let sanitized = name.trim();

  // Remove special characters that break Google Sheets API
  // Keep only alphanumeric, spaces, hyphens, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, '');

  // Limit to 255 characters (Google Sheets limit)
  sanitized = sanitized.substring(0, 255);

  if (!sanitized) {
    throw new Error('Sheet name cannot be empty after sanitization');
  }

  return sanitized;
}

/**
 * Validate employee name
 */
export function validateEmployeeName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // Must be non-empty and not too long
  return name.trim().length > 0 && name.length <= 255;
}

/**
 * Validate task name
 */
export function validateTaskName(name: string, validTasks: string[]): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  return validTasks.includes(name);
}

/**
 * Validate portal name
 */
export function validatePortalName(name: string, validPortals: string[]): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  return validPortals.includes(name);
}

/**
 * Validate item quantity
 */
export function validateItemQty(qty: any): boolean {
  const num = Number(qty);
  return !isNaN(num) && num >= 0 && Number.isInteger(num);
}

/**
 * Validate ISO datetime string
 */
export function validateISODateTime(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate datetime-local string
 * Format: "2024-01-15T14:30"
 */
export function validateDatetimeLocal(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  // Check format
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate date range
 */
export function validateDateRange(from: Date, to: Date): boolean {
  if (!(from instanceof Date) || !(to instanceof Date)) {
    return false;
  }

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return false;
  }

  // From date should be before or equal to to date
  return from.getTime() <= to.getTime();
}

/**
 * Validate remarks/notes
 */
export function validateRemarks(remarks: string): boolean {
  if (remarks === undefined || remarks === null) {
    return true; // Optional field
  }

  if (typeof remarks !== 'string') {
    return false;
  }

  // Limit to 1000 characters
  return remarks.length <= 1000;
}

/**
 * Escape special characters for Google Sheets
 */
export function escapeForSheets(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Escape quotes and newlines
  return str
    .replace(/"/g, '""') // Double quotes for escaping in CSV
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .substring(0, 10000); // Limit cell content
}

/**
 * Validate all task data
 */
export function validateTaskData(data: any, validTasks: string[], validPortals: string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate employee name
  if (!validateEmployeeName(data.employeeName)) {
    errors.push('Invalid employee name');
  }

  // Validate task name
  if (!validateTaskName(data.taskName, validTasks)) {
    errors.push('Invalid task name');
  }

  // Validate portal (if not OTHER WORK)
  if (data.taskName !== 'OTHER WORK') {
    if (!validatePortalName(data.portalName, validPortals)) {
      errors.push('Invalid portal name');
    }
  }

  // Validate item quantity (if not OTHER WORK)
  if (data.taskName !== 'OTHER WORK') {
    if (!validateItemQty(data.itemQty)) {
      errors.push('Invalid item quantity');
    }
  }

  // Validate start time
  if (!validateISODateTime(data.startTime)) {
    errors.push('Invalid start time');
  }

  // Validate end time if provided
  if (data.endTime && !validateISODateTime(data.endTime)) {
    errors.push('Invalid end time');
  }

  // Validate remarks
  if (!validateRemarks(data.remarks)) {
    errors.push('Invalid remarks');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
