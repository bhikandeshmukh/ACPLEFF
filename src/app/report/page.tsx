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


export default function ReportPage() {
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [reportParams, setReportParams] = useState<{date: DateRange, employee: string} | null>(null);
  const [loading, setLoading] = useState(false);

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
            <Button variant="outline"><Home className="mr-2 h-4 w-4" />Back to Home</Button>
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
                        <Button
                            id="date"
                            variant={'outline'}
                            className={cn(
                            'w-full sm:w-[300px] justify-start text-left font-normal',
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
                        </Button>
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
               <Button onClick={generateReport} disabled={loading || !date?.from} className="self-end">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                View Report
              </Button>
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
