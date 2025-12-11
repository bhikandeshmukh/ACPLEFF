"use client";

import { useState } from "react";
import { Settings, Clock, Users, Globe, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TASK_DURATIONS_SECONDS, 
  DEFAULT_DURATION_SECONDS, 
  ALL_TASKS, 
  employees, 
  portals, 
  tasks 
} from "@/lib/config";
import { useToast } from "@/hooks/use-toast";

export function ConfigurationView() {
  const { toast } = useToast();
  const [exportingConfig, setExportingConfig] = useState(false);

  // Convert seconds to minutes and seconds for display
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  };

  // Export configuration as JSON
  const exportConfiguration = () => {
    setExportingConfig(true);
    try {
      const config = {
        taskDurations: TASK_DURATIONS_SECONDS,
        defaultDuration: DEFAULT_DURATION_SECONDS,
        allTasks: ALL_TASKS,
        employees: employees,
        portals: portals,
        tasks: tasks,
        exportedAt: new Date().toISOString(),
        exportedBy: "Efficiency Recorder System"
      };

      const dataStr = JSON.stringify(config, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `efficiency-config-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast({
        title: "✅ Configuration Exported",
        description: "Configuration file downloaded successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "❌ Export Failed",
        description: "Failed to export configuration.",
        variant: "destructive",
      });
    } finally {
      setExportingConfig(false);
    }
  };

  // Export as CSV for Excel
  const exportAsCSV = () => {
    try {
      const csvData = [
        ['Task Name', 'Duration (Seconds)', 'Duration (Formatted)', 'Per Item Rate'],
        ...ALL_TASKS.map(task => {
          const duration = TASK_DURATIONS_SECONDS[task] || DEFAULT_DURATION_SECONDS;
          return [
            task,
            duration.toString(),
            formatDuration(duration),
            `${duration}s per item`
          ];
        })
      ];

      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const exportFileDefaultName = `task-durations-${new Date().toISOString().split('T')[0]}.csv`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast({
        title: "✅ CSV Exported",
        description: "Task durations exported to Excel format.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "❌ Export Failed",
        description: "Failed to export CSV file.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8" />
            System Configuration
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage task durations, employees, and system settings
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={exportAsCSV}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            onClick={exportConfiguration}
            disabled={exportingConfig}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {exportingConfig ? "Exporting..." : "Export Config"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="durations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="durations">Task Durations</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="portals">Portals</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Task Durations Tab */}
        <TabsContent value="durations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Task Duration Configuration
              </CardTitle>
              <CardDescription>
                Time allocated per item for each task type (in seconds)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ALL_TASKS.map((task) => {
                  const duration = TASK_DURATIONS_SECONDS[task] || DEFAULT_DURATION_SECONDS;
                  const isDefault = !TASK_DURATIONS_SECONDS[task];
                  
                  return (
                    <Card key={task} className={`${isDefault ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">{task}</h3>
                            {isDefault && (
                              <Badge variant="outline" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-mono font-medium">{duration}s</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Formatted:</span>
                              <span className="font-medium">{formatDuration(duration)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Rate:</span>
                              <span>{duration}s per item</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">Default Duration</span>
                </div>
                <p className="text-sm text-blue-800">
                  Tasks without specific duration use: <span className="font-mono font-bold">{DEFAULT_DURATION_SECONDS}s</span> ({formatDuration(DEFAULT_DURATION_SECONDS)}) per item
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Configuration
              </CardTitle>
              <CardDescription>
                List of all registered employees in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {employees.map((employee) => (
                  <Card key={employee.id} className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{employee.name}</h3>
                          <p className="text-sm text-muted-foreground">ID: {employee.id}</p>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Total Employees:</span> {employees.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portals Tab */}
        <TabsContent value="portals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Portal Configuration
              </CardTitle>
              <CardDescription>
                Available portals for task assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {portals.map((portal, index) => (
                  <Card key={index} className="border-purple-200 bg-purple-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm">{portal}</h3>
                        <Badge variant="outline" className="text-xs">
                          Portal
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  <span className="font-semibold">Total Portals:</span> {portals.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Total Tasks</p>
                    <p className="text-2xl font-bold text-blue-600">{ALL_TASKS.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Employees</p>
                    <p className="text-2xl font-bold text-green-600">{employees.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-purple-900">Portals</p>
                  <p className="text-2xl font-bold text-purple-600">{portals.length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-orange-900">Default Duration</p>
                  <p className="text-xl font-bold text-orange-600">{formatDuration(DEFAULT_DURATION_SECONDS)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Summary</CardTitle>
              <CardDescription>
                Complete overview of all system configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold">Task Name</th>
                      <th className="text-left p-2 font-semibold">Duration (Seconds)</th>
                      <th className="text-left p-2 font-semibold">Formatted Duration</th>
                      <th className="text-left p-2 font-semibold">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_TASKS.map((task) => {
                      const duration = TASK_DURATIONS_SECONDS[task] || DEFAULT_DURATION_SECONDS;
                      const isDefault = !TASK_DURATIONS_SECONDS[task];
                      
                      return (
                        <tr key={task} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{task}</td>
                          <td className="p-2 font-mono">{duration}s</td>
                          <td className="p-2">{formatDuration(duration)}</td>
                          <td className="p-2">
                            <Badge variant={isDefault ? "outline" : "secondary"}>
                              {isDefault ? "Default" : "Custom"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}