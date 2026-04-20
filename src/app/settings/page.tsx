import { AppShell } from '@/components/AppShell';
import { SettingsPage } from '@/components/SettingsPage';

export const dynamic = 'force-dynamic';

export default function SettingsRoute() {
  return (
    <AppShell title="הגדרות">
      <SettingsPage />
    </AppShell>
  );
}
