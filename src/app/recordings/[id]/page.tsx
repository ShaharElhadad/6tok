import { AppShell } from '@/components/AppShell';
import { RecordingView } from '@/components/RecordingView';

export const dynamic = 'force-dynamic';

export default async function RecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell title="שיחה" subtitle={`RECORDING · #${id}`}>
      <div className="p-6 md:p-8">
        <RecordingView id={Number(id)} />
      </div>
    </AppShell>
  );
}
