"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface MobileDateTimePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export function MobileDateTimePicker({
  date,
  onDateChange,
  placeholder = "Select date and time",
  className,
  disabled = false,
  minDate,
  maxDate,
}: MobileDateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Separate date and time states
  const [dateValue, setDateValue] = React.useState<string>(
    date ? format(date, "yyyy-MM-dd") : ""
  )
  const [timeValue, setTimeValue] = React.useState<string>(
    date ? format(date, "HH:mm") : "09:00"
  )

  React.useEffect(() => {
    setSelectedDate(date)
    if (date) {
      setDateValue(format(date, "yyyy-MM-dd"))
      setTimeValue(format(date, "HH:mm"))
    }
  }, [date])

  const handleDateChange = (newDateValue: string) => {
    setDateValue(newDateValue)
    if (newDateValue && timeValue) {
      const newDate = new Date(`${newDateValue}T${timeValue}`)
      setSelectedDate(newDate)
      onDateChange?.(newDate)
    }
  }

  const handleTimeChange = (newTimeValue: string) => {
    setTimeValue(newTimeValue)
    if (dateValue && newTimeValue) {
      const newDate = new Date(`${dateValue}T${newTimeValue}`)
      setSelectedDate(newDate)
      onDateChange?.(newDate)
    }
  }

  const handleQuickTime = (time: string) => {
    setTimeValue(time)
    if (dateValue) {
      const newDate = new Date(`${dateValue}T${time}`)
      setSelectedDate(newDate)
      onDateChange?.(newDate)
    }
  }

  const handleQuickDate = (daysFromNow: number) => {
    const newDate = new Date()
    newDate.setDate(newDate.getDate() + daysFromNow)
    const newDateValue = format(newDate, "yyyy-MM-dd")
    setDateValue(newDateValue)
    
    if (timeValue) {
      const finalDate = new Date(`${newDateValue}T${timeValue}`)
      setSelectedDate(finalDate)
      onDateChange?.(finalDate)
    }
  }

  const formatMinDate = minDate ? format(minDate, "yyyy-MM-dd") : undefined
  const formatMaxDate = maxDate ? format(maxDate, "yyyy-MM-dd") : undefined

  return (
    <div className={cn("w-full", className)}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                format(selectedDate, "PPP 'at' HH:mm")
              ) : (
                <span>{placeholder}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] max-h-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Select Date & Time</SheetTitle>
            <SheetDescription>
              Choose your preferred date and time
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Quick Date Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Quick Date Selection</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuickDate(0)}
                  className="h-11 text-base font-medium touch-manipulation"
                  type="button"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuickDate(1)}
                  className="h-11 text-base font-medium touch-manipulation"
                  type="button"
                >
                  Tomorrow
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuickDate(7)}
                  className="h-11 text-base font-medium touch-manipulation"
                  type="button"
                >
                  Next Week
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuickDate(30)}
                  className="h-11 text-base font-medium touch-manipulation"
                  type="button"
                >
                  Next Month
                </Button>
              </div>
            </div>

            {/* Custom Date Selection */}
            <div className="space-y-3">
              <Label htmlFor="date-input" className="text-base font-medium">
                Custom Date
              </Label>
              <Input
                id="date-input"
                type="date"
                value={dateValue}
                onChange={(e) => handleDateChange(e.target.value)}
                min={formatMinDate}
                max={formatMaxDate}
                className="text-base"
              />
            </div>

            {/* Quick Time Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Quick Time Selection</Label>
              <div className="grid grid-cols-3 gap-3">
                {["09:00", "12:00", "15:00", "18:00", "20:00", "22:00"].map((time) => (
                  <Button
                    key={time}
                    variant={timeValue === time ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleQuickTime(time)}
                    className="h-11 text-base font-medium touch-manipulation"
                    type="button"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Time Selection */}
            <div className="space-y-3">
              <Label htmlFor="time-input" className="text-base font-medium">
                Custom Time
              </Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="time-input"
                  type="time"
                  value={timeValue}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="text-base"
                />
              </div>
            </div>

            {/* Selected DateTime Display */}
            {selectedDate && (
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium text-muted-foreground">
                  Selected Date & Time
                </Label>
                <p className="text-lg font-medium mt-1">
                  {format(selectedDate, "EEEE, MMMM do, yyyy 'at' h:mm a")}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-6 pb-4">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 h-12 text-base font-medium touch-manipulation"
                onClick={() => {
                  setSelectedDate(undefined)
                  setDateValue("")
                  setTimeValue("09:00")
                  onDateChange?.(undefined)
                }}
                type="button"
              >
                Clear
              </Button>
              <Button
                size="lg"
                className="flex-1 h-12 text-base font-medium touch-manipulation"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Done
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}