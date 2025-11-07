"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateTimePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Pick a date and time",
  className,
  disabled = false,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [isOpen, setIsOpen] = React.useState(false)
  const [timeValue, setTimeValue] = React.useState<string>(
    date && !isNaN(date.getTime()) ? format(date, "HH:mm") : "09:00"
  )

  // Check if device is mobile
  const [isMobile, setIsMobile] = React.useState(false)
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  React.useEffect(() => {
    setSelectedDate(date)
    if (date && !isNaN(date.getTime())) {
      setTimeValue(format(date, "HH:mm"))
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      const [hours, minutes] = timeValue.split(':').map(Number)
      const updatedDate = new Date(newDate)
      updatedDate.setHours(hours, minutes, 0, 0)
      setSelectedDate(updatedDate)
      onDateChange?.(updatedDate)
    } else {
      setSelectedDate(undefined)
      onDateChange?.(undefined)
    }
  }

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime)
    if (selectedDate) {
      const [hours, minutes] = newTime.split(':').map(Number)
      const updatedDate = new Date(selectedDate)
      updatedDate.setHours(hours, minutes, 0, 0)
      setSelectedDate(updatedDate)
      onDateChange?.(updatedDate)
    }
  }

  // Mobile-friendly native input fallback
  if (!isClient) {
    // Server-side rendering fallback
    return (
      <div className={cn("grid w-full max-w-sm items-center gap-1.5", className)}>
        <Input
          type="datetime-local"
          value={selectedDate && !isNaN(selectedDate.getTime()) ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : ""}
          onChange={(e) => {
            const newDate = e.target.value ? new Date(e.target.value) : undefined
            setSelectedDate(newDate)
            onDateChange?.(newDate)
          }}
          disabled={disabled}
          className="w-full"
        />
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className={cn("grid w-full max-w-sm items-center gap-1.5", className)}>
        <Input
          type="datetime-local"
          value={selectedDate && !isNaN(selectedDate.getTime()) ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : ""}
          onChange={(e) => {
            const newDate = e.target.value ? new Date(e.target.value) : undefined
            setSelectedDate(newDate)
            onDateChange?.(newDate)
          }}
          disabled={disabled}
          className="w-full"
        />
      </div>
    )
  }

  // Desktop version with popover
  return (
    <div className={cn("grid w-full max-w-sm items-center gap-1.5", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate && !isNaN(selectedDate.getTime()) ? (
              format(selectedDate, "PPP 'at' HH:mm")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </div>
          <div className="p-3 space-y-2">
            <Label htmlFor="time" className="text-sm font-medium">
              Time
            </Label>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                id="time"
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}