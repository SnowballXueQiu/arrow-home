"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCases,
  createCase,
  updateCase,
  deleteCase,
  type ProjectCase,
} from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { ImageUploader, type ImageItem, uid } from "@/components/ImageUploader";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import styles from "./cases.module.css";

type CaseFormState = {
  name: string;
  is_active: boolean;
  sort_order: number;
  images: ImageItem[];
  descriptions: string[];
};

const emptyForm = (): CaseFormState => ({
  name: "",
  is_active: true,
  sort_order: 0,
  images: [],
  descriptions: [""],
});

function CaseModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial: CaseFormState;
  onClose: () => void;
  onSave: (data: CaseFormState) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CaseFormState>(initial);

  const setImages = (imgs: ImageItem[]) => setForm((p) => ({ ...p, images: imgs }));
  const setDescs = (descs: string[]) => setForm((p) => ({ ...p, descriptions: descs }));

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{initial.name ? "编辑案例" : "新建案例"}</span>
          <Button variant="secondary" icon={<X size={14} />} onClick={onClose}>关闭</Button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>案例名称 *</label>
            <input
              className={styles.input}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="请输入案例名称"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>排序权重</label>
            <input
              className={styles.input}
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
            />
          </div>
          <div className={styles.checkRow}>
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            <label htmlFor="is_active" className={styles.checkLabel}>启用展示</label>
          </div>

          {/* Images */}
          <div className={styles.formGroup}>
            <label className={styles.label}>图片</label>
            <ImageUploader value={form.images} onChange={setImages} />
          </div>

          {/* Descriptions */}
          <div className={styles.listSection}>
            <div className={styles.listSectionHeader}>
              <span className={styles.listSectionTitle}>文字描述</span>
              <Button
                variant="secondary"
                icon={<Plus size={12} />}
                onClick={() => setDescs([...form.descriptions, ""])}
              >
                添加描述
              </Button>
            </div>
            {form.descriptions.map((content, i) => (
              <div key={i} className={styles.listRow}>
                <textarea
                  className={styles.listRowTextarea}
                  value={content}
                  onChange={(e) => {
                    const descs = [...form.descriptions];
                    descs[i] = e.target.value;
                    setDescs(descs);
                  }}
                  placeholder="描述段落…"
                />
                {form.descriptions.length > 1 && (
                  <Button
                    variant="secondary"
                    icon={<Trash2 size={12} />}
                    onClick={() => setDescs(form.descriptions.filter((_, j) => j !== i))}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button
            onClick={() => form.name.trim() && onSave(form)}
            disabled={saving || !form.name.trim()}
          >
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CasesPage() {
  const qc = useQueryClient();
  const [modalState, setModalState] = useState<{ open: boolean; editing: ProjectCase | null }>({
    open: false,
    editing: null,
  });

  const { data: cases = [], isPending } = useQuery({
    queryKey: ["cases"],
    queryFn: fetchCases,
  });

  const createMut = useMutation({
    mutationFn: (data: CaseFormState) =>
      createCase({
        name: data.name,
        sort_order: data.sort_order,
        is_active: data.is_active,
        images: data.images.map((i) => i.url).filter(Boolean),
        descriptions: data.descriptions.filter((d) => d.trim()),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      setModalState({ open: false, editing: null });
      toast.success("案例已创建");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CaseFormState }) =>
      updateCase(id, {
        name: data.name,
        sort_order: data.sort_order,
        is_active: data.is_active,
        images: data.images.map((i) => i.url).filter(Boolean),
        descriptions: data.descriptions.filter((d) => d.trim()),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      setModalState({ open: false, editing: null });
      toast.success("已保存");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCase,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      toast.success("已删除");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = (data: CaseFormState) => {
    if (modalState.editing) {
      updateMut.mutate({ id: modalState.editing.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const openEdit = (c: ProjectCase) => {
    setModalState({
      open: true,
      editing: c,
    });
  };

  const openCreate = () => {
    setModalState({ open: true, editing: null });
  };

  const handleDelete = (c: ProjectCase) => {
    if (confirm(`确定要删除案例「${c.name}」吗？`)) {
      deleteMut.mutate(c.id);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className={styles.page}>
      <PageHeader
        title="工程案例"
        description="管理展示的工程案例及配图"
        action={
          <Button icon={<Plus size={14} />} onClick={openCreate}>
            新建案例
          </Button>
        }
      />
      <div className={styles.body}>
        {isPending ? (
          <div className={styles.emptyState}>加载中…</div>
        ) : cases.length === 0 ? (
          <div className={styles.emptyState}>暂无案例，点击右上角新建</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>案例名称</th>
                <th>图片数量</th>
                <th>描述段落</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c: ProjectCase) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.images.length} 张</td>
                  <td>{c.descriptions.length} 段</td>
                  <td>
                    <span className={`${styles.badge} ${c.is_active ? styles.badgeOn : styles.badgeOff}`}>
                      {c.is_active ? "展示中" : "已隐藏"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Button
                        variant="secondary"
                        icon={<Pencil size={13} />}
                        onClick={() => openEdit(c)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<Trash2 size={13} />}
                        onClick={() => handleDelete(c)}
                        disabled={deleteMut.isPending}
                      >
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalState.open && (
        <CaseModal
          initial={
            modalState.editing
              ? {
                  name: modalState.editing.name,
                  is_active: modalState.editing.is_active,
                  sort_order: modalState.editing.sort_order,
                  images: modalState.editing.images.map((i) => ({ _id: uid(), url: i.url })),
                  descriptions: modalState.editing.descriptions.map((d) => d.content).concat([""])  ,
                }
              : emptyForm()
          }
          onClose={() => setModalState({ open: false, editing: null })}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
