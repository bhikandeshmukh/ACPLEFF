'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Home, User, Loader2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { employees } from '@/lib/config';
import { EmployeeReportCard } from '@/components/employee-report-card';
import { getEmployeeReport, type EmployeeReport } from '@/app/server-actions';
import { generateAllEmployeesPDF, downloadPDF } from '@/lib/pdf-utils';
import { Download } from 'lucide-react';

export default function ReportPage() {
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [reportParams, setReportParams] = useState<{date: DateRange, employee: string, timestamp: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingAllPDF, setDownloadingAllPDF] = useState(false);

  function generateReport() {
    if (date?.from) {
      setLoading(true);
      
      // Fix timezone issue - ensure dates are in local timezone
      const fromDate = new Date(date.from);
      const toDate = date.to ? new Date(date.to) : new Date(date.from);
      
      // Set to noon local time to avoid timezone conversion issues
      fromDate.setHours(12, 0, 0, 0);
      toDate.setHours(12, 0, 0, 0);
      
      const reportDateRange = { from: fromDate, to: toDate };
      
      console.log('🔄 Generating report for dates:', format(fromDate, 'dd/MM/yyyy'), 'to', format(toDate, 'dd/MM/yyyy'));
      
      // Add timestamp to force fresh data fetch
      setReportParams({ date: reportDateRange, employee: selectedEmployee, timestamp: Date.now() });
      
      // The actual data fetching will be handled by the child components.
      // We can turn off the main loader after a short delay.
      setTimeout(() => setLoading(false), 500);
    }
  }
  
  const employeesToShow = selectedEmployee === 'All' 
    ? employees.map(e => e.name) 
    : [selectedEmployee];

  const handleDownloadAllPDF = async () => {
    if (!reportParams?.date.from) return;
    
    setDownloadingAllPDF(true);
    try {
      const allEmployeesData: EmployeeReport[] = [];
      
      // Fetch data for all employees (include those without data)
      for (const employeeName of employeesToShow) {
        const employeeData = await getEmployeeReport(reportParams.date as { from: Date; to: Date }, employeeName);
        if (employeeData) {
          allEmployeesData.push(employeeData);
        } else {
          // Create empty report for employees with no data
          const emptyReport: EmployeeReport = {
            name: employeeName,
            totalWorkTime: 0,
            totalItems: 0,
            averageRunRate: 0,
            tasks: {},
            detailedRecords: []
          };
          allEmployeesData.push(emptyReport);
        }
      }
      
      // Always generate PDF since we now include all employees (even with no data)
      const pdf = await generateAllEmployeesPDF(allEmployeesData, reportParams.date as { from: Date; to: Date });
      const fromDate = format(reportParams.date.from, 'dd-MM-yyyy');
      const toDate = format(reportParams.date.to || reportParams.date.from, 'dd-MM-yyyy');
      const filename = selectedEmployee === 'All' 
        ? `All_Employees_Report_${fromDate}_to_${toDate}.pdf`
        : `${selectedEmployee}_Report_${fromDate}_to_${toDate}.pdf`;
      downloadPDF(pdf, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloadingAllPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Efficiency Report</h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                Analyze employee performance over a selected date range.
              </p>
            </div>
            <Link href="/">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 h-9 sm:h-10 px-3 sm:px-4 transition-colors">
                <Home className="h-4 w-4" />
                <span className="hidden xs:inline">Back to Home</span>
                <span className="xs:hidden">Home</span>
              </button>
            </Link>
          </header>

          {/* Controls Card */}
          <Card className="mb-6 sm:mb-8">
            <CardContent className="pt-4 sm:pt-6">
              <div className="space-y-4 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
                {/* Date Range Picker */}
                <div className="flex-1 space-y-2">
                  <label htmlFor="date-picker" className="block font-medium text-sm">
                    Select Date Range
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        id="date"
                        className={cn(
                          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-3 sm:px-4 w-full justify-start text-left font-normal',
                          !date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                          date.to ? (
                            <>
                              {format(date.from, 'LLL dd, y')} -{' '}
                              {format(date.to, 'LLL dd, y')}
                            </>
                          ) : (
                            format(date.from, 'LLL dd, y')
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Employee Selection */}
                <div className="flex-1 space-y-2">
                  <label htmlFor="employee-select" className="block font-medium text-sm">
                    Select Employee
                  </label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger id="employee-select" className="h-10">
                      <User className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Employees</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={generateReport} 
                    disabled={loading || !date?.from}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 h-10 px-4 transition-colors disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    View Report
                  </button>
                  {reportParams && (
                    <button
                      onClick={handleDownloadAllPDF} 
                      disabled={downloadingAllPDF || !reportParams?.date.from}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 transition-colors disabled:pointer-events-none disabled:opacity-50"
                    >
                      {downloadingAllPDF ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download PDF
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-8 sm:p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground text-sm sm:text-base">Generating report, please wait...</p>
              </div>
            </div>
          )}

          {/* Reports */}
          {reportParams && !loading && (
            <div className="w-full space-y-4">
              {reportParams.date.from && employeesToShow.map(employeeName => (
                <EmployeeReportCard 
                  key={`${employeeName}-${reportParams.timestamp}`}
                  employeeName={employeeName}
                  dateRange={reportParams.date as { from: Date; to: Date; }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
