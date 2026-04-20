import Image from 'next/image';
import { cn } from '@/lib/cn';

type Props = {
  size?: number;
  withTagline?: boolean;
  className?: string;
};

export function Logo({ size = 44, withTagline = true, className }: Props) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Image
        src="/logo.png"
        alt="6TOK"
        width={size * 2}
        height={size * 2}
        priority
        className="object-contain"
        style={{ width: size, height: size }}
      />
      {withTagline && (
        <div className="flex flex-col leading-tight">
          <span className="text-ink-100 font-extrabold tracking-wide text-lg">6TOK</span>
          <span className="text-brand text-xs font-medium">למכור בביטחון</span>
        </div>
      )}
    </div>
  );
}
