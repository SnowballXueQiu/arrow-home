"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCategoryTree, createCategory, deleteCategory, fetchCategoryProducts } from "@/lib/api";
import type { Category } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Trash2, Package } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import Link from "next/link";
import { toast } from "sonner";
import styles from "./categories.module.css";

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingCat, setViewingCat] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", parent_id: "" });

  const { data: tree = [], isPending } = useQuery({
    queryKey: ["categories", "tree"],
    queryFn: fetchCategoryTree,
  });

  const { data: flatList = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: () =>
      fetch("/api/backend/categories?flat=true").then((r) => r.json()) as Promise<(Category & { product_count: number })[]>,
  });

  const { data: catProducts = [], isPending: catProductsPending } = useQuery({
    queryKey: ["category-products", viewingCat?.id],
    queryFn: () => fetchCategoryProducts(viewingCat!.id),
    enabled: !!viewingCat,
  });

  const productCountMap = Object.fromEntries(flatList.map((c) => [c.id, c.product_count ?? 0]));

  const createMut = useMutation({
    mutationFn: (d: { name: string; parent_id: number | null; sort_order: number }) =>
      createCategory(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("品类创建成功");
      setAddOpen(false);
      setForm({ name: "", parent_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("已删除");
      setDeletingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMut.mutate({
      name: form.name.trim(),
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      sort_order: 0,
    });
  }

  // Flatten tree for display with depth and human-readable index (#1, #1.1, #2 …)
  function flattenTree(
    nodes: Category[],
    depth = 0,
    parentIdx = ""
  ): { cat: Category; depth: number; idx: string }[] {
    const result: { cat: Category; depth: number; idx: string }[] = [];
    nodes.forEach((node, i) => {
      const idx = parentIdx ? `${parentIdx}.${i + 1}` : `${i + 1}`;
      result.push({ cat: node, depth, idx });
      if (node.children?.length) {
        result.push(...flattenTree(node.children, depth + 1, idx));
      }
    });
    return result;
  }

  const flat = flattenTree(tree);
  const deletingItem = flat.find((f) => f.cat.id === deletingId);

  return (
    <div className={styles.page}>
      <PageHeader
        title="品类管理"
        description="管理产品分类层级结构"
        action={
          <Button
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => setAddOpen(true)}
          >
            新建品类
          </Button>
        }
      />

      <div className={styles.content}>
        {isPending ? (
          <div className={styles.skeletons}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.skeletonRow}`} />
            ))}
          </div>
        ) : (
          <div className={styles.tree}>
            {flat.map(({ cat, depth, idx }) => (
              <div
                key={cat.id}
                className={`${styles.row} ${depth === 0 ? styles.topLevel : styles.child}`}
                style={{ paddingLeft: depth === 0 ? 16 : 16 + depth * 24 }}
              >
                <div className={styles.rowLeft}>
                  <span className={depth === 0 ? styles.folderIcon : styles.folderIconChild}>
                    <CategoryIcon name={cat.name} size={depth === 0 ? 16 : 14} />
                  </span>
                  <span className={styles.catName}>{cat.name}</span>
                  {depth === 0 && cat.children && cat.children.length > 0 && (
                    <span className={styles.childCount}>
                      {cat.children.length} 个子品类
                    </span>
                  )}
                  {(productCountMap[cat.id] ?? 0) > 0 && (
                    <button
                      className={styles.productCountBtn}
                      onClick={() => setViewingCat({ id: cat.id, name: cat.name })}
                      title="查看商品"
                    >
                      <Package size={11} />
                      {productCountMap[cat.id]} 个商品
                    </button>
                  )}
                  {(productCountMap[cat.id] ?? 0) === 0 && (
                    <span className={styles.productCount}>0 个商品</span>
                  )}
                </div>
                <div className={styles.rowRight}>
                  <span className={styles.catId}>#{idx}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setDeletingId(cat.id)}
                    title="删除"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="新建品类"
        width={440}
      >
        <form onSubmit={handleCreate} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>品类名称</label>
            <input
              className={styles.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="例：智能坐便器"
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>父级品类（留空为顶级）</label>
            <select
              className={styles.input}
              value={form.parent_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, parent_id: e.target.value }))
              }
            >
              <option value="">— 顶级品类 —</option>
              {flat.map(({ cat, depth, idx }) => (
                <option key={cat.id} value={cat.id}>
                  {"　".repeat(depth)}#{idx} {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formActions}>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setAddOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={createMut.isPending}
            >
              创建
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Category Products Modal */}
      <Modal
        open={!!viewingCat}
        onClose={() => setViewingCat(null)}
        title={viewingCat ? `${viewingCat.name} · 商品列表` : ""}
        width={500}
      >
        <div className={styles.productList}>
          {catProductsPending ? (
            <div className={styles.productListLoading}>加载中…</div>
          ) : catProducts.length === 0 ? (
            <div className={styles.productListEmpty}>暂无商品</div>
          ) : (
            catProducts.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className={styles.productItem}
                onClick={() => setViewingCat(null)}
              >
                <span className={styles.productItemId}>#{p.id}</span>
                <span className={styles.productItemModel}>{p.model}</span>
                {p.is_hot ? <span className={styles.productItemHot}>热</span> : null}
              </Link>
            ))
          )}
        </div>
        <div className={styles.productListFooter}>
          <Button variant="secondary" onClick={() => setViewingCat(null)}>
            关闭
          </Button>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMut.mutate(deletingId)}
        title="删除品类"
        description={`确认删除品类「${deletingItem?.cat.name ?? ""}」？该品类下的产品将变为未分类，子品类也会被一并处理。`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
