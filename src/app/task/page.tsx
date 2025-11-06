import { EnhancedTrackerForm } from '@/components/enhanced-tracker-form';
import { Logo } from '@/components/logo';
import Link from 'next/link';

import { Home } from 'lucide-react';


export default function TaskPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 antialiased">
      <div className="w-full max-w-2xl mx-auto">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Logo />
           <Link href="/" passHref>
            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              <Home className="mr-2 h-4 w-4" />Back to Home
            </button>
          </Link>
        </header>
        <main>
            <EnhancedTrackerForm />
        </main>
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Efficiency Recorder.</p>
        </footer>
      </div>
    </div>
  );
}
