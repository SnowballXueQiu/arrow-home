"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCategoryTree, createCategory, deleteCategory } from "@/lib/api";
import type { Category } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { toast } from "sonner";
import styles from "./categories.module.css";

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", parent_id: "" });

  const { data: tree = [], isPending } = useQuery({
    queryKey: ["categories", "tree"],
    queryFn: fetchCategoryTree,
  });

  const { data: flatList = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: () =>
      fetch("/backend/categories?flat=true").then((r) => r.json()) as Promise<Category[]>,
  });

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

  // Flatten tree for display with depth
  function flattenTree(
    nodes: Category[],
    depth = 0
  ): { cat: Category; depth: number }[] {
    const result: { cat: Category; depth: number }[] = [];
    for (const node of nodes) {
      result.push({ cat: node, depth });
      if (node.children?.length) {
        result.push(...flattenTree(node.children, depth + 1));
      }
    }
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
            {flat.map(({ cat, depth }) => (
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
                </div>
                <div className={styles.rowRight}>
                  <span className={styles.catId}>#{cat.id}</span>
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
              {flatList
                .filter((c) => c.parent_id === null)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
