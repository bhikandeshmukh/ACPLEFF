import { EnhancedTrackerForm } from '@/components/enhanced-tracker-form';
import { Logo } from '@/components/logo';
import Link from 'next/link';

import { Home } from 'lucide-react';


export default function TaskPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <Logo />
            </div>
            <Link href="/">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 h-9 sm:h-10 px-3 sm:px-4 transition-colors">
                <Home className="h-4 w-4" />
                <span className="hidden xs:inline">Back to Home</span>
                <span className="xs:hidden">Home</span>
              </button>
            </Link>
          </header>

          {/* Main Content */}
          <main className="pb-6">
            <EnhancedTrackerForm />
          </main>

          {/* Footer */}
          <footer className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Efficiency Recorder.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
