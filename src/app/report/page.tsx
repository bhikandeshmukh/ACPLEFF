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
  const [reportParams, setReportParams] = useState<{date: DateRange, employee: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingAllPDF, setDownloadingAllPDF] = useState(false);

  function generateReport() {
    if (date?.from) {
      setLoading(true);
      const reportDateRange = { ...date, to: date.to ?? date.from };
      setReportParams({ date: reportDateRange, employee: selectedEmployee });
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
      
      // Fetch data for all employees
      for (const employeeName of employeesToShow) {
        const employeeData = await getEmployeeReport(reportParams.date as { from: Date; to: Date }, employeeName);
        if (employeeData) {
          allEmployeesData.push(employeeData);
        }
      }
      
      if (allEmployeesData.length > 0) {
        const pdf = await generateAllEmployeesPDF(allEmployeesData, reportParams.date as { from: Date; to: Date });
        const filename = selectedEmployee === 'All' 
          ? `All_Employees_Report_${reportParams.date.from.toISOString().split('T')[0]}_to_${reportParams.date.to?.toISOString().split('T')[0] || reportParams.date.from.toISOString().split('T')[0]}.pdf`
          : `${selectedEmployee}_Report_${reportParams.date.from.toISOString().split('T')[0]}_to_${reportParams.date.to?.toISOString().split('T')[0] || reportParams.date.from.toISOString().split('T')[0]}.pdf`;
        downloadPDF(pdf, filename);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloadingAllPDF(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl">
        <header className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Efficiency Report</h1>
            <p className="text-muted-foreground">
              Analyze employee performance over a selected date range.
            </p>
          </div>
           <Link href="/" passHref>
            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              <Home className="mr-2 h-4 w-4" />Back to Home
            </button>
          </Link>
        </header>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="grid gap-2 flex-1">
                    <label htmlFor="date-picker" className="font-medium text-sm">
                        Select Date Range
                    </label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <button
                            id="date"
                            className={cn(
                            'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full sm:w-[300px] justify-start text-left font-normal',
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
                <div className="grid gap-2 flex-1">
                    <label htmlFor="employee-select" className="font-medium text-sm">
                        Select Employee
                    </label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger id="employee-select" className="w-full sm:w-[300px]">
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
              <div className="flex gap-2 self-end">
                <Button onClick={generateReport} disabled={loading || !date?.from}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  View Report
                </Button>
                {reportParams && (
                  <button
                    onClick={handleDownloadAllPDF} 
                    disabled={downloadingAllPDF || !reportParams?.date.from}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 disabled:pointer-events-none disabled:opacity-50"
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

        {loading && (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Generating report, please wait...</p>
            </div>
          </div>
        )}

        {reportParams && !loading && (
           <div className="w-full space-y-4">
            {reportParams.date.from && employeesToShow.map(employeeName => (
              <EmployeeReportCard 
                key={employeeName}
                employeeName={employeeName}
                dateRange={reportParams.date as { from: Date; to: Date; }}
              />
            ))}
           </div>
        )}
      </div>
    </div>
  );
}
