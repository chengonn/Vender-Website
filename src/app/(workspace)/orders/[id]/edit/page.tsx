import { OrderFormScreen } from "@/features/orders/order-form-screen";
export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderFormScreen id={id} />;
}
