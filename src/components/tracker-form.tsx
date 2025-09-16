"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClipboardList,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  User,
  AlertCircle,
  CheckCircle2,
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
  FormDescription,
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
import { employees } from "@/lib/data";
import { EmployeeRecordSchema, type EmployeeRecord } from "@/lib/definitions";
import { submitRecord } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function TrackerForm() {
  const { toast } = useToast();
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "success" | "error"
  >("idle");
  const [locationError, setLocationError] = useState("");

  const form = useForm<EmployeeRecord>({
    resolver: zodResolver(EmployeeRecordSchema),
    defaultValues: {
      employeeName: "",
      taskName: "",
      startTime: "",
      endTime: "",
      remarks: "",
    },
  });

  const { isSubmitting } = form.formState;

  const handleLocationRequest = () => {
    setLocationStatus("requesting");
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue("geolocation", { latitude, longitude });
        setLocationStatus("success");
      },
      (error) => {
        setLocationStatus("error");
        setLocationError(`Permission denied. ${error.message}`);
        form.setValue("geolocation", undefined);
      }
    );
  };

  async function onSubmit(data: EmployeeRecord) {
    const response = await submitRecord(data);
    if (response.success) {
      toast({
        title: "Success!",
        description: response.message,
        variant: "default",
      });
      form.reset();
      setLocationStatus("idle");
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
                  <div className="relative">
                    <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input
                        className="pl-10"
                        placeholder="e.g., Client Follow-up"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                  <FormLabel>Other Remarks</FormLabel>
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
            
            <FormItem className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-start gap-4">
                 <MapPin className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                 <div>
                    <FormLabel className="font-semibold">Location Tracking (Optional)</FormLabel>
                    <FormDescription>
                      For compliance and auditing, we need to log your location. Please grant permission by clicking the button below.
                    </FormDescription>
                 </div>
              </div>

              {locationStatus === 'idle' && (
                <Button type="button" variant="outline" size="sm" onClick={handleLocationRequest}>
                  <MapPin className="mr-2 h-4 w-4" /> Share Location
                </Button>
              )}

              {locationStatus === 'requesting' && (
                <Alert variant="default" className="bg-secondary">
                  <Loader2 className="h-4 w-4 animate-spin"/>
                  <AlertTitle>Requesting Permission</AlertTitle>
                  <AlertDescription>Please allow location access in your browser.</AlertDescription>
                </Alert>
              )}
              {locationStatus === 'success' && (
                 <Alert variant="default" className="border-green-500/50 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 text-green-500"/>
                  <AlertTitle>Location Captured!</AlertTitle>
                  <AlertDescription>Your location has been successfully recorded.</AlertDescription>
                </Alert>
              )}
              {locationStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4"/>
                  <AlertTitle>Location Error</AlertTitle>
                  <AlertDescription>{locationError}</AlertDescription>
                </Alert>
              )}
            </FormItem>

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
