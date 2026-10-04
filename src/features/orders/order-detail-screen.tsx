"use client";
import { useDemo } from "@/context/demo-context";
import { OrderDetail } from "@/components/orders/order-detail";
import { BackLink, EmptyState } from "@/components/ui/primitives";
export function OrderDetailScreen({ id }: { id: string }) {
  const { orders } = useDemo();
  const order = orders.find((item) => item.id === id);
  if (!order)
    return (
      <>
        <BackLink href="/orders" />
        <EmptyState title="找不到這筆示範訂單">
          <p>新建資料只保留於本次示範；重新整理後請回列表重新開始。</p>
        </EmptyState>
      </>
    );
  return <OrderDetail order={order} />;
}
