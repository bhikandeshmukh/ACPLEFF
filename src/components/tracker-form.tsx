
"use client";

import { useEffect } from "react";
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
import { EmployeeRecordSchema, type EmployeeRecord } from "@/lib/definitions";
import { submitRecord } from "@/app/server-actions";

export function TrackerForm() {
  const { toast } = useToast();
  
  const form = useForm<EmployeeRecord>({
    resolver: zodResolver(EmployeeRecordSchema),
    defaultValues: {
      employeeName: "",
      portalName: "",
      taskName: "",
      otherTaskName: "",
      itemQty: 0,
      startTime: "",
      endTime: "",
      remarks: "",
    },
  });

  const { watch, formState: { isSubmitting }, setValue } = form;
  const watchedTaskName = watch("taskName");
  const watchedStartTime = watch("startTime");
  const watchedItemQty = watch("itemQty");

  useEffect(() => {
    if (watchedTaskName === "OTHER WORK") {
      setValue("portalName", ""); 
    }
  }, [watchedTaskName, setValue]);


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

  async function onSubmit(data: EmployeeRecord) {
    const finalData = { ...data };
    if (data.taskName !== "OTHER WORK") {
      finalData.otherTaskName = "";
    } else {
      finalData.portalName = ""; // Ensure portal name is empty for OTHER WORK
    }
    
    const response = await submitRecord(finalData);
    if (response.success) {
      toast({
        title: "Success!",
        description: response.message,
        variant: "default",
      });
      form.reset();
    } else {
      toast({
        title: "Error",
        description: response.error,
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>Log Your Task</CardTitle>
        <CardDescription>
          Fill out the form below to record your work activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="employeeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee Name</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select your name" />
                        </SelectTrigger>
                      </div>
                    </FormControl>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.name}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taskName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                   <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
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
                control={form.control}
                name="portalName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Portal Name</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
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
                control={form.control}
                name="otherTaskName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please Specify Other Work</FormLabel>
                    <div className="relative">
                      <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          className="pl-10"
                          placeholder="Describe the task"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}


            <FormField
              control={form.control}
              name="itemQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Qty</FormLabel>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input
                        className="pl-10"
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          className="pl-10"
                          type="datetime-local"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          className="pl-10"
                          type="datetime-local"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (Chetan)</FormLabel>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Textarea
                        className="pl-10"
                        placeholder="Add any additional notes here..."
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Record
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
