import { Logo } from '@/components/logo';
import Link from 'next/link';
import { FilePlus, LineChart } from 'lucide-react';
import { ActiveTaskStatus } from '@/components/active-task-status';

// Force dynamic rendering - no caching for real-time Google Sheets data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-first responsive container */}
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="flex justify-center mb-8 sm:mb-12">
            <Logo />
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col gap-6 lg:gap-8 items-center">
            {/* Actions Section */}
            <div className="w-full max-w-md text-center">
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  Efficiency Recorder
                </h1>
                <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                  Select an option to continue
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <Link href="/task" className="w-full">
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base sm:text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 h-12 sm:h-14 lg:h-16 px-4 sm:px-6 lg:px-8 w-full transition-colors">
                    <FilePlus className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="hidden xs:inline">Submit New Task</span>
                    <span className="xs:hidden">New Task</span>
                  </button>
                </Link>
                <Link href="/report" className="w-full">
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base sm:text-lg font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 h-12 sm:h-14 lg:h-16 px-4 sm:px-6 lg:px-8 w-full transition-colors">
                    <LineChart className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="hidden xs:inline">View Report</span>
                    <span className="xs:hidden">Reports</span>
                  </button>
                </Link>
              </div>
            </div>

            {/* Active Task Status - Below Reports */}
            <div className="w-full max-w-md">
              <ActiveTaskStatus />
            </div>
          </main>

          {/* Footer */}
          <footer className="mt-8 sm:mt-12 lg:mt-16 text-center text-xs sm:text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Efficiency Recorder.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
