
'use client';

import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Loader2 } from 'lucide-react';
import { TASK_DURATIONS_SECONDS, DEFAULT_DURATION_SECONDS } from '@/lib/config';
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
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getEmployeeReport, type EmployeeReport, type TaskRecord } from '@/app/server-actions';
import { generateEmployeePDF, downloadPDF } from '@/lib/pdf-utils';
import { generateEmployeeExcel, downloadExcel } from '@/lib/excel-utils';
import { format } from 'date-fns';
import { Download, FileSpreadsheet } from 'lucide-react';

type EmployeeReportCardProps = {
  employeeName: string;
  dateRange: { from: Date; to: Date };
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
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      const { from, to } = dateRange;
      if (!from) return;

      const effectiveTo = to || from;
      
      setLoading(true);
      setError(null);
      setReportData(null);

      try {
        console.log(`🔄 Fetching LIVE report for ${employeeName} from ${format(from, 'dd/MM/yyyy')} to ${format(effectiveTo, 'dd/MM/yyyy')}`);
        console.log(`⏰ Fetch timestamp:`, new Date().toISOString());
        const data = await getEmployeeReport({ from, to: effectiveTo }, employeeName);
        console.log(`✅ Report data received for ${employeeName}:`, data ? `${data.detailedRecords.length} records` : 'No data');
        setReportData(data);
      } catch (err: any) {
        console.error(`❌ Failed to fetch report for ${employeeName}:`, err);
        setError('Could not load report data.');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [employeeName, dateRange]);

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    
    setDownloadingPDF(true);
    try {
      const pdf = await generateEmployeePDF(reportData, dateRange);
      const filename = `${employeeName}_Report_${format(dateRange.from, 'dd-MM-yyyy')}_to_${format(dateRange.to, 'dd-MM-yyyy')}.pdf`;
      downloadPDF(pdf, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!reportData) return;
    
    setDownloadingExcel(true);
    try {
      const workbook = generateEmployeeExcel(reportData, dateRange);
      const filename = `${employeeName}_Report_${format(dateRange.from, 'dd-MM-yyyy')}_to_${format(dateRange.to, 'dd-MM-yyyy')}.xlsx`;
      downloadExcel(workbook, filename);
    } catch (error) {
      console.error('Error generating Excel:', error);
    } finally {
      setDownloadingExcel(false);
    }
  };

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
            <div className="space-y-2">
              <p>No work records found for the selected period.</p>
              <p className="text-sm">Try submitting some task records first or selecting a different date range.</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <Accordion type="single" collapsible defaultValue={employeeName} className="w-full">
      <AccordionItem value={employeeName} className="border rounded-lg">
        <div className="flex items-center justify-between p-4 bg-card rounded-t-lg">
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium">{reportData.name}</span>
            <span className="text-sm text-muted-foreground">
              Work Time: {formatDuration(reportData.totalWorkTime)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 disabled:pointer-events-none disabled:opacity-50"
            >
              {downloadingPDF ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              PDF
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 h-9 px-3 disabled:pointer-events-none disabled:opacity-50"
            >
              {downloadingExcel ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <FileSpreadsheet className="h-3 w-3 mr-1" />
              )}
              Excel
            </button>
          </div>
        </div>
        <AccordionTrigger className="px-4 pb-2 text-sm font-medium hover:no-underline">
          <span>View Details</span>
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
                      <TableHead className="text-right px-4">Config</TableHead>
                      <TableHead className="text-right px-4">Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(reportData.tasks).map(([taskName, taskDetails]) => {
                      const configuredDuration = TASK_DURATIONS_SECONDS[taskName] || DEFAULT_DURATION_SECONDS;
                      const actualRate = taskDetails.runRate;
                      const isOverTarget = actualRate > configuredDuration;
                      
                      return (
                        <TableRow key={taskName}>
                          <TableCell className="font-medium px-4">{taskName}</TableCell>
                          <TableCell className="text-right px-4">{taskDetails.quantity}</TableCell>
                          <TableCell className="text-right px-4 text-muted-foreground">
                            {configuredDuration}s
                          </TableCell>
                          <TableCell className={`text-right px-4 font-medium ${
                            isOverTarget ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {actualRate.toFixed(2)}s
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Portal-wise Summary */}
          {reportData.detailedRecords && reportData.detailedRecords.length > 0 && (() => {
            const portalSummary: { [portalName: string]: { items: number; time: number } } = {};
            
            reportData.detailedRecords.forEach((record) => {
              const portalName = record.portal || 'Unknown';
              if (!portalSummary[portalName]) {
                portalSummary[portalName] = { items: 0, time: 0 };
              }
              portalSummary[portalName].items += record.quantity;
              portalSummary[portalName].time += record.duration;
            });

            return (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Portal-wise Summary</CardTitle>
                  <CardDescription>Performance per portal</CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Portal</TableHead>
                        <TableHead className="text-right px-4">Items</TableHead>
                        <TableHead className="text-right px-4">Avg Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(portalSummary).map(([portalName, data]) => (
                        <TableRow key={portalName}>
                          <TableCell className="font-medium px-4">{portalName}</TableCell>
                          <TableCell className="text-right px-4">{data.items}</TableCell>
                          <TableCell className="text-right px-4">
                            {data.items > 0 ? (data.time / data.items).toFixed(2) : '0'}s
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })()}
          
          {/* Detailed Records Table */}
          {reportData.detailedRecords && reportData.detailedRecords.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Detailed Records</CardTitle>
                <CardDescription>Complete breakdown of all tasks</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {/* Mobile Card View */}
                <div className="block sm:hidden space-y-3 p-4">
                  {reportData.detailedRecords.map((record, index) => (
                    <Card key={index} className="p-3 bg-muted/50">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">Date:</span>
                          <span>{record.date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Task:</span>
                          <span className="font-semibold">{record.taskName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Portal:</span>
                          <span className="break-all">{record.portal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Quantity:</span>
                          <span>{record.quantity}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium">Start:</span> {record.startTime}
                          </div>
                          <div>
                            <span className="font-medium">End:</span> {record.actualEndTime}
                          </div>
                        </div>
                        {(record.chetanRemarks || record.ganesh || record.finalRemarks) && (
                          <div className="pt-2 border-t">
                            {record.chetanRemarks && (
                              <div className="text-xs">
                                <span className="font-medium">Chetan:</span> {record.chetanRemarks}
                              </div>
                            )}
                            {record.ganesh && (
                              <div className="text-xs">
                                <span className="font-medium">Ganesh:</span> {record.ganesh}
                              </div>
                            )}
                            {record.finalRemarks && (
                              <div className="text-xs">
                                <span className="font-medium">Final:</span> {record.finalRemarks}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto mobile-scroll">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-2 sm:px-4 whitespace-nowrap">Date</TableHead>
                        <TableHead className="px-2 sm:px-4 whitespace-nowrap">Task</TableHead>
                        <TableHead className="px-2 sm:px-4 whitespace-nowrap">Portal</TableHead>
                        <TableHead className="text-right px-2 sm:px-4 whitespace-nowrap">Qty</TableHead>
                        <TableHead className="px-2 sm:px-4 whitespace-nowrap">Start</TableHead>
                        <TableHead className="px-2 sm:px-4 whitespace-nowrap">Est End</TableHead>
                        <TableHead className="px-2 sm:px-4 whitespace-nowrap">Act End</TableHead>
                        <TableHead className="px-2 sm:px-4 whitespace-nowrap">Chetan</TableHead>
                        <TableHead className="px-2 sm:px-4 whitespace-nowrap">Ganesh</TableHead>
                        <TableHead className="px-2 sm:px-4 whitespace-nowrap">Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.detailedRecords.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">{record.date}</TableCell>
                          <TableCell className="font-medium px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">{record.taskName}</TableCell>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm max-w-[120px] truncate" title={record.portal}>{record.portal}</TableCell>
                          <TableCell className="text-right px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">{record.quantity}</TableCell>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">{record.startTime}</TableCell>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">{record.estimatedEndTime}</TableCell>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">{record.actualEndTime}</TableCell>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm max-w-[100px] truncate" title={record.chetanRemarks || '-'}>{record.chetanRemarks || '-'}</TableCell>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm max-w-[100px] truncate" title={record.ganesh || '-'}>{record.ganesh || '-'}</TableCell>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm max-w-[100px] truncate" title={record.finalRemarks || '-'}>{record.finalRemarks || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
