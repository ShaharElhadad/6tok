'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Mic, FileText, Upload, Search, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Sidebar() {
  const pathname = usePathname() || '/';

  return (
    <aside className="sticky top-0 flex h-screen w-[244px] flex-none flex-col border-l border-white/[0.06] bg-ink-900">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <Image
          src="/logo.png"
          alt="6TOK"
          width={96}
          height={96}
          priority
          className="h-9 w-9 flex-none object-contain"
        />
        <div className="min-w-0 leading-none">
          <div className="font-extrabold tracking-[0.14em] text-ink-100 text-[14px]">
            6TOK
          </div>
          <div className="mt-1 text-[10px] text-brand">למכור בביטחון</div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[13px] text-ink-400 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.05]">
          <Search className="h-3.5 w-3.5" />
          <span>חיפוש…</span>
          <span className="mr-auto rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-ink-400 ring-1 ring-white/[0.06]">
            ⌘K
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pb-4 pt-2">
        <NavGroup title="ניווט">
          <NavItem
            href="/"
            label="הקלטות"
            icon={<Mic className="h-[16px] w-[16px]" />}
            active={pathname === '/' || pathname.startsWith('/recordings')}
          />
          <NavItem
            href="/scripts"
            label="תסריטים"
            icon={<FileText className="h-[16px] w-[16px]" />}
            active={pathname.startsWith('/scripts')}
          />
        </NavGroup>

        <NavGroup title="צוות" dim>
          <NavItem
            href="/team"
            label="מתאמנים"
            icon={<Users className="h-[16px] w-[16px]" />}
            disabled
          />
          <NavItem
            href="/settings"
            label="הגדרות"
            icon={<Settings className="h-[16px] w-[16px]" />}
            disabled
          />
        </NavGroup>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-ink-300">מחובר</span>
          <span className="mr-auto text-[10px] text-ink-500">v0.1</span>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  title,
  dim,
  children,
}: {
  title: string;
  dim?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div
        className={cn(
          'mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.1em]',
          dim ? 'text-ink-500' : 'text-ink-400',
        )}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  disabled,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div
        className="relative flex cursor-default items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] text-ink-500"
        title="בקרוב"
      >
        <span className="text-ink-600">{icon}</span>
        {label}
        <span className="mr-auto rounded bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-ink-500 ring-1 ring-white/[0.05]">
          בקרוב
        </span>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors',
        active
          ? 'bg-white/[0.06] text-ink-100'
          : 'text-ink-300 hover:bg-white/[0.03] hover:text-ink-100',
      )}
    >
      <span
        className={cn(
          'transition-colors',
          active ? 'text-brand' : 'text-ink-400 group-hover:text-ink-200',
        )}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}
