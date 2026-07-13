"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchProducts } from "@/lib/api";
import { Package, Tags, TrendingUp, Layers } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import Link from "next/link";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { data: cats } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: () => fetchCategories(),
  });

  const { data: products } = useQuery({
    queryKey: ["products", { page: 1, page_size: 1 }],
    queryFn: () => fetchProducts({ page: 1, page_size: 1 }),
  });

  const { data: hotProducts } = useQuery({
    queryKey: ["products", "hot-count"],
    queryFn: () => fetchProducts({ page: 1, page_size: 100 }),
  });

  const hotCount = hotProducts?.items.filter((p) => p.is_hot).length ?? 0;
  const total = products?.total ?? 0;
  const catCount = cats?.length ?? 0;
  const leafCount = cats?.filter((c) => !cats.some((p) => p.parent_id === c.id)).length ?? 0;

  const stats = [
    {
      label: "产品总数",
      value: total,
      icon: Package,
      color: "accent",
      href: "/products",
    },
    {
      label: "品类数量",
      value: catCount,
      icon: Tags,
      color: "blue",
      href: "/categories",
    },
    {
      label: "子品类",
      value: leafCount,
      icon: Layers,
      color: "green",
      href: "/categories",
    },
    {
      label: "热门产品",
      value: hotCount,
      icon: TrendingUp,
      color: "orange",
      href: "/products?hot=1",
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.greeting}>数据概览</h1>
          <p className={styles.sub}>ARROW 箭牌卫浴 · 产品管理系统</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`${styles.statCard} ${styles[`color_${s.color}`]}`}>
            <div className={styles.statIcon}>
              <s.icon size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.statNum}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </Link>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>品类分布</span>
          <Link href="/categories" className={styles.more}>查看全部 →</Link>
        </div>
        <div className={styles.catGrid}>
          {(cats ?? [])
            .filter((c) => c.parent_id === null)
            .map((top) => {
              const children = (cats ?? []).filter(
                (c) => c.parent_id === top.id
              );
              const childIds = children.map((c) => c.id);
              // count all products belonging to top or its children
              return (
                <Link
                  key={top.id}
                  href={`/products?category_id=${top.id}`}
                  className={styles.catCard}
                >
                  <div className={styles.catCardTop}>
                    <div className={styles.catCardIcon}>
                      <CategoryIcon name={top.name} size={22} />
                    </div>
                    <div className={styles.catName}>{top.name}</div>
                  </div>
                  {children.length > 0 && (
                    <div className={styles.catSubs}>
                      {children.map((c) => (
                        <span key={c.id} className={styles.catTag}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}
