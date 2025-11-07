"use client"

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    // Check initial status
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowAlert(true)
      // Hide alert after 3 seconds
      setTimeout(() => setShowAlert(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowAlert(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showAlert && isOnline) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <Alert className={`${isOnline ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}
        <AlertDescription className={isOnline ? 'text-green-800' : 'text-red-800'}>
          {isOnline ? (
            'Connection restored! You can continue working.'
          ) : (
            'No internet connection. Some features may not work.'
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}