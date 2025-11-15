/**
 * Timezone Utilities
 * Handles timezone conversions properly without hardcoded offsets
 */

import { format, parse } from "date-fns";

/**
 * Get user's timezone offset in milliseconds
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset() * 60 * 1000;
}

/**
 * Convert ISO string to local time string (HH:mm a format)
 * Properly handles timezone conversion
 */
export function isoToLocalTimeString(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.error(`Invalid ISO string: ${isoString}`);
      return '';
    }
    return format(date, 'hh:mm a');
  } catch (error) {
    console.error(`Error converting ISO to local time: ${isoString}`, error);
    return '';
  }
}

/**
 * Convert local datetime-local input to ISO string
 * datetime-local format: "2024-01-15T14:30"
 */
export function datetimeLocalToISO(datetimeLocalString: string): string {
  try {
    if (!datetimeLocalString) return '';
    
    // datetime-local is already in local time, just convert to ISO
    const date = new Date(datetimeLocalString);
    if (isNaN(date.getTime())) {
      console.error(`Invalid datetime-local string: ${datetimeLocalString}`);
      return '';
    }
    
    return date.toISOString();
  } catch (error) {
    console.error(`Error converting datetime-local to ISO: ${datetimeLocalString}`, error);
    return '';
  }
}

/**
 * Extract time from ISO string and format as 12-hour time
 * Handles timezone properly and supports both ISO and datetime-local formats
 */
export function extractTimeFromISO(isoString: string): string {
  try {
    if (!isoString) {
      console.error('Empty ISO string provided');
      return '';
    }

    console.log(`🕐 Processing time string: "${isoString}"`);
    
    let date: Date;
    
    // Handle different input formats
    if (isoString.includes('Z') || isoString.match(/[+-]\d{2}:\d{2}$/)) {
      // Full ISO string with timezone (e.g., "2024-11-15T10:30:00.000Z")
      date = new Date(isoString);
      console.log(`🕐 Parsed as ISO with timezone: ${date.toString()}`);
    } else if (isoString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/)) {
      // datetime-local format (e.g., "2024-11-15T10:30" or "2024-11-15T10:30:00")
      // Treat as local time
      date = new Date(isoString);
      console.log(`🕐 Parsed as datetime-local: ${date.toString()}`);
    } else {
      // Try to parse as-is
      date = new Date(isoString);
      console.log(`🕐 Parsed as generic date: ${date.toString()}`);
    }
    
    if (isNaN(date.getTime())) {
      console.error(`Invalid date result from: ${isoString}`);
      return '';
    }
    
    // Get local time components (this automatically handles timezone conversion)
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    console.log(`🕐 Local time components: ${hours}:${minutes}`);
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
    
    const result = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    console.log(`🕐 Final formatted time: "${result}"`);
    
    return result;
  } catch (error) {
    console.error(`Error extracting time from ISO: ${isoString}`, error);
    return '';
  }
}

/**
 * Parse time string (12-hour format) with a base date
 * Returns ISO string
 */
export function parseTimeWithDate(timeString: string, baseDate: Date): string {
  try {
    if (!timeString) return '';
    
    // Parse 12-hour time format (e.g., "02:30 PM")
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) {
      console.error(`Invalid time format: ${timeString}`);
      return '';
    }
    
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3].toUpperCase();
    
    // Convert to 24-hour format
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    // Create date in local timezone
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    
    return result.toISOString();
  } catch (error) {
    console.error(`Error parsing time: ${timeString}`, error);
    return '';
  }
}

/**
 * Get current time as ISO string
 */
export function getCurrentTimeISO(): string {
  return new Date().toISOString();
}

/**
 * Get current time as datetime-local string
 * Format: "2024-01-15T14:30"
 */
export function getCurrentDatetimeLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert ISO string to datetime-local format for HTML input
 * Input: "2025-11-15T05:00:25.372Z"
 * Output: "2025-11-15T10:30" (local time)
 */
export function isoToDatetimeLocal(isoString: string): string {
  try {
    if (!isoString) return '';
    
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.error(`Invalid ISO string for datetime-local: ${isoString}`);
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error(`Error converting ISO to datetime-local: ${isoString}`, error);
    return '';
  }
}

/**
 * Format date as dd/MM/yyyy (for Google Sheets)
 */
export function formatDateForSheet(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

/**
 * Parse date from dd/MM/yyyy format
 */
export function parseDateFromSheet(dateString: string): Date {
  try {
    return parse(dateString, 'dd/MM/yyyy', new Date());
  } catch (error) {
    console.error(`Error parsing sheet date: ${dateString}`, error);
    return new Date();
  }
}
