"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  KEY,
  roles,
  seed,
  restore,
  transition,
  orderSchema,
  type Role,
  type Store,
  type Action,
  type Order,
  type OrderInput,
  type Statement,
} from "../lib/model";

const descriptions: Record<Role, string> = {
  Vendor: "建立與提交訂單，追蹤審核進度",
  Admin: "建立示範供應商，管理啟用狀態",
  GSD: "檢視訂單文件，核准或退回更正",
  Accounting: "核對金額、確認對帳與完成月結",
};
type Tab = "overview" | "orders" | "suppliers" | "statements";
const tabNames: Record<Tab, string> = {
  overview: "工作總覽",
  orders: "訂單與審核",
  suppliers: "供應商管理",
  statements: "對帳與月結",
};
function Logo() {
  return (
    <svg width="44" height="44" viewBox="0 0 140 140" aria-hidden="true">
      <rect width="140" height="140" rx="28" fill="#19263c" />
      <path d="M28 86 70 62 112 86 70 110Z" fill="#315e94" />
      <path d="M28 70 70 46 112 70 70 94Z" fill="#65b8ed" />
      <path d="m70 24 5 13 14 5-14 5-5 13-5-13-14-5 14-5Z" fill="#e8f5ff" />
    </svg>
  );
}
function download(statement: Statement) {
  const rows = [
    ["月結單", statement.id],
    ["供應商", statement.company],
    ["帳期", statement.period],
    ["幣別", "核定合計"],
    ...statement.totals.map((t) => [t.currency, t.amount]),
    ["訂單", ...statement.orderIds],
    ["備註", "僅供面試展示，非正式發票或付款憑證"],
  ];
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${statement.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
export default function Page() {
  const [store, setStore] = useState<Store | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Order | "new" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [confirmation, setConfirmation] = useState<
    "reset" | { company: string; period: string } | null
  >(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setStore(restore(localStorage.getItem(KEY)));
      } catch {
        setStore(seed());
        setMessage(
          "無法讀取瀏覽器資料，已載入預設範例；後续操作將嘗試重新保存。",
        );
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  function save(next: Store, success: string) {
    setStore(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setMessage(success);
    } catch {
      setMessage(`${success}；瀏覽器不允許儲存，重新整理後將不保留本次操作。`);
    }
  }
  function act(action: Action): boolean {
    if (!store || !role) return false;
    try {
      save(transition(store, role, action), "操作完成，示範資料已更新。");
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "操作失敗");
      return false;
    }
  }
  function switchRole(next: Role) {
    setConfirmation(null);
    setRole(next);
    setEditing(null);
    setSelected(null);
    setTab("overview");
    setQuery("");
    setMessage(`已切換至 ${next}。這是角色模擬，不是真實登入。`);
  }
  const orders =
    store?.orders.filter((o) => role !== "Vendor" || o.company === "STA1001") ||
    [];
  const current = orders.find((o) => o.id === selected);
  const statements =
    store?.statements.filter(
      (s) => role !== "Vendor" || s.company === "STA1001",
    ) || [];
  if (!store) return <main className="loading">正在載入星航示範工作台…</main>;
  return (
    <>
      {!role ? (
        <main className="landing">
          <section className="intro">
            <div className="wordmark">
              <Logo />
              <strong>
                STARLANE<span>星航供應商平台</span>
              </strong>
            </div>
            <p className="eyebrow">SUPPLIER COLLABORATION · PORTFOLIO</p>
            <h1>
              從一張訂單，
              <br />
              看見跨部門協作。
            </h1>
            <p className="lead">
              一個以企業作業情境為出發點的互動原型。體驗供應商送單、文件審核，以及對帳到月結的完整示範。
            </p>
            <div className="journey">
              <span>01 建立訂單</span>
              <span>02 文件審核</span>
              <span>03 對帳月結</span>
            </div>
            <p className="muted">虛構品牌與假資料 · 不需註冊 · 不寄送郵件</p>
          </section>
          <section className="entry">
            <p className="eyebrow">CHOOSE A WORKSPACE</p>
            <h2>選擇角色，開始體驗</h2>
            <p className="muted">
              建議先以 GSD 核准 DEMO-001，再切換 Accounting 完成對帳。
            </p>
            {roles.map((r) => (
              <button
                key={r}
                className="role-card"
                onClick={() => switchRole(r)}
              >
                <span className="role-icon">{r[0]}</span>
                <span>
                  <strong>{r}</strong>
                  <small>{descriptions[r]}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
            <p className="fine">
              所有資料僅存在此瀏覽器。角色切換僅模擬業務操作，並非身分驗證或正式權限保護。
            </p>
          </section>
        </main>
      ) : (
        <div className="shell">
          <aside>
            <div className="wordmark">
              <Logo />
              <strong>
                STARLANE<span>星航供應商平台</span>
              </strong>
            </div>
            <p className="eyebrow">WORKSPACE</p>
            <div className="workspace">
              <strong>{role}</strong>
              <small>{descriptions[role]}</small>
            </div>
            <nav aria-label="主選單">
              {(Object.keys(tabNames) as Tab[])
                .filter((t) => t !== "suppliers" || role === "Admin")
                .map((t) => (
                  <button
                    key={t}
                    aria-current={tab === t ? "page" : undefined}
                    onClick={() => {
                      setTab(t);
                      setSelected(null);
                      setEditing(null);
                    }}
                  >
                    {tabNames[t]}
                  </button>
                ))}
            </nav>
            <div className="sidebar-note">
              <span className="dot" /> INTERACTIVE DEMO
              <p>
                每一次操作，都是流程驗證。
                <br />
                所有品牌與資料皆為虛構。
              </p>
            </div>
            <button
              className="secondary"
              onClick={() => {
                setRole(null);
                setMessage("");
              }}
            >
              返回角色選擇
            </button>
          </aside>
          <div className="content">
            <header>
              <span>
                展示工作空間 / <strong>{tabNames[tab]}</strong>
              </span>
              <label className="role-select">
                切換角色
                <select
                  value={role}
                  onChange={(e) => switchRole(e.target.value as Role)}
                >
                  {roles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            </header>
            <div className="demo-banner">
              <span>純前端展示 · 瀏覽器儲存 · 無後端連線</span>
              <button onClick={() => setConfirmation("reset")}>
                重設示範資料
              </button>
            </div>
            <main>
              {confirmation && (
                <section className="notice" aria-label="操作確認">
                  <h2>
                    {confirmation === "reset"
                      ? "確認重設示範資料？"
                      : "確認月結？"}
                  </h2>
                  <p>
                    {confirmation === "reset"
                      ? "將清除本展示版在此瀏覽器的操作，恢復三筆示範訂單。"
                      : `結帳 ${confirmation.company}／${confirmation.period} 的全部已對帳訂單。結帳後不可修改。`}
                  </p>
                  <div className="actions">
                    <button
                      className="primary"
                      onClick={() => {
                        if (confirmation === "reset") {
                          save(seed(), "已恢復預設示範資料。");
                          setEditing(null);
                          setSelected(null);
                        } else act({ type: "close", ...confirmation });
                        setConfirmation(null);
                      }}
                    >
                      確認執行
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setConfirmation(null)}
                    >
                      取消操作
                    </button>
                  </div>
                </section>
              )}
              <div className="page-heading">
                <div>
                  <p className="eyebrow">STARLANE / {role.toUpperCase()}</p>
                  <h1>{tabNames[tab]}</h1>
                  <p className="muted">{descriptions[role]}</p>
                </div>
                {role === "Vendor" && (
                  <button
                    className="primary"
                    onClick={() => {
                      setTab("orders");
                      setSelected(null);
                      setEditing("new");
                    }}
                  >
                    ＋ 建立訂單
                  </button>
                )}
              </div>
              {message && (
                <div role="status" className="notice">
                  {message}
                </div>
              )}
              {tab === "overview" && (
                <>
                  <div className="stats">
                    {[
                      "待 GSD 審核",
                      "待 Accounting 對帳",
                      "已對帳",
                      "已結帳",
                    ].map((status) => (
                      <div className="stat" key={status}>
                        <span>{status}</span>
                        <strong>
                          {orders
                            .filter((o) => o.status === status)
                            .length.toString()
                            .padStart(2, "0")}
                        </strong>
                        <small>示範訂單</small>
                      </div>
                    ))}
                  </div>
                  <section className="panel guide">
                    <p className="eyebrow">A THREE-MINUTE WALKTHROUGH</p>
                    <h2>用三分鐘走完主要流程</h2>
                    <ol>
                      <li>
                        <strong>Vendor 建立與送審</strong>
                        <p>填寫一筆費用資料，儲存草稿後提交。</p>
                      </li>
                      <li>
                        <strong>GSD 核准或退回</strong>
                        <p>檢視訂單，核准後交由 Accounting 核對。</p>
                      </li>
                      <li>
                        <strong>Accounting 對帳與月結</strong>
                        <p>選擇未結帳月份、確認金額，再產生示範月結單。</p>
                      </li>
                    </ol>
                    <button
                      className="secondary"
                      onClick={() => setTab("orders")}
                    >
                      檢視示範訂單 →
                    </button>
                  </section>
                  <section className="panel">
                    <h2>作品範圍</h2>
                    <p className="muted">
                      本版展示角色分工、訂單狀態流轉、表單驗證、差異說明、月結鎖定與操作紀錄。Admin
                      可建立及啟用示範供應商；Vendor 固定代表 STA1001。
                    </p>
                    <p className="muted">
                      正式登入、真實附件、郵件、稅額、Invoice、Debit / Credit
                      Note 及 24
                      小時修改申請不在本展示版內。附件與帳密請勿輸入；已核准訂單不開放直接修改。
                    </p>
                  </section>
                </>
              )}
              {tab === "orders" && (
                <>
                  {editing && (
                    <OrderForm
                      key={typeof editing === "string" ? "new" : editing.id}
                      order={editing === "new" ? undefined : editing}
                      onCancel={() => setEditing(null)}
                      onSave={(values) => {
                        if (
                          act({
                            type: "save",
                            values,
                            id: editing === "new" ? undefined : editing.id,
                          })
                        )
                          setEditing(null);
                      }}
                    />
                  )}
                  <section className="panel">
                    <div className="section-title">
                      <h2>訂單列表</h2>
                      <label>
                        搜尋
                        <input
                          placeholder="訂單號、提單或狀態"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>訂單 / 提單</th>
                            <th>航線</th>
                            <th>申報金額</th>
                            <th>狀態</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders
                            .filter((o) =>
                              `${o.id} ${o.reference} ${o.status}`.includes(
                                query.trim(),
                              ),
                            )
                            .map((o) => (
                              <tr key={o.id}>
                                <td>
                                  <strong>{o.id}</strong>
                                  <small>{o.reference}</small>
                                </td>
                                <td>{o.route}</td>
                                <td>
                                  {o.currency} {o.amount}
                                </td>
                                <td>
                                  <span className="badge">{o.status}</span>
                                </td>
                                <td>
                                  <button
                                    className="link"
                                    onClick={() => {
                                      setSelected(o.id);
                                      setEditing(null);
                                    }}
                                  >
                                    查看 / 處理
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {!orders.filter((o) =>
                        `${o.id} ${o.reference} ${o.status}`.includes(
                          query.trim(),
                        ),
                      ).length && <p className="muted">沒有符合條件的訂單。</p>}
                    </div>
                  </section>
                  {current && (
                    <section className="panel" key={current.id}>
                      <div className="section-title">
                        <h2>{current.id}</h2>
                        <button
                          className="link"
                          onClick={() => setSelected(null)}
                        >
                          收起
                        </button>
                      </div>
                      <p>
                        {current.item} · {current.currency} {current.amount} ·{" "}
                        {current.route}
                      </p>
                      <p className="muted">{current.note || "無備註"}</p>
                      {role === "Vendor" &&
                        ["草稿", "退回更正"].includes(current.status) && (
                          <div className="actions">
                            <button
                              className="secondary"
                              onClick={() => setEditing(current)}
                            >
                              編輯草稿
                            </button>
                            <button
                              className="primary"
                              onClick={() =>
                                act({ type: "submit", id: current.id })
                              }
                            >
                              提交 GSD 審核
                            </button>
                          </div>
                        )}
                      {role === "GSD" && current.status === "待 GSD 審核" && (
                        <Review order={current} act={act} />
                      )}
                      {role === "Accounting" &&
                        current.status === "待 Accounting 對帳" && (
                          <Reconcile order={current} act={act} />
                        )}
                      <h3>操作紀錄</h3>
                      <ul className="history">
                        {current.history.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
              {tab === "suppliers" && role === "Admin" && (
                <>
                  <SupplierForm act={act} />
                  <section className="panel">
                    <h2>供應商名冊</h2>
                    {store.suppliers.map((s) => (
                      <div className="supplier-row" key={s.id}>
                        <div>
                          <strong>{s.name}</strong>
                          <small>
                            {s.english} · {s.id}
                          </small>
                        </div>
                        <span className="badge">{s.status}</span>
                        <button
                          className="secondary"
                          onClick={() =>
                            act({
                              type: "supplierStatus",
                              id: s.id,
                              status: s.status === "啟用" ? "關閉" : "啟用",
                            })
                          }
                        >
                          {s.status === "待審核"
                            ? "審核通過並啟用"
                            : s.status === "啟用"
                              ? "關閉"
                              : "重新啟用"}
                        </button>
                      </div>
                    ))}
                  </section>
                </>
              )}
              {tab === "statements" && (
                <>
                  <section className="panel">
                    <h2>待結帳清單</h2>
                    <p className="muted">
                      只納入已對帳且指定帳期的訂單；尚未指定帳期的訂單不會自動納入。
                    </p>
                    {orders
                      .filter((o) => o.status === "已對帳")
                      .map((o) => (
                        <div className="supplier-row" key={o.id}>
                          <div>
                            <strong>{o.id}</strong>
                            <small>
                              {o.company} · {o.period} · {o.currency}{" "}
                              {o.approved}
                            </small>
                          </div>
                          {role === "Accounting" && (
                            <button
                              className="primary"
                              onClick={() =>
                                setConfirmation({
                                  company: o.company,
                                  period: o.period!,
                                })
                              }
                            >
                              結清此供應商月份
                            </button>
                          )}
                        </div>
                      ))}
                    {!orders.some((o) => o.status === "已對帳") && (
                      <p className="empty">
                        尚無待結帳資料。請先在訂單列表完成對帳。
                      </p>
                    )}
                  </section>
                  <section className="panel">
                    <h2>已結帳月結單</h2>
                    {statements.map((s) => (
                      <article className="statement" key={s.id}>
                        <div>
                          <span className="badge">已結帳</span>
                          <h3>
                            {s.period} / {s.company}
                          </h3>
                          <small>
                            {s.orderIds.length} 筆訂單 · {s.id}
                          </small>
                        </div>
                        <div>
                          {s.totals.map((t) => (
                            <strong key={t.currency}>
                              {t.currency} {t.amount}
                            </strong>
                          ))}
                          <button
                            className="secondary"
                            onClick={() => download(s)}
                          >
                            下載示範 CSV
                          </button>
                        </div>
                      </article>
                    ))}
                  </section>
                </>
              )}
            </main>
            <footer>
              STARLANE · 面試作品展示 <span>虛構品牌 / 非正式帳務系統</span>
            </footer>
          </div>
        </div>
      )}
      {!role && message && (
        <p className="landing-message" role="status">
          {message}
        </p>
      )}
    </>
  );
}
function OrderForm({
  order,
  onSave,
  onCancel,
}: {
  order?: Order;
  onSave: (values: OrderInput) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: order || {
      route: "高雄 → 新加坡",
      reference: "",
      item: "運費",
      amount: "",
      currency: "TWD",
      note: "",
    },
  });
  return (
    <form className="panel" onSubmit={handleSubmit(onSave)} noValidate>
      <h2>{order ? "編輯訂單" : "新增示範訂單"}</h2>
      <div className="form-grid">
        {(
          [
            ["route", "起運地 → 目的地"],
            ["reference", "提單號碼"],
            ["item", "費用科目"],
            ["amount", "申報金額"],
          ] as const
        ).map(([name, label]) => (
          <label key={name}>
            {label}
            <input
              {...register(name)}
              aria-invalid={!!errors[name]}
              aria-describedby={errors[name] ? `error-${name}` : undefined}
              inputMode={name === "amount" ? "decimal" : "text"}
            />
            {errors[name] && (
              <small className="error" id={`error-${name}`} role="alert">
                {errors[name]?.message}
              </small>
            )}
          </label>
        ))}
        <label>
          幣別
          <select {...register("currency")}>
            <option>TWD</option>
            <option>USD</option>
          </select>
        </label>
        <label>
          備註
          <input {...register("note")} maxLength={300} />
        </label>
      </div>
      <div className="actions">
        <button className="primary" type="submit">
          儲存草稿
        </button>
        <button className="secondary" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  );
}
function Review({ order, act }: { order: Order; act: (a: Action) => boolean }) {
  const [reason, setReason] = useState("");
  return (
    <div className="review">
      <label>
        審核意見（退回必填）
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
        />
      </label>
      <div className="actions">
        <button
          className="primary"
          onClick={() =>
            act({ type: "review", id: order.id, approve: true, reason })
          }
        >
          核准文件
        </button>
        <button
          className="secondary"
          onClick={() =>
            act({ type: "review", id: order.id, approve: false, reason })
          }
        >
          退回更正
        </button>
      </div>
    </div>
  );
}
function Reconcile({
  order,
  act,
}: {
  order: Order;
  act: (a: Action) => boolean;
}) {
  const [amount, setAmount] = useState(order.amount);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [reason, setReason] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act({ type: "reconcile", id: order.id, amount, period, reason });
      }}
    >
      <div className="form-grid">
        <label>
          核定金額（{order.currency}）
          <input
            value={amount}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          帳期
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            required
          />
        </label>
        <label>
          差異原因（有差異必填）
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
          />
        </label>
      </div>
      <button className="primary" type="submit">
        確認對帳並鎖定金額
      </button>
    </form>
  );
}
function SupplierForm({ act }: { act: (a: Action) => boolean }) {
  const [name, setName] = useState("");
  const [english, setEnglish] = useState("");
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (act({ type: "supplier", name, english })) {
          setName("");
          setEnglish("");
        }
      }}
    >
      <h2>新增示範供應商</h2>
      <p className="muted">
        公司代碼自動產生。此表單僅示範建檔與啟用，不建立真正帳號。
      </p>
      <div className="form-grid">
        <label>
          中文名稱
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
          />
        </label>
        <label>
          英文名稱
          <input
            value={english}
            onChange={(e) => setEnglish(e.target.value)}
            maxLength={80}
            required
          />
        </label>
      </div>
      <button className="primary">建立待審核資料</button>
    </form>
  );
}
