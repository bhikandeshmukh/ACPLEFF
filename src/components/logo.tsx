import { Sheet } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-3 text-primary">
      <Sheet className="h-8 w-8" />
      <h1 className="text-3xl font-bold text-foreground font-headline tracking-tight">
        ACPL EFFICIENCY RECORDER
      </h1>
    </div>
  );
}
