import { TrackerForm } from '@/components/tracker-form';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TaskPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 antialiased">
      <div className="w-full max-w-2xl mx-auto">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Logo />
           <Link href="/" passHref>
            <Button variant="outline"><Home className="mr-2 h-4 w-4" />Back to Home</Button>
          </Link>
        </header>
        <main>
            <TrackerForm />
        </main>
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Efficiency Recorder.</p>
        </footer>
      </div>
    </div>
  );
}
