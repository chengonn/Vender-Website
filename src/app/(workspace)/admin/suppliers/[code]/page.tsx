import { SupplierReviewScreen } from "@/features/suppliers/supplier-review-screen";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <SupplierReviewScreen code={code} />;
}
