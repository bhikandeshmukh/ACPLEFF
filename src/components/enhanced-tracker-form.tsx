"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addSeconds, format } from "date-fns";
import {
  ClipboardList,
  Clock,
  Loader2,
  MessageSquare,
  User,
  Globe,
  Hash,
  Pencil,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SimpleMobileDateTime } from "@/components/ui/simple-mobile-datetime";
import { useToast } from "@/hooks/use-toast";
import { employees, portals, tasks, TASK_DURATIONS_SECONDS, DEFAULT_DURATION_SECONDS } from "@/lib/config";
import { StartTaskSchema, EndTaskSchema, type StartTaskRecord, type EndTaskRecord, type ActiveTask } from "@/lib/definitions";
import { startTask, endTask, getActiveTask } from "@/app/server-actions";

export function EnhancedTrackerForm() {
  const { toast } = useToast();
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkingActiveTask, setCheckingActiveTask] = useState(false);

  // localStorage keys
  const ACTIVE_TASK_KEY = "tracker_active_task";
  const SELECTED_EMPLOYEE_KEY = "tracker_selected_employee";

  // Load from localStorage on component mount
  useEffect(() => {
    const savedEmployee = localStorage.getItem(SELECTED_EMPLOYEE_KEY);
    const savedActiveTask = localStorage.getItem(ACTIVE_TASK_KEY);
    
    if (savedEmployee) {
      setSelectedEmployee(savedEmployee);
    }
    
    if (savedActiveTask) {
      try {
        const parsedTask = JSON.parse(savedActiveTask);
        setActiveTask(parsedTask);
        console.log("📱 Loaded active task from localStorage:", parsedTask);
      } catch (error) {
        console.error("Error parsing saved active task:", error);
        localStorage.removeItem(ACTIVE_TASK_KEY);
      }
    }
  }, []);

  // Save to localStorage when activeTask or selectedEmployee changes
  useEffect(() => {
    if (selectedEmployee) {
      localStorage.setItem(SELECTED_EMPLOYEE_KEY, selectedEmployee);
    } else {
      localStorage.removeItem(SELECTED_EMPLOYEE_KEY);
    }
  }, [selectedEmployee]);

  useEffect(() => {
    if (activeTask) {
      localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(activeTask));
      console.log("📱 Saved active task to localStorage:", activeTask);
    } else {
      localStorage.removeItem(ACTIVE_TASK_KEY);
      console.log("📱 Removed active task from localStorage");
    }
  }, [activeTask]);
  
  const startForm = useForm<StartTaskRecord>({
    resolver: zodResolver(StartTaskSchema),
    defaultValues: {
      employeeName: "",
      portalName: "",
      taskName: "",
      otherTaskName: "",
      itemQty: 0,
      startTime: "",
      remarks: "",
    },
  });

  const endForm = useForm<EndTaskRecord>({
    resolver: zodResolver(EndTaskSchema),
    defaultValues: {
      employeeName: "",
      endTime: "",
      remarks: "",
    },
  });

  const { watch: watchStart, formState: { isSubmitting: isStarting }, setValue: setStartValue } = startForm;
  const { formState: { isSubmitting: isEnding }, setValue: setEndValue } = endForm;
  
  const watchedTaskName = watchStart("taskName");
  const watchedStartTime = watchStart("startTime");
  const watchedItemQty = watchStart("itemQty");

  // Check for active task when employee is selected (with loading)
  useEffect(() => {
    async function checkActiveTask() {
      if (selectedEmployee) {
        setCheckingActiveTask(true);
        try {
          // Always check server first for fresh data (critical for multi-user scenario)
          console.log("🔍 Checking Google Sheets for active task for", selectedEmployee);
          const active = await getActiveTask(selectedEmployee);
          
          if (active) {
            setActiveTask(active);
            setEndValue("employeeName", selectedEmployee);
            // Update localStorage with fresh server data
            localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(active));
            console.log("📡 Found active task from server for", selectedEmployee, active);
          } else {
            // No active task found on server
            setActiveTask(null);
            setStartValue("employeeName", selectedEmployee);
            // Clear any stale localStorage data
            localStorage.removeItem(ACTIVE_TASK_KEY);
            console.log("📡 No active task from server for", selectedEmployee);
          }
        } catch (error) {
          console.error("Error checking active task:", error);
          
          // Fallback to localStorage only if server fails
          const savedActiveTask = localStorage.getItem(ACTIVE_TASK_KEY);
          if (savedActiveTask) {
            try {
              const parsedTask = JSON.parse(savedActiveTask);
              if (parsedTask.employeeName === selectedEmployee) {
                setActiveTask(parsedTask);
                setEndValue("employeeName", selectedEmployee);
                console.log("📱 Fallback: Using active task from localStorage for", selectedEmployee);
              } else {
                localStorage.removeItem(ACTIVE_TASK_KEY);
                setActiveTask(null);
                setStartValue("employeeName", selectedEmployee);
              }
            } catch (parseError) {
              console.error("Error parsing saved active task:", parseError);
              localStorage.removeItem(ACTIVE_TASK_KEY);
              setActiveTask(null);
              setStartValue("employeeName", selectedEmployee);
            }
          } else {
            setActiveTask(null);
            setStartValue("employeeName", selectedEmployee);
          }
          
          toast({
            title: "Warning",
            description: "Could not verify active task status from server. Using local data if available.",
            variant: "destructive",
          });
        } finally {
          setCheckingActiveTask(false);
        }
      } else {
        setActiveTask(null);
        setCheckingActiveTask(false);
      }
    }
    checkActiveTask();
  }, [selectedEmployee, setStartValue, setEndValue, toast]);

  // Update current time every minute for real-time late status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Auto-refresh active task status every 30 seconds for multi-user sync
  useEffect(() => {
    if (!selectedEmployee) return;

    const refreshActiveTask = async () => {
      try {
        console.log("🔄 Auto-refreshing active task status for", selectedEmployee);
        const active = await getActiveTask(selectedEmployee);
        
        // Only update if there's a change to avoid unnecessary re-renders
        const currentActiveTaskStr = activeTask ? JSON.stringify(activeTask) : null;
        const newActiveTaskStr = active ? JSON.stringify(active) : null;
        
        if (currentActiveTaskStr !== newActiveTaskStr) {
          console.log("🔄 Active task status changed for", selectedEmployee);
          setActiveTask(active);
          
          if (active) {
            setEndValue("employeeName", selectedEmployee);
            localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(active));
          } else {
            setStartValue("employeeName", selectedEmployee);
            localStorage.removeItem(ACTIVE_TASK_KEY);
          }
        }
      } catch (error) {
        console.error("Error auto-refreshing active task:", error);
        // Don't show toast for auto-refresh errors to avoid spam
      }
    };

    // Set up interval for auto-refresh every 30 seconds
    const refreshInterval = setInterval(refreshActiveTask, 30000);

    return () => clearInterval(refreshInterval);
  }, [selectedEmployee, activeTask, setStartValue, setEndValue]);

  useEffect(() => {
    if (watchedTaskName === "OTHER WORK") {
      setStartValue("portalName", ""); 
    }
  }, [watchedTaskName, setStartValue]);

  useEffect(() => {
    if (watchedStartTime && watchedTaskName && watchedTaskName !== "OTHER WORK" && watchedItemQty !== undefined) {
      const startTime = new Date(watchedStartTime);
      const itemQty = watchedItemQty ?? 0;
      
      const durationPerItem = TASK_DURATIONS_SECONDS[watchedTaskName] || DEFAULT_DURATION_SECONDS;
      const durationInSeconds = itemQty > 0 
        ? itemQty * durationPerItem 
        : DEFAULT_DURATION_SECONDS;
        
      const estimatedEndTime = addSeconds(startTime, durationInSeconds);

      toast({
        title: "Estimated End Time",
        description: `Your estimated end time is ${format(estimatedEndTime, "hh:mm a 'on' dd/MM/yyyy")}.`,
        variant: "default",
      });
    }
  }, [watchedStartTime, watchedTaskName, watchedItemQty, toast]);

  async function onStartTask(data: StartTaskRecord) {
    try {
      const response = await startTask(data);
      if (response.success) {
        toast({
          title: "Task Started!",
          description: (response as any).message,
          variant: "default",
        });
        
        // Use the verified activeTask from the response (already checked against Google Sheets)
        const newActiveTask = (response as any).activeTask;
        console.log("✅ Setting active task from verified response:", newActiveTask);
        setActiveTask(newActiveTask);
        
        // Also save to localStorage for immediate availability
        if (newActiveTask) {
          localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(newActiveTask));
          console.log("📱 Saved new active task to localStorage immediately");
        }
        
        startForm.reset();
        
        // No auto-refresh - let the component update naturally
        console.log("✅ Task started successfully, component will update automatically");
        
      } else {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error starting task:", error);
      toast({
        title: "Error",
        description: "Failed to start task. Please try again.",
        variant: "destructive",
      });
    }
  }

  async function onEndTask(data: EndTaskRecord) {
    console.log("🔴 End Task button clicked!", data);
    console.log("🔴 Current active task:", activeTask);
    
    try {
      const response = await endTask(data);
      console.log("🔴 End task response:", response);
      
      if (response.success) {
        toast({
          title: "Task Completed!",
          description: (response as any).message,
          variant: "default",
        });
        
        // Clear active task immediately (both state and localStorage)
        setActiveTask(null);
        localStorage.removeItem(ACTIVE_TASK_KEY);
        console.log("📱 Cleared active task from localStorage immediately");
        
        // Refresh active task from Google Sheets to ensure no stale data
        if (selectedEmployee) {
          const freshActiveTask = await getActiveTask(selectedEmployee);
          setActiveTask(freshActiveTask);
          if (freshActiveTask) {
            localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(freshActiveTask));
          }
        }
        
        endForm.reset();
        setSelectedEmployee("");
        localStorage.removeItem(SELECTED_EMPLOYEE_KEY);
      } else {
        console.error("🔴 End task failed:", response.error);
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("🔴 End task exception:", error);
      toast({
        title: "Error",
        description: "Failed to end task. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Set current time for start/end time fields
  const setCurrentTimeField = (field: "startTime" | "endTime") => {
    const now = new Date();
    const timeString = format(now, "yyyy-MM-dd'T'HH:mm");
    if (field === "startTime") {
      setStartValue("startTime", timeString);
    } else {
      setEndValue("endTime", timeString);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="text-lg sm:text-xl">Task Tracker</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          {activeTask 
            ? `You have an active ${activeTask.taskName} task. Complete it to start a new task.`
            : "Start a new task by filling out the form below. Fields marked with * are required."
          }
          <br />
          <span className="text-xs text-muted-foreground mt-1 block">
            Note: Page will automatically refresh after starting a task to show the End Task option.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Employee Selection */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-sm font-medium mb-2">Select Employee</label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={checkingActiveTask}>
            <SelectTrigger className="h-10 sm:h-11">
              <div className="flex items-center">
                {checkingActiveTask ? (
                  <Loader2 className="mr-2 h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <SelectValue placeholder={checkingActiveTask ? "Checking active tasks..." : "Select your name"} />
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
          {checkingActiveTask && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Checking Google Sheets for active tasks...
            </p>
          )}
          
          {/* Manual Refresh Button */}
          {selectedEmployee && !checkingActiveTask && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Last checked: {new Date().toLocaleTimeString()}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setCheckingActiveTask(true);
                  try {
                    const active = await getActiveTask(selectedEmployee);
                    setActiveTask(active);
                    if (active) {
                      setEndValue("employeeName", selectedEmployee);
                      localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(active));
                    } else {
                      setStartValue("employeeName", selectedEmployee);
                      localStorage.removeItem(ACTIVE_TASK_KEY);
                    }
                    toast({
                      title: "Refreshed",
                      description: "Active task status updated from server.",
                      variant: "default",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to refresh active task status.",
                      variant: "destructive",
                    });
                  } finally {
                    setCheckingActiveTask(false);
                  }
                }}
                disabled={checkingActiveTask}
                className="h-8 px-3 text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Active Task Display */}
        {activeTask && (() => {
          // Calculate estimated end time (treat UTC as local time)
          const startTimeUTC = new Date(activeTask.startTime);
          // Create a new date with the same time but in local timezone
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
          
          // Check if task is late (using real-time current time)
          const isLate = currentTime > estimatedEndTime;
          const timeDifference = Math.abs(currentTime.getTime() - estimatedEndTime.getTime());
          const minutesLate = Math.floor(timeDifference / (1000 * 60));
          
          return (
            <Card className={`mb-4 sm:mb-6 ${isLate ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className={`mr-2 h-4 w-4 sm:h-5 sm:w-5 ${isLate ? 'text-red-600' : 'text-blue-600'}`} />
                    Active Task
                  </div>
                  {isLate && (
                    <span className="text-xs sm:text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                      {minutesLate}m Late
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                  <div className="flex justify-between sm:block">
                    <span className="font-medium">Task:</span> 
                    <span className="sm:block">{activeTask.taskName}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="font-medium">Portal:</span> 
                    <span className="sm:block break-all">{activeTask.portalName || activeTask.otherTaskName}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="font-medium">Items:</span> 
                    <span className="sm:block">{activeTask.itemQty}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="font-medium">Started:</span> 
                    <span className="sm:block">{format(startTime, "hh:mm a")}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="font-medium">Est. End:</span> 
                    <span className={`sm:block ${isLate ? 'text-red-600 font-medium' : ''}`}>
                      {format(estimatedEndTime, "hh:mm a")}
                    </span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="font-medium">Status:</span> 
                    <span className={`sm:block font-medium ${isLate ? 'text-red-600' : 'text-green-600'}`}>
                      {isLate ? `${minutesLate}m Late` : 'On Time'}
                    </span>
                  </div>
                </div>
                
                {/* Progress indicator */}
                <div className="mt-3 sm:mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{isLate ? 'Overdue' : 'In Progress'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isLate ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: isLate ? '100%' : `${Math.min(100, (timeDifference / (totalDurationSeconds * 1000)) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* End Task Form */}
        {activeTask && (
          <Form {...endForm}>
            <form 
              onSubmit={(e) => {
                console.log("🔴 Form submit triggered!");
                console.log("🔴 Form data:", endForm.getValues());
                console.log("🔴 Form errors:", endForm.formState.errors);
                return endForm.handleSubmit(onEndTask)(e);
              }} 
              className="space-y-4 sm:space-y-6"
            >
              <div className="space-y-4 sm:space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                <FormField
                  control={endForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <div className="space-y-3">
                        <SimpleMobileDateTime
                          date={field.value ? new Date(field.value) : undefined}
                          onDateChange={(date) => {
                            field.onChange(date ? date.toISOString() : "")
                          }}
                          placeholder="Select end time"
                          disabled={isEnding}
                          className="w-full"
                        />
                        <Button
                          type="button"
                          onClick={() => setCurrentTimeField("endTime")}
                          disabled={isEnding}
                          size="lg"
                          variant="outline"
                          className="w-full h-12 text-base font-medium touch-manipulation"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          Set Current Time
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={endForm.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Remarks</FormLabel>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Textarea
                            className="pl-10"
                            placeholder="Add any final notes..."
                            {...field}
                            disabled={isEnding}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                size="lg"
                className="w-full h-12 text-base font-medium touch-manipulation" 
                disabled={isEnding}
                onClick={() => console.log("🔴 End Task button clicked directly!")}
              >
                {isEnding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ending Task...
                  </>
                ) : (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    End Task
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}

        {/* Loading State */}
        {checkingActiveTask && selectedEmployee && (
          <Card className="mb-4 sm:mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="mr-3 h-6 w-6 animate-spin text-blue-600" />
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-900">Checking Active Tasks</p>
                  <p className="text-xs text-blue-700 mt-1">Verifying Google Sheets data...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start Task Form */}
        {!activeTask && selectedEmployee && !checkingActiveTask && (
          <Form {...startForm}>
            <form onSubmit={startForm.handleSubmit(onStartTask)} className="space-y-4 sm:space-y-6">
              <FormField
                control={startForm.control}
                name="taskName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                     <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isStarting}
                    >
                      <FormControl>
                        <div className="relative">
                          <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Select a task" />
                          </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent>
                        {tasks.map((task) => (
                          <SelectItem key={task} value={task}>
                            {task}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedTaskName !== "OTHER WORK" && (
                  <FormField
                  control={startForm.control}
                  name="portalName"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>
                      Portal Name
                      <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                      <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isStarting}
                      >
                          <FormControl>
                          <div className="relative">
                              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <SelectTrigger className="pl-10">
                              <SelectValue placeholder="Select a portal" />
                              </SelectTrigger>
                          </div>
                          </FormControl>
                          <SelectContent>
                          {portals.map((portal) => (
                              <SelectItem key={portal} value={portal}>
                              {portal}
                              </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              )}
              
              {watchedTaskName === "OTHER WORK" && (
                <FormField
                  control={startForm.control}
                  name="otherTaskName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Please Specify Other Work
                        <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <div className="relative">
                        <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input
                            className="pl-10"
                            placeholder="Describe the task"
                            {...field}
                            disabled={isStarting}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={startForm.control}
                name="itemQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Item Qty
                      {watchedTaskName && watchedTaskName !== "OTHER WORK" && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </FormLabel>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          className="pl-10"
                          type="number"
                          placeholder={watchedTaskName === "OTHER WORK" ? "0 (optional)" : "Enter quantity"}
                          min="0"
                          {...field}
                          onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                          disabled={isStarting}
                        />
                      </FormControl>
                    </div>
                    {watchedTaskName && watchedTaskName !== "OTHER WORK" && (
                      <p className="text-xs text-muted-foreground">
                        Item quantity is required for {watchedTaskName} task
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={startForm.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input
                            className="pl-10 h-12 text-base"
                            type="datetime-local"
                            {...field}
                            disabled={isStarting}
                            style={{
                              WebkitAppearance: 'none',
                              MozAppearance: 'textfield'
                            }}
                          />
                        </FormControl>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setCurrentTimeField("startTime")}
                        disabled={isStarting}
                        size="lg"
                        variant="outline"
                        className="h-12 px-6 text-base font-medium touch-manipulation sm:w-auto w-full sm:min-w-[100px] flex-shrink-0"
                      >
                        Now
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={startForm.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Remarks</FormLabel>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Textarea
                          className="pl-10"
                          placeholder="Add any initial notes..."
                          {...field}
                          disabled={isStarting}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" size="lg" className="w-full h-12 text-base font-medium touch-manipulation" disabled={isStarting}>
                {isStarting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Task...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Task
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}