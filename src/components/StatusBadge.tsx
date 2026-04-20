import { cn } from '@/lib/cn';
import { CheckCircle2, CircleAlert, Loader2, Upload, Sparkles } from 'lucide-react';

const MAP: Record<string, { label: string; cls: string; icon: JSX.Element }> = {
  uploaded: {
    label: 'הועלה',
    cls: 'text-ink-200 bg-ink-800 ring-white/5',
    icon: <Upload className="h-3.5 w-3.5" />,
  },
  transcribing: {
    label: 'מתמלל…',
    cls: 'text-brand bg-brand/10 ring-brand/30',
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  transcribed: {
    label: 'תומלל',
    cls: 'text-sky-300 bg-sky-500/10 ring-sky-500/30',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  analyzing: {
    label: 'מנתח…',
    cls: 'text-brand bg-brand/10 ring-brand/30',
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  analyzed: {
    label: 'מוכן',
    cls: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30',
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  failed: {
    label: 'שגיאה',
    cls: 'text-red-300 bg-red-500/10 ring-red-500/30',
    icon: <CircleAlert className="h-3.5 w-3.5" />,
  },
};

export function StatusBadge({ status }: { status: string }) {
  const m = MAP[status] ?? MAP.uploaded;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1',
        m.cls,
      )}
    >
      {m.icon}
      {m.label}
    </span>
  );
}
