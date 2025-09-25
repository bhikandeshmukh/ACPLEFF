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
    </div>
  );
}
