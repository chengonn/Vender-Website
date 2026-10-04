"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/services/api-client";
export function SupplierCredentials({ code }: { code: string }) {
  const [adminPassword, setAdminPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [revealed, setRevealed] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!revealed) return;
    const clear = () => setRevealed("");
    const timer = setTimeout(clear, 30000);
    window.addEventListener("blur", clear);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("blur", clear);
    };
  }, [revealed]);
  async function execute(action: "reveal" | "set") {
    setBusy(true);
    setError("");
    setMessage("");
    setRevealed("");
    try {
      const result = await api<{ password?: string }>(
        `suppliers/${code}/password/${action}`,
        { adminPassword, ...(action === "set" ? { newPassword } : {}) },
      );
      if (!active.current) return;
      if (action === "reveal") setRevealed(result.password || "");
      else {
        setNewPassword("");
        setMessage(
          "公司已更新密碼，該供應商的既有登入已失效。請另行提供新密碼。",
        );
      }
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : "操作失敗");
    } finally {
      if (active.current) {
        setAdminPassword("");
        setBusy(false);
      }
    }
  }
  return (
    <section className="mt-5" aria-label="公司帳密管理">
      <p className="text-muted">
        帳密由公司提供。查看或設定密碼前，請再次輸入 Admin
        密碼；操作會留下稽核紀錄。
      </p>
      <label htmlFor="admin-verify-password">Admin 密碼驗證</label>
      <input
        id="admin-verify-password"
        type="password"
        autoComplete="current-password"
        value={adminPassword}
        onChange={(e) => setAdminPassword(e.target.value)}
      />
      <button
        className="button mt-3"
        disabled={busy || !adminPassword}
        onClick={() => void execute("reveal")}
      >
        查看現行密碼
      </button>
      {revealed && (
        <div className="mt-3">
          <p>
            現行密碼：<output aria-label="現行密碼">{revealed}</output>
          </p>
          <p className="text-muted">30 秒後或離開視窗時隱藏。</p>
          <button className="button" onClick={() => setRevealed("")}>
            隱藏現行密碼
          </button>
        </div>
      )}
      <label className="mt-5" htmlFor="company-new-password">
        公司設定新密碼
      </label>
      <input
        id="company-new-password"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <p className="text-muted">
        8–128 碼；適用於忘記密碼或人員異動，更新後原密碼立即失效。
      </p>
      <button
        className="button mt-3"
        disabled={
          busy ||
          !adminPassword ||
          newPassword.length < 8 ||
          newPassword.length > 128
        }
        onClick={() => void execute("set")}
      >
        設定供應商密碼
      </button>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
