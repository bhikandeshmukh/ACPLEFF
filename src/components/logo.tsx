<<<<<<< HEAD
// To use this component, place a logo.png file in the `public` directory.
import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center justify-center">
      <Image
        src="/logo.png"
        alt="Efficiency Recorder Logo"
        width={250}
        height={60}
      />
=======
import { Sheet } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-3 text-primary">
      <Sheet className="h-8 w-8" />
      <h1 className="text-3xl font-bold text-foreground font-headline tracking-tight">
        ACPL EFFICIENCY RECORDER
      </h1>
>>>>>>> 1ffd1ce4f519a45920aebc1e7b8500617778dd05
    </div>
  );
}
