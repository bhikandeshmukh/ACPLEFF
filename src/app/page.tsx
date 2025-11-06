import { Logo } from '@/components/logo';
import Link from 'next/link';
import { FilePlus, LineChart } from 'lucide-react';
import { ActiveTaskStatus } from '@/components/active-task-status';

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 antialiased">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-12 flex justify-center">
          <Logo />
        </header>
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="text-center lg:text-left">
            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight">Efficiency Recorder</h1>
              <p className="text-muted-foreground mt-2">Select an option to continue</p>
            </div>
            <div className="flex flex-col gap-4">
              <Link href="/task" passHref className="w-full">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-16 px-8 w-full">
                  <FilePlus className="mr-3 h-6 w-6" />
                  Submit New Task
                </button>
              </Link>
              <Link href="/report" passHref className="w-full">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-lg font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-16 px-8 w-full">
                  <LineChart className="mr-3 h-6 w-6" />
                  View Report
                </button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ActiveTaskStatus />
          </div>
        </main>
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Efficiency Recorder.</p>
        </footer>
      </div>
    </div>
  );
}
