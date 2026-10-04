"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Save, Send, Paperclip, LockKeyhole } from "lucide-react";
import { useDemo } from "@/context/demo-context";
import { blankOrder } from "@/data/mock-orders";
import { orderSchema } from "@/schemas/order-schema";
import type { Order, OrderFormValues } from "@/types/order";
import {
  BackLink,
  EmptyState,
  PageHeading,
  PendingNote,
} from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
export function OrderFormScreen({ id }: { id?: string }) {
  const { orders } = useDemo();
  const order = id ? orders.find((item) => item.id === id) : undefined;
  if (id && !order)
    return (
      <>
        <BackLink href="/orders" />
        <EmptyState title="找不到這筆示範訂單">
          <p>重新整理會清除新建示範資料，請從列表重新開始。</p>
        </EmptyState>
      </>
    );
  if (
    order &&
    !["DRAFT", "REJECTED", "CORRECTION_REQUIRED", "EDITABLE"].includes(
      order.status,
    )
  )
    return (
      <>
        <BackLink href={`/orders/${id}`}>返回訂單明細</BackLink>
        <section className="panel">
          <EmptyState title="此訂單目前已鎖定">
            <LockKeyhole size={24} />
            <p>修改期限與開放規則待確認；本模板不直接修改已送出的訂單。</p>
          </EmptyState>
        </section>
      </>
    );
  return <OrderForm key={id ?? "new"} order={order} />;
}
function OrderForm({ order }: { order?: Order }) {
  const router = useRouter();
  const { saveDraft } = useDemo();
  const [attachments, setAttachments] = useState<string[]>(
    order?.attachments ?? [],
  );
  const [pending, setPending] = useState<OrderFormValues | null>(null);
  const [saveError, setSaveError] = useState("");
  const saving = useRef(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: structuredClone(order ?? blankOrder),
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "charges",
  });
  const basicFields: {
    name: FieldPath<OrderFormValues>;
    label: string;
    type?: string;
  }[] = [
    { name: "customerName", label: "客戶名稱" },
    { name: "supplierName", label: "供應商名稱" },
    { name: "fileNumber", label: "File No." },
    { name: "invoiceDate", label: "Invoice 日期", type: "date" },
    { name: "origin", label: "起運地" },
    { name: "destination", label: "目的地" },
    { name: "country", label: "國家／地區" },
  ];
  const shipmentFields: { name: FieldPath<OrderFormValues>; label: string }[] =
    [
      { name: "vesselName", label: "船名" },
      { name: "voyageNumber", label: "航次" },
      { name: "mblNumber", label: "MBL 號碼" },
      { name: "hblNumber", label: "HBL 號碼" },
      { name: "containerNumber", label: "櫃號（欄位示意）" },
      { name: "containerQuantity", label: "櫃數（待確認）" },
      { name: "containerType", label: "櫃型（待確認）" },
    ];
  async function save(values: OrderFormValues, submit = false) {
    if (saving.current) return;
    saving.current = true;
    try {
      const saved = await saveDraft(values, attachments, order?.id, submit);
      setPending(null);
      router.push(`/orders/${saved.id}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "無法儲存示範資料");
      setPending(null);
    } finally {
      saving.current = false;
    }
  }
  return (
    <>
      <BackLink href="/orders" />
      <PageHeading
        eyebrow="ORDER / DRAFT"
        title={order ? "編輯訂單" : "建立訂單"}
        description={
          order
            ? `${order.id} · 草稿保存於本機資料庫`
            : "先整理單票資料，再逐筆填寫費用。"
        }
      />
      <PendingNote>
        Demo 送出需客戶名稱、File No.
        與至少一筆費用。供應商由登入帳號決定；金額不作正式計算，附件僅記錄示範檔名。
      </PendingNote>
      {saveError && (
        <p role="alert" className="field-error">
          {saveError}
        </p>
      )}
      <form
        className="section-stack"
        onSubmit={handleSubmit((values) => setPending(values))}
        noValidate
      >
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>01　基本資料</h2>
              <p>訂單編號由後端產生</p>
            </div>
            <span className="status status-draft">草稿</span>
          </div>
          <div className="panel-body form-grid">
            {basicFields.map(({ name, label, type }) => (
              <div key={name}>
                <label htmlFor={name}>{label}</label>
                <input
                  id={name}
                  type={type ?? "text"}
                  {...register(name)}
                  placeholder={type ? undefined : `填寫${label}`}
                />
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>02　物流單票</h2>
              <p>欄位依規格預留；多櫃支援與必填條件尚未定案</p>
            </div>
          </div>
          <div className="panel-body form-grid">
            {shipmentFields.map(({ name, label }) => (
              <div key={name}>
                <label htmlFor={name}>{label}</label>
                <input
                  id={name}
                  {...register(name)}
                  aria-invalid={
                    name === "containerQuantity" && !!errors.containerQuantity
                  }
                  aria-describedby={
                    name === "containerQuantity" && errors.containerQuantity
                      ? "container-error"
                      : undefined
                  }
                  placeholder={`填寫${label.replace("（待確認）", "")}`}
                />
                {name === "containerQuantity" && errors.containerQuantity && (
                  <p id="container-error" className="field-error">
                    {errors.containerQuantity.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>03　費用明細</h2>
              <p>各幣別分別填寫；稅額及總計保留待確認</p>
            </div>
            <button
              type="button"
              className="button"
              onClick={() => append(structuredClone(blankOrder.charges[0]))}
            >
              <Plus size={16} />
              新增費用
            </button>
          </div>
          <div className="table-scroll">
            <table className="charge-table">
              <caption className="sr-only">費用輸入表格</caption>
              <thead>
                <tr>
                  <th>費用名稱</th>
                  <th>數量</th>
                  <th>單位</th>
                  <th>單價</th>
                  <th>幣別</th>
                  <th>稅別</th>
                  <th>備註</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td>
                      <input
                        className="name-input"
                        aria-label={`費用名稱 ${index + 1}`}
                        {...register(`charges.${index}.name`)}
                        placeholder="示範費用名稱"
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`數量 ${index + 1}`}
                        aria-invalid={!!errors.charges?.[index]?.quantity}
                        {...register(`charges.${index}.quantity`)}
                      />
                      {errors.charges?.[index]?.quantity && (
                        <p className="field-error">
                          {errors.charges[index]?.quantity?.message}
                        </p>
                      )}
                    </td>
                    <td>
                      <input
                        aria-label={`單位 ${index + 1}`}
                        {...register(`charges.${index}.unit`)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`單價 ${index + 1}`}
                        aria-invalid={!!errors.charges?.[index]?.unitPrice}
                        {...register(`charges.${index}.unitPrice`)}
                        placeholder="0"
                      />
                      {errors.charges?.[index]?.unitPrice && (
                        <p className="field-error">
                          {errors.charges[index]?.unitPrice?.message}
                        </p>
                      )}
                    </td>
                    <td>
                      <select
                        aria-label={`幣別 ${index + 1}`}
                        {...register(`charges.${index}.currency`)}
                      >
                        <option>TWD</option>
                        <option>USD</option>
                        <option>JPY</option>
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`稅別 ${index + 1}`}
                        {...register(`charges.${index}.taxType`)}
                      >
                        <option value="TBD">待確認</option>
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label={`費用備註 ${index + 1}`}
                        {...register(`charges.${index}.note`)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`移除費用 ${index + 1}`}
                        onClick={() => remove(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {fields.length === 0 && (
            <p className="text-muted p-6 text-sm">
              尚未新增費用，可先儲存草稿。
            </p>
          )}
          <div className="table-footer">
            <span>幣別選項僅供展示，非正式可用幣別清單</span>
            <span>稅前／稅額／含稅合計：待規則確認</span>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>04　附件與備註</h2>
          </div>
          <div className="panel-body section-stack">
            <div className="attachment-box">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip size={18} />
                <h3>帳務附件</h3>
              </div>
              <p className="text-muted text-sm mb-3">
                此處僅新增假附件名稱，不讀取或上傳檔案；格式、大小與數量待確認。
              </p>
              <button
                className="button"
                type="button"
                onClick={() =>
                  setAttachments([
                    ...attachments,
                    `DEMO-附件-${crypto.randomUUID().slice(0, 4)}.pdf`,
                  ])
                }
              >
                <Plus size={16} />
                加入示範附件
              </button>
              <ul className="attachment-list">
                {attachments.map((name) => (
                  <li key={name}>
                    <span>{name}</span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`移除 ${name}`}
                      onClick={() =>
                        setAttachments(
                          attachments.filter((item) => item !== name),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label className="mb-2" htmlFor="note">
                訂單備註（最多 1000 字）
              </label>
              <textarea
                id="note"
                {...register("note")}
                aria-invalid={!!errors.note}
                aria-describedby={errors.note ? "note-error" : undefined}
                placeholder="補充這筆訂單的說明"
              />
              {errors.note && (
                <p role="alert" id="note-error" className="field-error">
                  {errors.note.message}
                </p>
              )}
            </div>
          </div>
        </section>
        <div className="form-actions">
          <span className="text-muted text-xs">示範內容於重新整理後清除</span>
          <div className="flex gap-3">
            <button
              type="button"
              className="button"
              onClick={(event) => {
                void handleSubmit((values) => save(values))(event);
              }}
            >
              <Save size={17} />
              儲存草稿
            </button>
            <button type="submit" className="button primary">
              <Send size={16} />
              預覽送出
            </button>
          </div>
        </div>
      </form>
      <ConfirmDialog
        open={pending !== null}
        title="確認送出這筆示範訂單？"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) save(pending, true);
        }}
      >
        <p>
          確認後將建立示範版本 v1
          並鎖定編輯。此操作不會建立正式訂單，也不代表必填、稅額或權限規則已通過驗證。
        </p>
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
          <p>File No.：{pending?.fileNumber || "未填寫"}</p>
          <p>費用筆數：{pending?.charges.length ?? 0}</p>
          <p>金額與稅額：待確認，未計算</p>
        </div>
      </ConfirmDialog>
    </>
  );
}
