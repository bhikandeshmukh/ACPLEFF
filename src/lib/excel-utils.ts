/**
 * Excel Export Utilities
 * Generate Excel files from report data
 */

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { EmployeeReport } from '@/app/server-actions';

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

  // Summary Sheet
  const summaryData = [
    ['Employee Report'],
    [''],
    ['Employee Name:', employeeData.name],
    ['Report Period:', `${format(dateRange.from, 'dd/MM/yyyy')} to ${format(dateRange.to, 'dd/MM/yyyy')}`],
    ['Generated On:', format(new Date(), 'dd/MM/yyyy hh:mm a')],
    [''],
    ['Overall Performance'],
    ['Total Work Time:', formatDuration(employeeData.totalWorkTime)],
    ['Total Items:', employeeData.totalItems],
    ['Average Run Rate:', employeeData.averageRunRate > 0 ? `${employeeData.averageRunRate.toFixed(2)}s / item` : 'N/A'],
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
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Detailed Records Sheet
  if (employeeData.detailedRecords && employeeData.detailedRecords.length > 0) {
    const detailedData = [
      ['Detailed Task Records'],
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

    employeeData.detailedRecords.forEach((record) => {
      detailedData.push([
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
    ['Employee Name', 'Total Work Time', 'Total Items', 'Avg Run Rate (s/item)', 'Tasks Completed'],
  ];

  allEmployeesData.forEach((employee) => {
    overallData.push([
      employee.name,
      formatDuration(employee.totalWorkTime),
      employee.totalItems,
      employee.averageRunRate > 0 ? employee.averageRunRate.toFixed(2) : 'N/A',
      employee.detailedRecords.length,
    ]);
  });

  const overallSheet = XLSX.utils.aoa_to_sheet(overallData);
  
  // Set column widths
  overallSheet['!cols'] = [
    { wch: 20 },
    { wch: 18 },
    { wch: 15 },
    { wch: 20 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(workbook, overallSheet, 'Overall Summary');

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
