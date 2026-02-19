import ClientPage from './ClientPage';

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientPage runId={id} />;
}
