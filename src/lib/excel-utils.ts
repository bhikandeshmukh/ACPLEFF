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
 * Generate Excel file for single employee report
 */
export function generateEmployeeExcel(
  employeeData: EmployeeReport,
  dateRange: { from: Date; to: Date }
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Calculate efficiency metrics
  const isFemale = employeeData.name.toUpperCase() === 'LATA' || employeeData.name.toUpperCase() === 'VAISHALI';
  const maxWorkMinutes = 540; // 9 hours net work time for all
  const totalActualMinutes = Math.floor(employeeData.totalWorkTime / 60);
  const overallEfficiency = maxWorkMinutes > 0 ? (totalActualMinutes / maxWorkMinutes) * 100 : 0;
  
  // Find first task start time (in time)
  let inTime = 'N/A';
  if (employeeData.detailedRecords.length > 0) {
    // Records are already sorted by date and time
    inTime = employeeData.detailedRecords[0].startTime;
  }

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
    ['Work Hours:', isFemale ? '9:00 AM - 6:00 PM (9 hours)' : '9:00 AM - 7:00 PM (10 hours)'],
    ['Breaks:', '60 minutes (Lunch 30m + Tea 15m x 2)'],
    ['Net Work Time:', '540 minutes (9 hours)'],
    ['In Time:', inTime],
    [''],
    ['Overall Performance'],
    ['Total Work Time:', formatDuration(employeeData.totalWorkTime)],
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
    // Check if employee is female (Lata or Vaishali)
    const isFemale = employeeData.name.toUpperCase() === 'LATA' || employeeData.name.toUpperCase() === 'VAISHALI';
    const maxWorkMinutes = 540; // 9 hours net work time (after breaks) for all
    
    const detailedData = [
      ['Detailed Task Records'],
      [''],
      ['Employee:', employeeData.name],
      ['Gender:', isFemale ? 'Female' : 'Male'],
      ['Work Hours:', isFemale ? '9:00 AM - 6:00 PM (9 hours)' : '9:00 AM - 7:00 PM (10 hours)'],
      ['Breaks:', '60 minutes (Lunch 30m + Tea 15m x 2)'],
      ['Net Work Time:', '540 minutes (9 hours)'],
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
    const totalActualMinutes = Math.floor(employeeData.totalWorkTime / 60);
    const overallEfficiency = (totalActualMinutes / maxWorkMinutes) * 100;
    
    detailedData.push([]);
    detailedData.push(['OVERALL EFFICIENCY']);
    detailedData.push(['Total Actual Work Time:', formatDuration(employeeData.totalWorkTime)]);
    detailedData.push(['Maximum Work Time:', `${maxWorkMinutes} minutes (9 hours)`]);
    detailedData.push(['Efficiency:', `${overallEfficiency.toFixed(1)}%`]);
    detailedData.push(['Status:', overallEfficiency >= 90 ? 'Excellent' : overallEfficiency >= 75 ? 'Good' : overallEfficiency >= 60 ? 'Average' : 'Needs Improvement']);

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
    const maxWorkMinutes = 540; // 9 hours net work time for all
    const totalActualMinutes = Math.floor(employee.totalWorkTime / 60);
    const overallEfficiency = maxWorkMinutes > 0 ? (totalActualMinutes / maxWorkMinutes) * 100 : 0;
    
    // Find first task start time (in time)
    let inTime = 'N/A';
    if (employee.detailedRecords.length > 0) {
      inTime = employee.detailedRecords[0].startTime;
    }
    
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
        'Run Rate (s)',
        'Chetan Remarks',
        'Ganesh',
        'Final Remarks',
      ],
    ];

    employee.detailedRecords.forEach((record) => {
      employeeData.push([
        record.date,
        record.taskName,
        record.portal,
        record.quantity.toString(),
        record.startTime,
        record.estimatedEndTime,
        record.actualEndTime,
        formatDuration(record.duration),
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
