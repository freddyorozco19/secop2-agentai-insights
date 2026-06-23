import AnalysisResult from "@/components/AnalysisResult";

export default async function AnalisisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const processId = decodeURIComponent(id);

  if (!processId) return null;

  return <AnalysisResult processId={processId} />;
}
