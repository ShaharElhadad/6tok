import { TopBar } from '@/components/TopBar';
import { RecordingView } from '@/components/RecordingView';

export const dynamic = 'force-dynamic';

export default async function RecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <RecordingView id={Number(id)} />
      </main>
    </div>
  );
}
