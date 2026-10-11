"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { api } from "@/services/api-client";
import { useDemo } from "@/context/demo-context";
import { brand } from "@/config/brand";
const schema = z.object({
  account: z.string().trim().min(1, "請輸入帳號"),
  password: z.string().min(1, "請輸入密碼"),
});
export function LoginScreen() {
  const router = useRouter();
  const { refresh } = useDemo();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { account: "", password: "" },
  });
  return (
    <main className="login-page">
      <section className="login-intro">
        <Image
          className="company-logo"
          src={brand.logo}
          alt={brand.logoAlt}
          width={140}
          height={140}
          unoptimized
        />
        <h1>{brand.portalName}</h1>
        <p className="text-muted">{brand.englishName}</p>
        <p className="text-muted mt-3">虛構品牌 · 面試作品展示</p>
      </section>
      <section className="login-form-area">
        <form
          className="login-form"
          noValidate
          onSubmit={handleSubmit(async ({ account, password }) => {
            setError("");
            try {
              const result = await api<{
                role: "ADMIN" | "SUPPLIER_USER" | "GSD" | "ACCOUNTING";
              }>("auth/login", { username: account, password });
              await refresh();
              router.push(
                result.role === "ADMIN"
                  ? "/admin/suppliers"
                  : result.role === "GSD"
                    ? "/admin/orders"
                    : result.role === "ACCOUNTING"
                      ? "/accounting"
                      : "/dashboard",
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : "登入失敗");
            }
          })}
        >
          <p className="eyebrow">WELCOME BACK</p>
          <h2>登入帳號</h2>
          <p className="text-muted">
            使用 Admin 預先建立的公司代碼登入，無需自行註冊。
          </p>
          <label htmlFor="account">帳號</label>
          <input
            id="account"
            autoComplete="username"
            placeholder="請輸入公司帳號"
            {...register("account")}
            aria-invalid={!!errors.account}
            aria-describedby={errors.account ? "account-error" : undefined}
          />
          {errors.account && (
            <p id="account-error" role="alert" className="field-error">
              {errors.account.message}
            </p>
          )}
          <label className="mt-5" htmlFor="password">
            密碼
          </label>
          <div className="password-field">
            <input
              id="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="請輸入密碼"
              {...register("password")}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              aria-label={visible ? "隱藏密碼" : "顯示密碼"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" role="alert" className="field-error">
              {errors.password.message}
            </p>
          )}
          <p className="text-muted my-5">
            如忘記帳號、密碼或使用人員異動，請聯絡本公司窗口處理。
          </p>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="button primary w-full"
          >
            登入
            <ArrowRight size={18} />
          </button>
          <div className="demo-credentials">
            <strong>示範帳密</strong>
            <p>預建供應商：DOL0001 ／ 管理者：ADMIN-DEMO</p>
            <p>文件審核：GSD-DEMO ／ 帳務：ACCOUNTING-DEMO</p>
            <p>
              初始示範密碼：Demo1234!（已調整的帳號請使用公司提供的現行密碼）
            </p>
          </div>
          <p className="login-footnote">
            僅限假資料體驗，請勿輸入真實密碼。
            <br />
            資料保存於本機資料庫，不寄送郵件。
          </p>
        </form>
      </section>
      <p className="login-phase">{brand.shortName} · VENDOR PORTAL DEMO</p>
    </main>
  );
}
