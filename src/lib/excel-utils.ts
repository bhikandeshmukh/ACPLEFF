/**
 * Excel Export Utilities
 * Generate Excel files from report data
 */

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { EmployeeReport } from '@/app/server-actions';
import { TASK_DURATIONS_SECONDS, DEFAULT_DURATION_SECONDS, ALL_TASKS } from '@/lib/config';

/**
 * Format duration in seconds to readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  
  return parts.join(' ');
}

/**
 * Parse time string (e.g., "9:30 AM") and return minutes from midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) hours += 12;
  else if (ampm === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

/**
 * Merge overlapping time periods to avoid double counting
 * Example: [5:06-5:22, 5:10-6:00] => [5:06-6:00]
 */
function mergeOverlappingPeriods(
  periods: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  if (periods.length === 0) return [];
  
  // Sort by start time
  const sorted = [...periods].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];
    
    // If current overlaps with last merged, extend the end time
    if (current.start <= lastMerged.end) {
      lastMerged.end = Math.max(lastMerged.end, current.end);
    } else {
      // No overlap, add as new period
      merged.push(current);
    }
  }
  
  return merged;
}

/**
 * Calculate total unique work time (handling overlapping tasks)
 * Returns work time in seconds
 */
function calculateTotalUniqueWorkTime(
  detailedRecords: Array<{ startTime: string; actualEndTime: string; duration: number }>
): number {
  const workPeriods: Array<{ start: number; end: number }> = [];
  
  for (const record of detailedRecords) {
    const taskStart = parseTimeToMinutes(record.startTime);
    const taskEnd = parseTimeToMinutes(record.actualEndTime);
    
    // Skip if task end is "In Progress" or invalid
    if (!taskEnd || taskEnd === 0 || record.actualEndTime === "In Progress") continue;
    
    workPeriods.push({ start: taskStart, end: taskEnd });
  }
  
  // Merge overlapping periods
  const mergedPeriods = mergeOverlappingPeriods(workPeriods);
  
  // Calculate total time from merged periods
  let totalMinutes = 0;
  for (const period of mergedPeriods) {
    totalMinutes += period.end - period.start;
  }
  
  return totalMinutes * 60; // Convert to seconds
}

/**
 * Calculate work time that falls during break periods (to be excluded)
 * Only Lunch (12:30-1:00 PM) and First Tea Break (3:00-3:15 PM) are excluded
 * Second Tea Break (5:00-5:15 PM) is NOT excluded
 * Uses merged work periods to avoid double counting
 */
function calculateWorkDuringBreaks(
  detailedRecords: Array<{ startTime: string; actualEndTime: string; duration: number }>
): number {
  const breaks = [
    { start: 12 * 60 + 30, end: 13 * 60 }, // 12:30 PM - 1:00 PM (Lunch)
    { start: 15 * 60, end: 15 * 60 + 15 }, // 3:00 PM - 3:15 PM (First Tea Break)
    // Second Tea Break (5:00-5:15 PM) is NOT included - work during this time counts
  ];
  
  // Get merged work periods (no overlaps)
  const workPeriods: Array<{ start: number; end: number }> = [];
  
  for (const record of detailedRecords) {
    const taskStart = parseTimeToMinutes(record.startTime);
    const taskEnd = parseTimeToMinutes(record.actualEndTime);
    
    // Skip if task end is "In Progress" or invalid
    if (!taskEnd || taskEnd === 0 || record.actualEndTime === "In Progress") continue;
    
    workPeriods.push({ start: taskStart, end: taskEnd });
  }
  
  const mergedPeriods = mergeOverlappingPeriods(workPeriods);
  
  let totalWorkDuringBreaks = 0;
  
  // Check each merged work period against break times
  for (const workPeriod of mergedPeriods) {
    for (const breakPeriod of breaks) {
      if (workPeriod.start < breakPeriod.end && workPeriod.end > breakPeriod.start) {
        const overlapStart = Math.max(workPeriod.start, breakPeriod.start);
        const overlapEnd = Math.min(workPeriod.end, breakPeriod.end);
        const overlapMinutes = Math.max(0, overlapEnd - overlapStart);
        totalWorkDuringBreaks += overlapMinutes;
      }
    }
  }
  
  return totalWorkDuringBreaks * 60; // Convert to seconds
}

/**
 * Calculate available work time considering breaks
 * Only Lunch (12:30-1:00 PM) and First Tea Break (3:00-3:15 PM) are deducted
 * Second Tea Break (5:00-5:15 PM) is NOT deducted - total 45 minutes break
 */
function calculateAvailableWorkTime(
  inTime: string, 
  isFemale: boolean
): number {
  const inMinutes = parseTimeToMinutes(inTime);
  
  // Out time: 6 PM (18:00) for females, 7 PM (19:00) for males
  const outMinutes = isFemale ? 18 * 60 : 19 * 60; // 1080 or 1140 minutes
  
  // Total time from in to out
  let totalMinutes = outMinutes - inMinutes;
  
  if (totalMinutes <= 0) return 0;
  
  // Break times in minutes from midnight
  // Only Lunch and First Tea Break are deducted
  const breaks = [
    { start: 12 * 60 + 30, end: 13 * 60 }, // 12:30 PM - 1:00 PM (30 min)
    { start: 15 * 60, end: 15 * 60 + 15 }, // 3:00 PM - 3:15 PM (15 min)
    // Second Tea Break (5:00-5:15 PM) is NOT deducted
  ];
  
  let totalBreakMinutes = 0;
  
  // For each break, check if it falls within work time
  for (const breakPeriod of breaks) {
    // Check if break falls within employee's work time
    if (inMinutes < breakPeriod.end && outMinutes > breakPeriod.start) {
      const breakOverlapStart = Math.max(inMinutes, breakPeriod.start);
      const breakOverlapEnd = Math.min(outMinutes, breakPeriod.end);
      const breakDuration = Math.max(0, breakOverlapEnd - breakOverlapStart);
      totalBreakMinutes += breakDuration;
    }
  }
  
  // Available work time = Total time - Break time (45 min if all breaks fall in work time)
  return Math.max(0, totalMinutes - totalBreakMinutes);
}

/**
 * Aggregate per-day work metrics to avoid multi-day distortion
 */
function computeWorkSummary(
  detailedRecords: Array<{ date: string; startTime: string; actualEndTime: string; duration: number }>,
  isFemale: boolean
): {
  availableWorkMinutes: number;
  totalUniqueWorkSeconds: number;
  workDuringBreaksSeconds: number;
  actualWorkSeconds: number;
  earliestInTime: string;
} {
  let availableWorkMinutes = 0;
  let totalUniqueWorkSeconds = 0;
  let workDuringBreaksSeconds = 0;
  let earliestInTime: string | null = null;

  const recordsByDate: Record<string, typeof detailedRecords> = {};
  const hasValidTime = (timeStr: string) => /(\d{1,2}):(\d{2})\s*(AM|PM)/i.test(timeStr || '');

  for (const record of detailedRecords) {
    if (!record.date) continue;
    if (!recordsByDate[record.date]) {
      recordsByDate[record.date] = [];
    }
    recordsByDate[record.date].push(record);
  }

  for (const records of Object.values(recordsByDate)) {
    if (records.length === 0) continue;

    const earliestRecord = records
      .filter((r) => hasValidTime(r.startTime))
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))[0];

    if (earliestRecord) {
      availableWorkMinutes += calculateAvailableWorkTime(earliestRecord.startTime, isFemale);
      if (!earliestInTime || parseTimeToMinutes(earliestRecord.startTime) < parseTimeToMinutes(earliestInTime)) {
        earliestInTime = earliestRecord.startTime;
      }
    }

    totalUniqueWorkSeconds += calculateTotalUniqueWorkTime(records);
    workDuringBreaksSeconds += calculateWorkDuringBreaks(records);
  }

  const actualWorkSeconds = Math.max(0, totalUniqueWorkSeconds - workDuringBreaksSeconds);

  return {
    availableWorkMinutes,
    totalUniqueWorkSeconds,
    workDuringBreaksSeconds,
    actualWorkSeconds,
    earliestInTime: earliestInTime || 'N/A',
  };
}

/**
 * Generate Excel file for single employee report
 */
export function generateEmployeeExcel(
  employeeData: EmployeeReport,
  dateRange: { from: Date; to: Date }
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Calculate efficiency metrics
  const isFemale = employeeData.name.toUpperCase() === 'LATA' || employeeData.name.toUpperCase() === 'VAISHALI';
  const workSummary = computeWorkSummary(employeeData.detailedRecords, isFemale);
  const inTime = workSummary.earliestInTime;
  const availableWorkMinutes = workSummary.availableWorkMinutes;
  const actualWorkSeconds = workSummary.actualWorkSeconds;
  const overallEfficiency = availableWorkMinutes > 0
    ? (Math.floor(actualWorkSeconds / 60) / availableWorkMinutes) * 100
    : 0;

  const outTime = isFemale ? '6:00 PM' : '7:00 PM';

  // Summary Sheet
  const summaryData = [
    ['Employee Report'],
    [''],
    ['Employee Name:', employeeData.name],
    ['Report Period:', `${format(dateRange.from, 'dd/MM/yyyy')} to ${format(dateRange.to, 'dd/MM/yyyy')}`],
    ['Generated On:', format(new Date(), 'dd/MM/yyyy hh:mm a')],
    [''],
    ['Work Schedule'],
    ['Gender:', isFemale ? 'Female' : 'Male'],
    ['In Time:', inTime],
    ['Out Time:', outTime],
    ['Break Times:', 'Lunch: 12:30-1:00 PM (30m), Tea 1: 3:00-3:15 PM (15m) - Deducted | Tea 2: 5:00-5:15 PM (Counted)'],
    ['Total Breaks:', '45 minutes (Lunch + Tea 1)'],
    ['Available Work Time:', `${availableWorkMinutes} minutes (${(availableWorkMinutes / 60).toFixed(1)} hours)`],
    [''],
    ['Overall Performance'],
    ['Total Submitted Work Time:', formatDuration(employeeData.totalWorkTime)],
    ['Total Unique Work Time (No Overlaps):', formatDuration(workSummary.totalUniqueWorkSeconds)],
    ['Work During Breaks (Excluded):', formatDuration(workSummary.workDuringBreaksSeconds)],
    ['Net Productive Work Time:', formatDuration(workSummary.actualWorkSeconds)],
    ['Total Items:', employeeData.totalItems],
    ['Average Run Rate:', employeeData.averageRunRate > 0 ? `${employeeData.averageRunRate.toFixed(2)}s / item` : 'N/A'],
    ['Overall Efficiency:', `${overallEfficiency.toFixed(1)}%`],
    ['Status:', overallEfficiency >= 90 ? 'Excellent' : overallEfficiency >= 75 ? 'Good' : overallEfficiency >= 60 ? 'Average' : 'Needs Improvement'],
    [''],
    ['Task Breakdown'],
    ['Task Name', 'Quantity', 'Duration', 'Run Rate (s/item)'],
  ];

  // Add task breakdown
  Object.entries(employeeData.tasks).forEach(([taskName, taskDetails]) => {
    summaryData.push([
      taskName,
      taskDetails.quantity,
      formatDuration(taskDetails.duration),
      taskDetails.runRate.toFixed(2),
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths
  summarySheet['!cols'] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
    { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Task Configuration Sheet
  const configData = [
    ['Task Configuration'],
    [''],
    ['Generated On:', format(new Date(), 'dd/MM/yyyy hh:mm a')],
    ['Default Duration:', `${DEFAULT_DURATION_SECONDS} seconds`],
    [''],
    ['Task Name', 'Duration (Seconds)', 'Duration (Formatted)', 'Type'],
  ];

  ALL_TASKS.forEach((task) => {
    const duration = TASK_DURATIONS_SECONDS[task] || DEFAULT_DURATION_SECONDS;
    const isDefault = !TASK_DURATIONS_SECONDS[task];
    const formattedDuration = formatDuration(duration);
    
    configData.push([
      task,
      duration.toString(),
      formattedDuration,
      isDefault ? 'Default' : 'Custom',
    ]);
  });

  const configSheet = XLSX.utils.aoa_to_sheet(configData);
  
  // Set column widths
  configSheet['!cols'] = [
    { wch: 30 }, // Task Name
    { wch: 18 }, // Duration (Seconds)
    { wch: 20 }, // Duration (Formatted)
    { wch: 15 }, // Type
  ];

  XLSX.utils.book_append_sheet(workbook, configSheet, 'Task Configuration');

  // Detailed Records Sheet
  if (employeeData.detailedRecords && employeeData.detailedRecords.length > 0) {
    const inTime = workSummary.earliestInTime;
    const totalUniqueWorkSeconds = workSummary.totalUniqueWorkSeconds;
    const workDuringBreaksSeconds = workSummary.workDuringBreaksSeconds;
    const actualWorkSeconds = workSummary.actualWorkSeconds;
    const overallEfficiencySummary = availableWorkMinutes > 0 ? (Math.floor(actualWorkSeconds / 60) / availableWorkMinutes) * 100 : 0;

    const detailedData = [
      ['Detailed Task Records'],
      [''],
      ['Employee:', employeeData.name],
      ['Gender:', isFemale ? 'Female' : 'Male'],
      ['In Time:', inTime],
      ['Out Time:', outTime],
      ['Break Times:', 'Lunch: 12:30-1:00 PM (30m), Tea 1: 3:00-3:15 PM (15m) - Deducted | Tea 2: 5:00-5:15 PM (Counted)'],
      ['Total Breaks:', '45 minutes (Lunch + Tea 1)'],
      ['Available Work Time:', `${availableWorkMinutes} minutes (${(availableWorkMinutes / 60).toFixed(1)} hours)`],
      [''],
      [
        'Date',
        'Task Name',
        'Portal',
        'Quantity',
        'Start Time',
        'Estimated End',
        'Actual End',
        'Duration',
        'Config Time (s)',
        'Expected Time',
        'Actual vs Expected',
        'Efficiency %',
        'Run Rate (s)',
        'Chetan Remarks',
        'Ganesh',
        'Final Remarks',
      ],
    ];

    employeeData.detailedRecords.forEach((record) => {
      // Get configured time per item for this task
      const configTimePerItem = TASK_DURATIONS_SECONDS[record.taskName] || DEFAULT_DURATION_SECONDS;
      const expectedTotalTime = record.quantity > 0 ? record.quantity * configTimePerItem : 0;
      const actualTime = record.duration;
      
      // Calculate efficiency (lower is better - actual time should be <= expected time)
      let efficiency = 0;
      let efficiencyStatus = 'N/A';
      if (expectedTotalTime > 0 && actualTime > 0) {
        // Efficiency = (Expected / Actual) * 100
        // If actual < expected, efficiency > 100% (good)
        // If actual > expected, efficiency < 100% (needs improvement)
        efficiency = (expectedTotalTime / actualTime) * 100;
        efficiencyStatus = `${efficiency.toFixed(1)}%`;
      }
      
      // Actual vs Expected comparison
      let comparison = 'N/A';
      if (expectedTotalTime > 0 && actualTime > 0) {
        const diff = actualTime - expectedTotalTime;
        if (diff > 0) {
          comparison = `+${formatDuration(diff)} (Slower)`;
        } else if (diff < 0) {
          comparison = `${formatDuration(Math.abs(diff))} (Faster)`;
        } else {
          comparison = 'On Target';
        }
      }

      detailedData.push([
        record.date,
        record.taskName,
        record.portal,
        record.quantity.toString(),
        record.startTime,
        record.estimatedEndTime,
        record.actualEndTime,
        formatDuration(record.duration),
        configTimePerItem.toString(),
        formatDuration(expectedTotalTime),
        comparison,
        efficiencyStatus,
        record.runRate.toFixed(2),
        record.chetanRemarks || '',
        record.ganesh || '',
        record.finalRemarks || '',
      ]);
    });
    
    // Add overall efficiency summary at the end
    detailedData.push([]);
    detailedData.push(['OVERALL EFFICIENCY']);
    detailedData.push(['In Time:', inTime]);
    detailedData.push(['Out Time:', outTime]);
    detailedData.push(['Available Work Time:', `${availableWorkMinutes} minutes (${(availableWorkMinutes / 60).toFixed(1)} hours)`]);
    detailedData.push(['Total Submitted Work Time:', formatDuration(employeeData.totalWorkTime)]);
    detailedData.push(['Total Unique Work Time (No Overlaps):', formatDuration(workSummary.totalUniqueWorkSeconds)]);
    detailedData.push(['Work During Breaks (Excluded):', formatDuration(workSummary.workDuringBreaksSeconds)]);
    detailedData.push(['Net Productive Work Time:', formatDuration(workSummary.actualWorkSeconds)]);
    detailedData.push(['Efficiency:', `${overallEfficiencySummary.toFixed(1)}%`]);
    detailedData.push(['Status:', overallEfficiencySummary >= 90 ? 'Excellent' : overallEfficiencySummary >= 75 ? 'Good' : overallEfficiencySummary >= 60 ? 'Average' : 'Needs Improvement']);

    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
    
    // Set column widths
    detailedSheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Task Name
      { wch: 20 }, // Portal
      { wch: 10 }, // Quantity
      { wch: 12 }, // Start Time
      { wch: 12 }, // Estimated End
      { wch: 12 }, // Actual End
      { wch: 12 }, // Duration
      { wch: 15 }, // Config Time
      { wch: 15 }, // Expected Time
      { wch: 18 }, // Actual vs Expected
      { wch: 12 }, // Efficiency %
      { wch: 12 }, // Run Rate
      { wch: 25 }, // Chetan Remarks
      { wch: 15 }, // Ganesh
      { wch: 25 }, // Final Remarks
    ];

    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Records');
  }

  // Portal-wise Summary Sheet
  if (employeeData.detailedRecords && employeeData.detailedRecords.length > 0) {
    const portalSummary: { [portalName: string]: { items: number; time: number } } = {};
    
    employeeData.detailedRecords.forEach((record) => {
      const portalName = record.portal || 'Unknown';
      if (!portalSummary[portalName]) {
        portalSummary[portalName] = { items: 0, time: 0 };
      }
      portalSummary[portalName].items += record.quantity;
      portalSummary[portalName].time += record.duration;
    });

    const portalData = [
      ['Portal-wise Summary'],
      [''],
      ['Portal Name', 'Total Items', 'Total Time', 'Average Rate (s/item)'],
    ];

    Object.entries(portalSummary).forEach(([portalName, data]) => {
      portalData.push([
        portalName,
        data.items.toString(),
        formatDuration(data.time),
        data.items > 0 ? (data.time / data.items).toFixed(2) : '0',
      ]);
    });

    const portalSheet = XLSX.utils.aoa_to_sheet(portalData);
    
    // Set column widths
    portalSheet['!cols'] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(workbook, portalSheet, 'Portal Summary');
  }

  return workbook;
}

/**
 * Generate Excel file for all employees report
 */
export function generateAllEmployeesExcel(
  allEmployeesData: EmployeeReport[],
  dateRange: { from: Date; to: Date }
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Consolidated Report Sheet - All employees in one sheet
  const consolidatedData = [
    ['All Employees Consolidated Report'],
    [''],
    ['Report Period:', `${format(dateRange.from, 'dd/MM/yyyy')} to ${format(dateRange.to, 'dd/MM/yyyy')}`],
    ['Generated On:', format(new Date(), 'dd/MM/yyyy hh:mm a')],
    [''],
    [
      'NAME',
      'Task Name',
      'Portal',
      'Quantity',
      'Start Time',
      'Actual End',
      'Duration',
      'Our time (s)',
      'Run Rate (s)',
      'Expected',
      'Actual vs Expected',
    ],
  ];

  allEmployeesData.forEach((employee) => {
    if (employee.detailedRecords.length === 0) return;

    const isFemale = employee.name.toUpperCase() === 'LATA' || employee.name.toUpperCase() === 'VAISHALI';
    const fixedAvailableMinutes = isFemale ? 480 : 540;
    
    let totalExpectedMinutes = 0; // Track total expected time

    // Add employee records
    employee.detailedRecords.forEach((record) => {
      const configTimePerItem = TASK_DURATIONS_SECONDS[record.taskName] || DEFAULT_DURATION_SECONDS;
      const expectedTotalTime = record.quantity > 0 ? record.quantity * configTimePerItem : 0;
      const expectedMinutes = Math.floor(expectedTotalTime / 60);
      
      totalExpectedMinutes += expectedMinutes; // Add to total
      
      // Calculate real efficiency: (Expected minutes / Fixed Available) × 100
      let realEfficiency = '';
      if (expectedMinutes > 0) {
        const efficiency = (expectedMinutes / fixedAvailableMinutes) * 100;
        realEfficiency = efficiency.toFixed(1);
      }
      
      consolidatedData.push([
        employee.name,
        record.taskName,
        record.portal,
        record.quantity,
        record.startTime,
        record.actualEndTime,
        Math.floor(record.duration / 60), // Duration in minutes (number only)
        configTimePerItem,
        record.runRate.toFixed(2),
        expectedMinutes, // Expected in minutes (number only)
        realEfficiency, // Real efficiency: Expected / 540 or 480
      ]);
    });

    // Add employee summary row
    const workSummary = computeWorkSummary(employee.detailedRecords, isFemale);
    const actualWorkMinutes = Math.floor(workSummary.actualWorkSeconds / 60);
    
    // Calculate overall efficiency: (Total Expected / Fixed Available) × 100
    const overallEfficiency = fixedAvailableMinutes > 0 ? (totalExpectedMinutes / fixedAvailableMinutes) * 100 : 0;
    
    // Calculate correct run rate: total work time (seconds) / total quantity
    const totalRunRate = employee.totalItems > 0 ? (workSummary.actualWorkSeconds / employee.totalItems).toFixed(2) : '0';
    
    consolidatedData.push([
      '',
      '',
      '',
      employee.totalItems,
      '',
      '',
      actualWorkMinutes, // Total work time in minutes
      '',
      totalRunRate, // Total work seconds / Total quantity
      totalExpectedMinutes, // Total expected time (sum of all tasks)
      overallEfficiency.toFixed(1), // (Total Expected / 540 or 480) × 100
    ]);
    
    // Add empty row for spacing
    consolidatedData.push([]);
  });

  const consolidatedSheet = XLSX.utils.aoa_to_sheet(consolidatedData);
  
  // Set column widths
  consolidatedSheet['!cols'] = [
    { wch: 15 }, // NAME
    { wch: 25 }, // Task Name
    { wch: 25 }, // Portal
    { wch: 10 }, // Quantity
    { wch: 12 }, // Start Time
    { wch: 12 }, // Actual End
    { wch: 12 }, // Duration
    { wch: 12 }, // Our time
    { wch: 12 }, // Run Rate
    { wch: 15 }, // Expected
    { wch: 18 }, // Actual vs Expected
  ];

  XLSX.utils.book_append_sheet(workbook, consolidatedSheet, 'Consolidated Report');

  // Overall Summary Sheet
  const overallData = [
    ['All Employees Report'],
    [''],
    ['Report Period:', `${format(dateRange.from, 'dd/MM/yyyy')} to ${format(dateRange.to, 'dd/MM/yyyy')}`],
    ['Generated On:', format(new Date(), 'dd/MM/yyyy hh:mm a')],
    ['Total Employees:', allEmployeesData.length],
    [''],
    ['Employee Summary'],
    ['Employee Name', 'In Time', 'Total Work Time', 'Total Items', 'Avg Run Rate (s/item)', 'Efficiency %', 'Status'],
  ];

  allEmployeesData.forEach((employee) => {
    const isFemale = employee.name.toUpperCase() === 'LATA' || employee.name.toUpperCase() === 'VAISHALI';
    
    const workSummary = computeWorkSummary(employee.detailedRecords, isFemale);
    const inTime = workSummary.earliestInTime;
    const availableWorkMinutes = workSummary.availableWorkMinutes;
    const actualWorkMinutes = Math.floor(workSummary.actualWorkSeconds / 60);
    const overallEfficiency = availableWorkMinutes > 0 ? (actualWorkMinutes / availableWorkMinutes) * 100 : 0;
    
    const status = overallEfficiency >= 90 ? 'Excellent' : overallEfficiency >= 75 ? 'Good' : overallEfficiency >= 60 ? 'Average' : 'Needs Improvement';
    
    overallData.push([
      employee.name,
      inTime,
      formatDuration(employee.totalWorkTime),
      employee.totalItems,
      employee.averageRunRate > 0 ? employee.averageRunRate.toFixed(2) : 'N/A',
      `${overallEfficiency.toFixed(1)}%`,
      status,
    ]);
  });

  const overallSheet = XLSX.utils.aoa_to_sheet(overallData);
  
  // Set column widths
  overallSheet['!cols'] = [
    { wch: 20 }, // Employee Name
    { wch: 12 }, // In Time
    { wch: 18 }, // Total Work Time
    { wch: 15 }, // Total Items
    { wch: 20 }, // Avg Run Rate
    { wch: 15 }, // Efficiency %
    { wch: 20 }, // Status
  ];

  XLSX.utils.book_append_sheet(workbook, overallSheet, 'Overall Summary');

  // Task Configuration Sheet
  const configData = [
    ['Task Configuration'],
    [''],
    ['Generated On:', format(new Date(), 'dd/MM/yyyy hh:mm a')],
    ['Default Duration:', `${DEFAULT_DURATION_SECONDS} seconds`],
    [''],
    ['Task Name', 'Duration (Seconds)', 'Duration (Formatted)', 'Type'],
  ];

  ALL_TASKS.forEach((task) => {
    const duration = TASK_DURATIONS_SECONDS[task] || DEFAULT_DURATION_SECONDS;
    const isDefault = !TASK_DURATIONS_SECONDS[task];
    const formattedDuration = formatDuration(duration);
    
    configData.push([
      task,
      duration.toString(),
      formattedDuration,
      isDefault ? 'Default' : 'Custom',
    ]);
  });

  const configSheet = XLSX.utils.aoa_to_sheet(configData);
  
  // Set column widths
  configSheet['!cols'] = [
    { wch: 30 }, // Task Name
    { wch: 18 }, // Duration (Seconds)
    { wch: 20 }, // Duration (Formatted)
    { wch: 15 }, // Type
  ];

  XLSX.utils.book_append_sheet(workbook, configSheet, 'Task Configuration');

  // Individual employee sheets
  allEmployeesData.forEach((employee) => {
    if (employee.detailedRecords.length === 0) return;

    const employeeData = [
      [`${employee.name} - Detailed Records`],
      [''],
      [
        'Date',
        'Task Name',
        'Portal',
        'Quantity',
        'Start Time',
        'Estimated End',
        'Actual End',
        'Duration',
        'Config Time (s)',
        'Expected Time',
        'Actual vs Expected',
        'Task Efficiency %',
        'Run Rate (s)',
        'Chetan Remarks',
        'Ganesh',
        'Final Remarks',
      ],
    ];

    employee.detailedRecords.forEach((record) => {
      // Get configured time per item for this task
      const configTimePerItem = TASK_DURATIONS_SECONDS[record.taskName] || DEFAULT_DURATION_SECONDS;
      const expectedTotalTime = record.quantity > 0 ? record.quantity * configTimePerItem : 0;
      const actualTime = record.duration;
      
      // Calculate task efficiency
      let taskEfficiency = 0;
      let taskEfficiencyStatus = 'N/A';
      if (expectedTotalTime > 0 && actualTime > 0) {
        // Task Efficiency = (Expected / Actual) * 100
        // If actual < expected, efficiency > 100% (good - faster than expected)
        // If actual > expected, efficiency < 100% (needs improvement - slower than expected)
        taskEfficiency = (expectedTotalTime / actualTime) * 100;
        taskEfficiencyStatus = `${taskEfficiency.toFixed(1)}%`;
      }
      
      // Actual vs Expected comparison
      let comparison = 'N/A';
      if (expectedTotalTime > 0 && actualTime > 0) {
        const diff = actualTime - expectedTotalTime;
        if (diff > 0) {
          comparison = `+${formatDuration(diff)} (Slower)`;
        } else if (diff < 0) {
          comparison = `${formatDuration(Math.abs(diff))} (Faster)`;
        } else {
          comparison = 'On Target';
        }
      }
      
      employeeData.push([
        record.date,
        record.taskName,
        record.portal,
        record.quantity.toString(),
        record.startTime,
        record.estimatedEndTime,
        record.actualEndTime,
        formatDuration(record.duration),
        configTimePerItem.toString(),
        formatDuration(expectedTotalTime),
        comparison,
        taskEfficiencyStatus,
        record.runRate.toFixed(2),
        record.chetanRemarks || '',
        record.ganesh || '',
        record.finalRemarks || '',
      ]);
    });

    const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);
    
    // Set column widths
    employeeSheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Task Name
      { wch: 20 }, // Portal
      { wch: 10 }, // Quantity
      { wch: 12 }, // Start Time
      { wch: 12 }, // Estimated End
      { wch: 12 }, // Actual End
      { wch: 12 }, // Duration
      { wch: 15 }, // Config Time
      { wch: 15 }, // Expected Time
      { wch: 18 }, // Actual vs Expected
      { wch: 16 }, // Task Efficiency %
      { wch: 12 }, // Run Rate
      { wch: 25 }, // Chetan Remarks
      { wch: 15 }, // Ganesh
      { wch: 25 }, // Final Remarks
    ];

    // Sanitize sheet name (max 31 chars, no special chars)
    const sheetName = employee.name.substring(0, 31).replace(/[:\\/?*\[\]]/g, '_');
    XLSX.utils.book_append_sheet(workbook, employeeSheet, sheetName);
  });

  return workbook;
}

/**
 * Download Excel file
 */
export function downloadExcel(workbook: XLSX.WorkBook, filename: string): void {
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Create blob
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

