"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SimpleMobileDateTimeProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export function SimpleMobileDateTime({
  date,
  onDateChange,
  placeholder = "Select date and time",
  className,
  disabled = false,
  minDate,
  maxDate,
}: SimpleMobileDateTimeProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])
  
  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      const newDate = new Date(value)
      onDateChange?.(newDate)
    } else {
      onDateChange?.(undefined)
    }
  }

  const handleClear = () => {
    onDateChange?.(undefined)
    setIsExpanded(false)
  }

  const formatMinDate = minDate ? format(minDate, "yyyy-MM-dd'T'HH:mm") : undefined
  const formatMaxDate = maxDate ? format(maxDate, "yyyy-MM-dd'T'HH:mm") : undefined

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Main Input */}
      <div className="relative">
        <Input
          type="datetime-local"
          value={date ? format(date, "yyyy-MM-dd'T'HH:mm") : ""}
          onChange={handleDateTimeChange}
          min={formatMinDate}
          max={formatMaxDate}
          disabled={disabled}
          className="w-full h-12 text-base pr-10"
          style={{
            WebkitAppearance: 'none',
            MozAppearance: 'textfield'
          }}
        />
        <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      </div>

      {/* Quick Actions */}
      {!disabled && isClient && (
        <div className="flex flex-col space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full h-10 text-sm"
            type="button"
          >
            {isExpanded ? "Hide Quick Options" : "Show Quick Options"}
          </Button>
          
          {isExpanded && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
              {/* Quick Date Buttons */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Dates</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Today", days: 0 },
                    { label: "Tomorrow", days: 1 },
                    { label: "Next Week", days: 7 },
                    { label: "Next Month", days: 30 }
                  ].map(({ label, days }) => (
                    <button
                      key={label}
                      onClick={() => {
                        const newDate = new Date()
                        newDate.setDate(newDate.getDate() + days)
                        newDate.setHours(9, 0, 0, 0) // Set to 9 AM
                        onDateChange?.(newDate)
                      }}
                      className="px-3 py-2 text-sm border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClear}
                className="w-full h-10"
                type="button"
              >
                Clear Selection
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Selected Date Display */}
      {date && (
        <div className="p-3 bg-primary/10 rounded-lg border">
          <Label className="text-xs font-medium text-muted-foreground">
            Selected Date & Time
          </Label>
          <p className="text-sm font-medium mt-1">
            {format(date, "EEEE, MMMM do, yyyy 'at' h:mm a")}
          </p>
        </div>
      )}
    </div>
  )
}