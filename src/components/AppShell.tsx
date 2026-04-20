import { Sidebar } from './Sidebar';

export function AppShell({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  // RTL: first grid column = visual right (sidebar), second = visual left (main).
  return (
    <div className="grid min-h-screen grid-cols-[244px_1fr]">
      <Sidebar />
      <main className="min-w-0 bg-ink-950">
        {title && (
          <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-white/[0.06] bg-ink-950/90 px-6 backdrop-blur-md">
            <h1 className="truncate text-[16px] font-semibold text-ink-100">
              {title}
            </h1>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        <div>{children}</div>
      </main>
    </div>
  );
}
