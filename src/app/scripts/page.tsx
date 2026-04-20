import { AppShell } from '@/components/AppShell';
import { ScriptsPage as ScriptsView } from '@/components/ScriptsPage';

export const dynamic = 'force-dynamic';

export default function ScriptsRoute() {
  return (
    <AppShell title="תסריטים">
      <div className="p-8">
        <ScriptsView />
      </div>
    </AppShell>
  );
}
