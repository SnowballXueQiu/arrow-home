"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCase } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ImageUploader, type ImageItem } from "@/components/ImageUploader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import styles from "./new.module.css";

type FormState = {
  name: string;
  is_active: boolean;
  sort_order: number;
  images: ImageItem[];
  descriptions: string[];
};

function emptyForm(): FormState {
  return { name: "", is_active: true, sort_order: 0, images: [], descriptions: [""] };
}

export default function NewCasePage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [dirty, setDirty] = useState(false);
  const [escModalOpen, setEscModalOpen] = useState(false);

  const goBack = useCallback(() => router.push("/cases"), [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dirty) setEscModalOpen(true);
      else goBack();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [dirty, goBack]);

  function markDirty() {
    if (!dirty) setDirty(true);
  }

  const createMut = useMutation({
    mutationFn: () =>
      createCase({
        name: form.name.trim(),
        sort_order: form.sort_order,
        is_active: form.is_active,
        images: form.images.map((i) => i.url).filter(Boolean),
        descriptions: form.descriptions.filter((d) => d.trim()),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      toast.success("案例已创建");
      setDirty(false);
      router.push("/cases");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDescs = (descs: string[]) => { setForm((p) => ({ ...p, descriptions: descs })); markDirty(); };

  return (
    <div className={styles.page}>
      <PageHeader
        title="新建案例"
        description="填写案例信息与配图"
        action={
          <div className={styles.headerActions}>
            <Link href="/cases">
              <Button variant="secondary" icon={<ArrowLeft size={14} />}>返回列表</Button>
            </Link>
            <kbd className={styles.kbdHint}>ESC</kbd>
          </div>
        }
      />

      <div className={styles.body}>
        {/* 基本信息 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}><span className={styles.cardTitle}>基本信息</span></div>
          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label className={styles.label}>案例名称 *</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); markDirty(); }}
                placeholder="请输入案例名称"
                autoFocus
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>排序权重</label>
              <input
                className={styles.input}
                type="number"
                value={form.sort_order}
                onChange={(e) => { setForm((p) => ({ ...p, sort_order: Number(e.target.value) })); markDirty(); }}
              />
            </div>
            <div className={styles.checkRow}>
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => { setForm((p) => ({ ...p, is_active: e.target.checked })); markDirty(); }}
              />
              <label htmlFor="is_active" className={styles.checkLabel}>启用展示</label>
            </div>
          </div>
        </div>

        {/* 图片 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}><span className={styles.cardTitle}>图片</span></div>
          <div className={styles.cardBody}>
            <ImageUploader
              value={form.images}
              onChange={(imgs) => { setForm((p) => ({ ...p, images: imgs })); markDirty(); }}
            />
          </div>
        </div>

        {/* 文字描述 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>文字描述</span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.listSection}>
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
              <div>
                <Button
                  variant="secondary"
                  icon={<Plus size={12} />}
                  onClick={() => setDescs([...form.descriptions, ""])}
                >
                  添加描述段落
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Link href="/cases">
          <Button variant="secondary">取消</Button>
        </Link>
        <Button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending || !form.name.trim()}
        >
          {createMut.isPending ? "保存中…" : "保存案例"}
        </Button>
      </div>

      <Modal open={escModalOpen} onClose={() => setEscModalOpen(false)} title="有未保存的更改" width={400}>
        <p className={styles.modalText}>当前页面有未保存的更改，是否放弃并返回列表？</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setEscModalOpen(false)}>继续编辑</Button>
          <Button variant="danger" onClick={goBack}>放弃并返回</Button>
        </div>
      </Modal>
    </div>
  );
}
