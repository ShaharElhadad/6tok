import { cn } from '@/lib/cn';

const MAP: Record<string, { label: string; dot: string; text: string }> = {
  uploaded:     { label: 'הועלה',   dot: 'bg-ink-400',             text: 'text-ink-200' },
  transcribing: { label: 'מתמלל',   dot: 'bg-brand animate-pulse', text: 'text-brand' },
  transcribed:  { label: 'תומלל',   dot: 'bg-ink-100',             text: 'text-ink-100' },
  analyzing:    { label: 'מנתח',    dot: 'bg-brand animate-pulse', text: 'text-brand' },
  analyzed:     { label: 'מוכן',    dot: 'bg-brand',               text: 'text-brand' },
  failed:       { label: 'שגיאה',   dot: 'bg-red-400',             text: 'text-red-300' },
};

export function StatusBadge({ status }: { status: string }) {
  const m = MAP[status] ?? MAP.uploaded;
  return (
    <span className={cn('mono inline-flex items-center gap-2 text-[10px]', m.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  );
}
