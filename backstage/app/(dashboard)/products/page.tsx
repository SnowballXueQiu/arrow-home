"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProducts,
  fetchCategories,
  deleteProduct,
  updateProduct,
} from "@/lib/api";
import type { Product } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Star,
  StarOff,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { toast } from "sonner";
import styles from "./products.module.css";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsInner />
    </Suspense>
  );
}

function ProductsInner() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const categoryId = searchParams.get("category_id")
    ? Number(searchParams.get("category_id"))
    : undefined;

  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [searchInput, setSearchInput] = useState(keyword);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function pushParams(params: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === "") sp.delete(k);
      else sp.set(k, String(v));
    }
    sp.set("page", "1");
    router.push(`/products?${sp.toString()}`);
  }

  const { data, isPending } = useQuery({
    queryKey: ["products", { page, page_size: PAGE_SIZE, categoryId, keyword }],
    queryFn: () =>
      fetchProducts({
        page,
        page_size: PAGE_SIZE,
        category_id: categoryId,
        keyword: keyword || undefined,
      }),
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: fetchCategories,
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("产品已删除");
      setDeletingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleHotMut = useMutation({
    mutationFn: ({ id, is_hot }: { id: number; is_hot: boolean }) =>
      updateProduct(id, { is_hot }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const deletingItem = items.find((p) => p.id === deletingId);

  // Build category name map
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setKeyword(searchInput);
    pushParams({ keyword: searchInput });
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="产品管理"
        description={`共 ${total} 个产品`}
        action={
          <Link href="/products/new">
            <Button variant="primary" icon={<Plus size={15} />}>
              新建产品
            </Button>
          </Link>
        }
      />

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="搜索产品名称或型号…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button variant="secondary" type="submit" size="sm">
            搜索
          </Button>
        </form>

        <div className={styles.filters}>
          <Filter size={13} className={styles.filterIcon} />
          <select
            className={styles.select}
            value={categoryId ?? ""}
            onChange={(e) =>
              pushParams({
                category_id: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          >
            <option value="">全部品类</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent_id ? "  └ " : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} style={{ width: 60 }}>
                ID
              </th>
              <th className={styles.th}>产品名称</th>
              <th className={styles.th} style={{ width: 130 }}>
                型号
              </th>
              <th className={styles.th} style={{ width: 120 }}>
                品类
              </th>
              <th className={styles.th} style={{ width: 70 }}>
                热门
              </th>
              <th className={styles.th} style={{ width: 110 }}>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {isPending
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className={styles.tr}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className={styles.td}>
                        <div className={`skeleton ${styles.skeletonCell}`} />
                      </td>
                    ))}
                  </tr>
                ))
              : items.map((product) => (
                  <tr key={product.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.idBadge}>{product.id}</span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.productName}>
                        <span className={styles.name}>{product.name}</span>
                        {product.description && (
                          <span className={styles.desc} title={product.description}>
                            {product.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.model}>{product.model || "—"}</span>
                    </td>
                    <td className={styles.td}>
                      {product.category_id ? (
                        <span className={styles.catTag}>
                          <CategoryIcon
                            name={catMap[product.category_id] ?? ""}
                            size={12}
                          />
                          {catMap[product.category_id] ?? "—"}
                        </span>
                      ) : (
                        <span className={styles.none}>未分类</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <button
                        className={`${styles.hotBtn} ${product.is_hot ? styles.hot : ""}`}
                        onClick={() =>
                          toggleHotMut.mutate({
                            id: product.id,
                            is_hot: !product.is_hot,
                          })
                        }
                        title={product.is_hot ? "取消热门" : "设为热门"}
                      >
                        {product.is_hot ? (
                          <Star size={14} fill="currentColor" />
                        ) : (
                          <StarOff size={14} />
                        )}
                      </button>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <Link href={`/products/${product.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit2 size={13} />}
                          >
                            编辑
                          </Button>
                        </Link>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => setDeletingId(product.id)}
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginInfo}>
            第 {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} 条，共 {total} 条
          </span>
          <div className={styles.paginBtns}>
            <button
              className={styles.paginBtn}
              disabled={page <= 1}
              onClick={() => pushParams({ page: page - 1 })}
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              let p = i + 1;
              if (totalPages > 7) {
                if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  className={`${styles.paginBtn} ${p === page ? styles.paginActive : ""}`}
                  onClick={() => pushParams({ page: p })}
                >
                  {p}
                </button>
              );
            })}
            <button
              className={styles.paginBtn}
              disabled={page >= totalPages}
              onClick={() => pushParams({ page: page + 1 })}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMut.mutate(deletingId)}
        title="删除产品"
        description={`确认删除产品「${deletingItem?.name ?? ""}」？此操作不可撤销。`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
