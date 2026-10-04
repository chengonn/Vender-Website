import { ChangeRequestScreen } from "@/features/orders/change-request-screen";
export default async function ChangeRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChangeRequestScreen id={id} />;
}
