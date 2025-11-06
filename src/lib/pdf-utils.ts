import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import type { EmployeeReport } from '@/app/server-actions';

export async function generateEmployeePDF(employeeData: EmployeeReport, dateRange: { from: Date; to: Date }) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Employee Efficiency Report', pageWidth / 2, 20, { align: 'center' });
  
  // Employee name and date range
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Employee: ${employeeData.name}`, 20, 35);
  pdf.text(`Period: ${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`, 20, 45);
  
  // Summary section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary:', 20, 60);
  
  pdf.setFont('helvetica', 'normal');
  const totalHours = Math.floor(employeeData.totalWorkTime / 3600);
  const totalMinutes = Math.floor((employeeData.totalWorkTime % 3600) / 60);
  
  // Handle no data cases
  const workTimeDisplay = employeeData.totalWorkTime > 0 ? `${totalHours}h ${totalMinutes}m` : 'No Data Available';
  const itemsDisplay = employeeData.totalItems > 0 ? employeeData.totalItems.toString() : 'No Data Available';
  const rateDisplay = employeeData.averageRunRate > 0 ? `${employeeData.averageRunRate.toFixed(2)}s/item` : 'No Data Available';
  
  pdf.text(`Total Work Time: ${workTimeDisplay}`, 20, 70);
  pdf.text(`Total Items: ${itemsDisplay}`, 20, 80);
  pdf.text(`Average Run Rate: ${rateDisplay}`, 20, 90);
  
  // Task breakdown
  pdf.setFont('helvetica', 'bold');
  pdf.text('Task Breakdown:', 20, 105);
  
  let yPos = 115;
  pdf.setFont('helvetica', 'normal');
  
  if (Object.keys(employeeData.tasks).length > 0) {
    Object.entries(employeeData.tasks).forEach(([taskName, taskDetails]) => {
      pdf.text(`${taskName}: ${taskDetails.quantity} items, ${taskDetails.runRate.toFixed(2)}s/item`, 20, yPos);
      yPos += 10;
    });
  } else {
    pdf.text('No task data available for this period', 20, yPos);
    yPos += 10;
  }

  // Portal-wise breakdown for individual employee
  if (employeeData.detailedRecords && employeeData.detailedRecords.length > 0) {
    yPos += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Portal-wise Breakdown:', 20, yPos);
    yPos += 10;

    // Calculate portal-wise data
    const portalBreakdown: { [portalName: string]: { items: number; time: number } } = {};
    
    employeeData.detailedRecords.forEach((record) => {
      const portalName = record.portal || 'Unknown';
      if (!portalBreakdown[portalName]) {
        portalBreakdown[portalName] = { items: 0, time: 0 };
      }
      portalBreakdown[portalName].items += record.quantity;
      portalBreakdown[portalName].time += record.duration;
    });

    pdf.setFont('helvetica', 'normal');
    Object.entries(portalBreakdown).forEach(([portalName, data]) => {
      const avgRate = data.items > 0 ? (data.time / data.items).toFixed(2) : '0';
      pdf.text(`${portalName}: ${data.items} items, ${avgRate}s/item`, 20, yPos);
      yPos += 10;
    });
  }
  
  // Detailed records table
  if (employeeData.detailedRecords && employeeData.detailedRecords.length > 0) {
    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Detailed Records:', 20, yPos);
    yPos += 10;
    
    // Table headers
    pdf.setFontSize(8);
    const headers = ['Date', 'Task', 'Portal', 'Qty', 'Start', 'Est End', 'Act End', 'Remarks'];
    const colWidths = [25, 25, 30, 15, 20, 20, 20, 35];
    let xPos = 20;
    
    headers.forEach((header, i) => {
      pdf.text(header, xPos, yPos);
      xPos += colWidths[i];
    });
    
    yPos += 5;
    pdf.line(20, yPos, pageWidth - 20, yPos); // Header line
    yPos += 5;
    
    // Table data
    pdf.setFont('helvetica', 'normal');
    employeeData.detailedRecords.forEach((record) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = 20;
      }
      
      xPos = 20;
      const rowData = [
        record.date,
        record.taskName,
        record.portal,
        record.quantity.toString(),
        record.startTime,
        record.estimatedEndTime,
        record.actualEndTime,
        record.chetanRemarks || '-'
      ];
      
      rowData.forEach((data, i) => {
        const text = data.length > 12 ? data.substring(0, 12) + '...' : data;
        pdf.text(text, xPos, yPos);
        xPos += colWidths[i];
      });
      yPos += 8;
    });
  }
  
  // Footer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 20, pageHeight - 10);
  
  return pdf;
}

export async function generateAllEmployeesPDF(employeesData: EmployeeReport[], dateRange: { from: Date; to: Date }) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('All Employees Efficiency Report', pageWidth / 2, 20, { align: 'center' });
  
  // Date range
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Period: ${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`, pageWidth / 2, 35, { align: 'center' });
  
  let yPos = 50;
  
  // Summary table for all employees
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary by Employee:', 20, yPos);
  yPos += 10;
  
  // Table headers
  pdf.setFontSize(10);
  const headers = ['Employee', 'Work Time', 'Items', 'Avg Rate'];
  const colWidths = [40, 40, 30, 40];
  let xPos = 20;
  
  headers.forEach((header, i) => {
    pdf.text(header, xPos, yPos);
    xPos += colWidths[i];
  });
  
  yPos += 5;
  pdf.line(20, yPos, 170, yPos);
  yPos += 8;
  
  // Employee summary data
  pdf.setFont('helvetica', 'normal');
  employeesData.forEach((employee) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      yPos = 20;
    }
    
    xPos = 20;
    const totalHours = Math.floor(employee.totalWorkTime / 3600);
    const totalMinutes = Math.floor((employee.totalWorkTime % 3600) / 60);
    
    // Handle employees with no data
    const workTimeDisplay = employee.totalWorkTime > 0 ? `${totalHours}h ${totalMinutes}m` : 'No Data';
    const itemsDisplay = employee.totalItems > 0 ? employee.totalItems.toString() : 'No Data';
    const rateDisplay = employee.averageRunRate > 0 ? `${employee.averageRunRate.toFixed(2)}s/item` : 'No Data';
    
    const rowData = [
      employee.name,
      workTimeDisplay,
      itemsDisplay,
      rateDisplay
    ];
    
    rowData.forEach((data, i) => {
      pdf.text(data, xPos, yPos);
      xPos += colWidths[i];
    });
    yPos += 8;
  });

  // Task-wise Summary
  yPos += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Task-wise Summary:', 20, yPos);
  yPos += 10;

  // Collect all tasks across employees
  const taskSummary: { [taskName: string]: { totalItems: number; totalTime: number; employees: string[] } } = {};
  
  employeesData.forEach((employee) => {
    Object.entries(employee.tasks).forEach(([taskName, taskData]) => {
      if (!taskSummary[taskName]) {
        taskSummary[taskName] = { totalItems: 0, totalTime: 0, employees: [] };
      }
      taskSummary[taskName].totalItems += taskData.quantity;
      taskSummary[taskName].totalTime += taskData.duration;
      if (!taskSummary[taskName].employees.includes(employee.name)) {
        taskSummary[taskName].employees.push(employee.name);
      }
    });
  });

  // Task summary headers
  pdf.setFontSize(9);
  const taskHeaders = ['Task', 'Total Items', 'Avg Rate', 'Employees'];
  const taskColWidths = [35, 25, 25, 65];
  xPos = 20;
  
  taskHeaders.forEach((header, i) => {
    pdf.text(header, xPos, yPos);
    xPos += taskColWidths[i];
  });
  
  yPos += 5;
  pdf.line(20, yPos, 170, yPos);
  yPos += 5;

  // Task summary data
  pdf.setFont('helvetica', 'normal');
  Object.entries(taskSummary).forEach(([taskName, taskData]) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      yPos = 20;
    }
    
    xPos = 20;
    const avgRate = taskData.totalItems > 0 ? (taskData.totalTime / taskData.totalItems).toFixed(2) : '0';
    const employeeList = taskData.employees.join(', ');
    
    const taskRowData = [
      taskName,
      taskData.totalItems.toString(),
      `${avgRate}s/item`,
      employeeList.length > 25 ? employeeList.substring(0, 25) + '...' : employeeList
    ];
    
    taskRowData.forEach((data, i) => {
      pdf.text(data, xPos, yPos);
      xPos += taskColWidths[i];
    });
    yPos += 8;
  });

  // Portal-wise Summary
  yPos += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Portal-wise Summary:', 20, yPos);
  yPos += 10;

  // Collect portal data from detailed records
  const portalSummary: { [portalName: string]: { totalItems: number; totalTime: number; employees: string[] } } = {};
  
  employeesData.forEach((employee) => {
    if (employee.detailedRecords) {
      employee.detailedRecords.forEach((record) => {
        const portalName = record.portal || 'Unknown';
        if (!portalSummary[portalName]) {
          portalSummary[portalName] = { totalItems: 0, totalTime: 0, employees: [] };
        }
        portalSummary[portalName].totalItems += record.quantity;
        portalSummary[portalName].totalTime += record.duration;
        if (!portalSummary[portalName].employees.includes(employee.name)) {
          portalSummary[portalName].employees.push(employee.name);
        }
      });
    }
  });

  // Portal summary headers
  pdf.setFontSize(9);
  const portalHeaders = ['Portal', 'Total Items', 'Avg Rate', 'Employees'];
  const portalColWidths = [40, 25, 25, 60];
  xPos = 20;
  
  portalHeaders.forEach((header, i) => {
    pdf.text(header, xPos, yPos);
    xPos += portalColWidths[i];
  });
  
  yPos += 5;
  pdf.line(20, yPos, 170, yPos);
  yPos += 5;

  // Portal summary data
  pdf.setFont('helvetica', 'normal');
  Object.entries(portalSummary).forEach(([portalName, portalData]) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      yPos = 20;
    }
    
    xPos = 20;
    const avgRate = portalData.totalItems > 0 ? (portalData.totalTime / portalData.totalItems).toFixed(2) : '0';
    const employeeList = portalData.employees.join(', ');
    
    const portalRowData = [
      portalName,
      portalData.totalItems.toString(),
      `${avgRate}s/item`,
      employeeList.length > 22 ? employeeList.substring(0, 22) + '...' : employeeList
    ];
    
    portalRowData.forEach((data, i) => {
      pdf.text(data, xPos, yPos);
      xPos += portalColWidths[i];
    });
    yPos += 8;
  });
  
  // Detailed breakdown for each employee
  employeesData.forEach((employee, index) => {
    if (employee.detailedRecords && employee.detailedRecords.length > 0) {
      pdf.addPage();
      yPos = 20;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${employee.name} - Detailed Records`, 20, yPos);
      yPos += 15;
      
      // Detailed records table (same as individual report)
      pdf.setFontSize(8);
      const detailHeaders = ['Date', 'Task', 'Portal', 'Qty', 'Start', 'Est End', 'Act End', 'Remarks'];
      const detailColWidths = [25, 25, 30, 15, 20, 20, 20, 35];
      xPos = 20;
      
      detailHeaders.forEach((header, i) => {
        pdf.text(header, xPos, yPos);
        xPos += detailColWidths[i];
      });
      
      yPos += 5;
      pdf.line(20, yPos, pageWidth - 20, yPos);
      yPos += 5;
      
      pdf.setFont('helvetica', 'normal');
      employee.detailedRecords.forEach((record) => {
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = 20;
        }
        
        xPos = 20;
        const rowData = [
          record.date,
          record.taskName,
          record.portal,
          record.quantity.toString(),
          record.startTime,
          record.estimatedEndTime,
          record.actualEndTime,
          record.chetanRemarks || '-'
        ];
        
        rowData.forEach((data, i) => {
          const text = data.length > 12 ? data.substring(0, 12) + '...' : data;
          pdf.text(text, xPos, yPos);
          xPos += detailColWidths[i];
        });
        yPos += 8;
      });
    }
  });
  
  // Footer on last page
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 20, pageHeight - 10);
  
  return pdf;
}

export function downloadPDF(pdf: jsPDF, filename: string) {
  pdf.save(filename);
}