import { TopBar } from '@/components/TopBar';
import { ScriptsPage as ScriptsView } from '@/components/ScriptsPage';

export const dynamic = 'force-dynamic';

export default function ScriptsRoute() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-100">תסריט המכירה</h1>
          <p className="mt-1 text-sm text-ink-300">
            התסריט הפעיל מוזרק לכל ניתוח חדש — ה־AI משווה וקובע מה דויק ומה פוספס.
          </p>
        </div>
        <ScriptsView />
      </main>
    </div>
  );
}
