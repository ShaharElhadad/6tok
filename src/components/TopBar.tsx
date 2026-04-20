import Link from 'next/link';
import { Logo } from './Logo';
import { FileText, Home } from 'lucide-react';

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-ink-950/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="transition-opacity hover:opacity-90">
          <Logo size={36} />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/" icon={<Home className="h-4 w-4" />}>
            הקלטות
          </NavLink>
          <NavLink href="/scripts" icon={<FileText className="h-4 w-4" />}>
            התסריט
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-ink-200 transition-colors hover:bg-white/5 hover:text-ink-100"
    >
      {icon}
      {children}
    </Link>
  );
}
