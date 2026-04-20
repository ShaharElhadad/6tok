import Image from 'next/image';
import { cn } from '@/lib/cn';

type Props = {
  size?: number;
  withText?: boolean;
  className?: string;
};

export function Logo({ size = 56, withText = true, className }: Props) {
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
      {withText && (
        <div className="flex flex-col leading-none">
          <span
            className="font-black tracking-[0.14em] text-ink-100"
            style={{ fontSize: Math.round(size * 0.34) }}
          >
            6TOK
          </span>
          <span
            className="mono mt-1 text-brand"
            style={{ fontSize: Math.max(9, Math.round(size * 0.17)) }}
          >
            למכור בביטחון
          </span>
        </div>
      )}
    </div>
  );
}
