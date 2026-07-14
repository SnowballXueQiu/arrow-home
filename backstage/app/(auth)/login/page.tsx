"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "登录失败");
      }
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.noise} />
      <div className={styles.glow} />

      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>A</span>
          <div className={styles.logoText}>
            <span className={styles.logoEn}>ARROW</span>
            <span className={styles.logoCn}>箭牌卫浴管理系统</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>账号</label>
            <input
              className={styles.input}
              type="text"
              placeholder="请输入账号"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
              autoComplete="username"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>密码</label>
            <input
              className={styles.input}
              type="password"
              placeholder="请输入密码"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              "登 录"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
