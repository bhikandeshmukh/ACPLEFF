"use client";

import { useState, useEffect } from "react";
import { Clock, User, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { employees } from "@/lib/config";
import { getActiveTask } from "@/app/server-actions";
import type { ActiveTask } from "@/lib/definitions";
import { format } from "date-fns";

export function ActiveTaskStatus() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Active Task Status
          </div>
          {selectedEmployee && (
            <button
              onClick={checkActiveTask}
              disabled={loading}
              className="p-1 rounded hover:bg-accent"
              title="Refresh status"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Check Employee Status</label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
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
            <div className="text-center text-muted-foreground">
              Checking status...
            </div>
          )}

          {selectedEmployee && !loading && (
            <div className="p-4 rounded-lg border">
              {activeTask ? (
                <div className="space-y-2">
                  <div className="flex items-center text-green-600">
                    <Clock className="mr-2 h-4 w-4" />
                    <span className="font-medium">Active Task</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Task:</span> {activeTask.taskName}</div>
                    <div><span className="font-medium">Portal:</span> {activeTask.portalName || activeTask.otherTaskName}</div>
                    <div><span className="font-medium">Items:</span> {activeTask.itemQty}</div>
                    <div><span className="font-medium">Started:</span> {format(new Date(activeTask.startTime), "hh:mm a 'on' dd/MM/yyyy")}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <div>No active task</div>
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