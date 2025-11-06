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
  Send,
  User,
  Globe,
  Hash,
  Pencil,
  Play,
  Square,
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
import { useToast } from "@/hooks/use-toast";
import { employees, portals, tasks, TASK_DURATIONS_SECONDS, DEFAULT_DURATION_SECONDS } from "@/lib/config";
import { StartTaskSchema, EndTaskSchema, type StartTaskRecord, type EndTaskRecord, type ActiveTask } from "@/lib/definitions";
import { startTask, endTask, getActiveTask } from "@/app/server-actions";

export function EnhancedTrackerForm() {
  const { toast } = useToast();
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  
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

  // Check for active task when employee is selected
  useEffect(() => {
    async function checkActiveTask() {
      if (selectedEmployee) {
        const active = await getActiveTask(selectedEmployee);
        setActiveTask(active);
        if (active) {
          setEndValue("employeeName", selectedEmployee);
        } else {
          setStartValue("employeeName", selectedEmployee);
        }
      }
    }
    checkActiveTask();
  }, [selectedEmployee, setStartValue, setEndValue]);

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
    const response = await startTask(data);
    if (response.success) {
      toast({
        title: "Task Started!",
        description: (response as any).message,
        variant: "default",
      });
      setActiveTask((response as any).activeTask);
      startForm.reset();
    } else {
      toast({
        title: "Error",
        description: response.error,
        variant: "destructive",
      });
    }
  }

  async function onEndTask(data: EndTaskRecord) {
    const response = await endTask(data);
    if (response.success) {
      toast({
        title: "Task Completed!",
        description: (response as any).message,
        variant: "default",
      });
      setActiveTask(null);
      endForm.reset();
      setSelectedEmployee("");
    } else {
      toast({
        title: "Error",
        description: response.error,
        variant: "destructive",
      });
    }
  }

  // Set current time for start/end time fields
  const setCurrentTime = (field: "startTime" | "endTime") => {
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
      <CardHeader>
        <CardTitle>Task Tracker</CardTitle>
        <CardDescription>
          {activeTask 
            ? `You have an active ${activeTask.taskName} task. Complete it to start a new task.`
            : "Start a new task by filling out the form below. Fields marked with * are required."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Employee Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Employee</label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select your name" />
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

        {/* Active Task Display */}
        {activeTask && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Clock className="mr-2 h-5 w-5 text-blue-600" />
                Active Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Task:</span> {activeTask.taskName}
                </div>
                <div>
                  <span className="font-medium">Portal:</span> {activeTask.portalName || activeTask.otherTaskName}
                </div>
                <div>
                  <span className="font-medium">Items:</span> {activeTask.itemQty}
                </div>
                <div>
                  <span className="font-medium">Started:</span> {format(new Date(activeTask.startTime), "hh:mm a")}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* End Task Form */}
        {activeTask && (
          <Form {...endForm}>
            <form onSubmit={endForm.handleSubmit(onEndTask)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={endForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input
                              className="pl-10"
                              type="datetime-local"
                              {...field}
                              disabled={isEnding}
                            />
                          </FormControl>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentTime("endTime")}
                          disabled={isEnding}
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 disabled:pointer-events-none disabled:opacity-50"
                        >
                          Now
                        </button>
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
              
              <Button type="submit" className="w-full" disabled={isEnding}>
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

        {/* Start Task Form */}
        {!activeTask && selectedEmployee && (
          <Form {...startForm}>
            <form onSubmit={startForm.handleSubmit(onStartTask)} className="space-y-6">
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
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input
                            className="pl-10"
                            type="datetime-local"
                            {...field}
                            disabled={isStarting}
                          />
                        </FormControl>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentTime("startTime")}
                        disabled={isStarting}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 disabled:pointer-events-none disabled:opacity-50"
                      >
                        Now
                      </button>
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
              
              <Button type="submit" className="w-full" disabled={isStarting}>
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