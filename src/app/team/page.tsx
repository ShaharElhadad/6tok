import { AppShell } from '@/components/AppShell';
import { TeamPage } from '@/components/TeamPage';

export const dynamic = 'force-dynamic';

export default function TeamRoute() {
  return (
    <AppShell title="מתאמנים">
      <TeamPage />
    </AppShell>
  );
}
