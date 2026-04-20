'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { cn } from '@/lib/cn';

export function TopBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 hairline-b bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-6">
        {/* Right cluster (RTL start): Logo + Nav together */}
        <div className="flex items-center gap-10">
          <Link href="/" className="transition-opacity hover:opacity-90">
            <Logo size={64} />
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/" active={pathname === '/'}>
              הקלטות
            </NavLink>
            <NavLink href="/scripts" active={pathname?.startsWith('/scripts')}>
              תסריט
            </NavLink>
          </nav>
        </div>

        {/* Left cluster: meta / build marker */}
        <div className="hidden items-center gap-3 sm:flex">
          <span className="mono text-[10px] text-ink-400">v0.1 · MVP</span>
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative px-3 py-2 text-[15px] transition-colors',
        active ? 'text-ink-100' : 'text-ink-300 hover:text-ink-100',
      )}
    >
      {children}
      {active && (
        <span className="absolute inset-x-3 -bottom-px h-[2px] bg-brand" aria-hidden />
      )}
    </Link>
  );
}
