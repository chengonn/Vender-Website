"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function ConfirmDialog({
  open,
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = "確認示範送出",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="modal-body">
        <h2 id="confirm-dialog-title">{title}</h2>
        {children}
      </div>
      <div className="modal-actions">
        <button type="button" className="button" onClick={onCancel}>
          返回編輯
        </button>
        <button type="button" className="button primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
