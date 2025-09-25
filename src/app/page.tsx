import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FilePlus, LineChart } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 antialiased">
      <div className="w-full max-w-md mx-auto text-center">
        <header className="mb-12 flex justify-center">
          <Logo />
        </header>
        <main className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Efficiency Recorder</h1>
                <p className="text-muted-foreground mt-2">Select an option to continue</p>
            </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/task" passHref className="flex-1">
              <Button size="lg" className="w-full text-lg py-8">
                <FilePlus className="mr-3 h-6 w-6" />
                Submit New Task
              </Button>
            </Link>
            <Link href="/report" passHref className="flex-1">
              <Button size="lg" variant="outline" className="w-full text-lg py-8">
                <LineChart className="mr-3 h-6 w-6" />
                View Report
              </Button>
            </Link>
          </div>
        </main>
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Efficiency Recorder.</p>
        </footer>
      </div>
    </div>
  );
}
