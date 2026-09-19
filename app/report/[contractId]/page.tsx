import ReportClient from "./report-client";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;
  return <ReportClient contractId={contractId} />;
}
