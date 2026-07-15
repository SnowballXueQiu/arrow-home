"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Package,
  Tags,
  FileSpreadsheet,
  LogOut,
  Building2,
  HardHat,
} from "lucide-react";
import { toast } from "sonner";
import styles from "./Sidebar.module.css";

const NAV = [
  { href: "/", icon: LayoutGrid, label: "概览", desc: "Dashboard" },
  { href: "/categories", icon: Tags, label: "品类管理", desc: "Categories" },
  { href: "/products", icon: Package, label: "产品管理", desc: "Products" },
  { href: "/import", icon: FileSpreadsheet, label: "批量导入", desc: "Import" },
  { href: "/company", icon: Building2, label: "企业简介", desc: "Company" },
  { href: "/cases", icon: HardHat, label: "工程案例", desc: "Cases" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("已退出登录");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>A</span>
        <div className={styles.brandText}>
          <span className={styles.brandEn}>ARROW</span>
          <span className={styles.brandCn}>管理后台</span>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>
          {NAV.map(({ href, icon: Icon, label, desc }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navItem} ${active ? styles.active : ""}`}
              >
                <span className={styles.navIconWrap}>
                  <Icon size={15} strokeWidth={1.7} />
                </span>
                <span className={styles.navLabel}>{label}</span>
                {active && <span className={styles.activeDot} />}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className={styles.bottom}>
        <div className={styles.divider} />
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={14} strokeWidth={1.7} />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}
