"use client";

import { useState, useEffect } from "react";
import { Clock, User, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { employees } from "@/lib/config";
import { getActiveTask } from "@/app/server-actions";
import type { ActiveTask } from "@/lib/definitions";
import { format, addSeconds } from "date-fns";
import { TASK_DURATIONS_SECONDS, DEFAULT_DURATION_SECONDS } from "@/lib/config";

export function ActiveTaskStatus() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const checkActiveTask = async () => {
    if (selectedEmployee) {
      setLoading(true);
      try {
        const active = await getActiveTask(selectedEmployee);
        console.log(`Active task for ${selectedEmployee}:`, active);
        setActiveTask(active);
      } catch (error) {
        console.error("Error checking active task:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setActiveTask(null);
    }
  };

  useEffect(() => {
    checkActiveTask();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(checkActiveTask, 10000);
    return () => clearInterval(interval);
  }, [selectedEmployee]);

  // Update current time every minute for real-time late status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base sm:text-lg">
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Active Task Status</span>
            <span className="sm:hidden">Task Status</span>
          </div>
          {selectedEmployee && (
            <button
              onClick={checkActiveTask}
              disabled={loading}
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2">
              Check Employee Status
            </label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="h-9 sm:h-10">
                <div className="flex items-center">
                  <User className="mr-2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select employee" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.name}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="text-center text-muted-foreground text-sm">
              Checking status...
            </div>
          )}

          {selectedEmployee && !loading && (
            <div className="p-3 sm:p-4 rounded-lg border bg-card">
              {activeTask ? (() => {
                // Calculate estimated end time and late status (fix timezone)
                const startTimeUTC = new Date(activeTask.startTime);
                const startTime = new Date(
                  startTimeUTC.getUTCFullYear(),
                  startTimeUTC.getUTCMonth(),
                  startTimeUTC.getUTCDate(),
                  startTimeUTC.getUTCHours(),
                  startTimeUTC.getUTCMinutes(),
                  startTimeUTC.getUTCSeconds()
                );
                const durationPerItem = TASK_DURATIONS_SECONDS[activeTask.taskName] || DEFAULT_DURATION_SECONDS;
                const totalDurationSeconds = activeTask.itemQty > 0 
                  ? activeTask.itemQty * durationPerItem 
                  : DEFAULT_DURATION_SECONDS;
                const estimatedEndTime = addSeconds(startTime, totalDurationSeconds);
                
                // Use real-time current time
                const isLate = currentTime > estimatedEndTime;
                const timeDifference = Math.abs(currentTime.getTime() - estimatedEndTime.getTime());
                const minutesLate = Math.floor(timeDifference / (1000 * 60));

                return (
                  <div className="space-y-2">
                    <div className={`flex items-center justify-between ${isLate ? 'text-red-600' : 'text-green-600'}`}>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="font-medium text-sm sm:text-base">Active Task</span>
                      </div>
                      {isLate && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                          {minutesLate}m Late
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium text-muted-foreground">Task:</span>
                            <span className="font-medium">{activeTask.taskName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-muted-foreground">Portal:</span>
                            <span className="font-medium text-right max-w-[120px] truncate" title={activeTask.portalName || activeTask.otherTaskName}>
                              {activeTask.portalName || activeTask.otherTaskName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-muted-foreground">Items:</span>
                            <span className="font-medium">{activeTask.itemQty}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium text-muted-foreground">Started:</span>
                            <span className="font-medium">{format(startTime, "hh:mm a")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-muted-foreground">Est. End:</span>
                            <span className={`font-medium ${isLate ? 'text-red-600' : ''}`}>
                              {format(estimatedEndTime, "hh:mm a")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-muted-foreground">Status:</span>
                            <span className={`font-medium ${isLate ? 'text-red-600' : 'text-green-600'}`}>
                              {isLate ? `${minutesLate}m Late` : 'On Time'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center text-muted-foreground">
                  <Clock className="mx-auto h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-50" />
                  <div className="text-sm sm:text-base">No active task</div>
                  <div className="text-xs">Employee is available to start a new task</div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}