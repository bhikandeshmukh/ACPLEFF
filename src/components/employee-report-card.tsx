
'use client';

import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Loader2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getEmployeeReport, type EmployeeReport } from '@/app/server-actions';

type EmployeeReportCardProps = {
  employeeName: string;
  dateRange: DateRange;
};

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

export function EmployeeReportCard({ employeeName, dateRange }: EmployeeReportCardProps) {
  const [reportData, setReportData] = useState<EmployeeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      const { from, to } = dateRange;
      if (!from) return;

      const effectiveTo = to ?? from;
      
      setLoading(true);
      setError(null);
      setReportData(null);

      try {
        const data = await getEmployeeReport({ from: from, to: effectiveTo }, employeeName);
        setReportData(data);
      } catch (err: any) {
        console.error(`Failed to fetch report for ${employeeName}:`, err);
        setError('Could not load report data.');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [employeeName, dateRange]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{employeeName}</CardTitle>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardHeader>
      </Card>
    );
  }

  if (error) {
     return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-destructive">{employeeName}</CardTitle>
           <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!reportData) {
     return (
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={employeeName} className="border rounded-lg">
           <AccordionTrigger className="p-4 bg-card rounded-lg text-lg font-medium hover:no-underline data-[state=closed]:text-muted-foreground">
             <div className="flex justify-between w-full pr-4">
                <span>{employeeName}</span>
                <span className="text-sm font-normal">
                No data available
                </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 text-center text-muted-foreground">
            No work records found for the selected period.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <Accordion type="single" collapsible defaultValue={employeeName} className="w-full">
      <AccordionItem value={employeeName} className="border rounded-lg">
        <AccordionTrigger className="p-4 bg-card rounded-lg text-lg font-medium hover:no-underline">
          <div className="flex justify-between w-full pr-4">
            <span>{reportData.name}</span>
            <span className="text-sm text-muted-foreground font-normal">
              Work Time: {formatDuration(reportData.totalWorkTime)}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-4">
             <Card>
              <CardHeader>
                <CardTitle className="text-base">Overall Performance</CardTitle>
                <CardDescription>Aggregated across all tasks</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-2 text-sm">
                   <div className="flex justify-between">
                    <span className="font-medium">Total Work Time:</span>
                    <span className="font-semibold">{formatDuration(reportData.totalWorkTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Items:</span>
                    <span>{reportData.totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Avg. Run Rate:</span>
                     <span>{reportData.averageRunRate > 0 ? `${reportData.averageRunRate.toFixed(2)}s / item` : 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Breakdown</CardTitle>
                <CardDescription>Performance per task</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Task</TableHead>
                      <TableHead className="text-right px-4">Qty</TableHead>
                      <TableHead className="text-right px-4">Run Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(reportData.tasks).map(([taskName, taskDetails]) => (
                      <TableRow key={taskName}>
                        <TableCell className="font-medium px-4">{taskName}</TableCell>
                        <TableCell className="text-right px-4">{taskDetails.quantity}</TableCell>
                        <TableCell className="text-right px-4">{taskDetails.runRate.toFixed(2)}s</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
