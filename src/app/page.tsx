import { TrackerForm } from '@/components/tracker-form';
import { Logo } from '@/components/logo';

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 antialiased">
      <div className="w-full max-w-2xl mx-auto">
        <header className="mb-8 flex justify-center">
          <Logo />
        </header>
        <main>
          <TrackerForm />
        </main>
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ACPL EFFICIENCY RECORDER. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
