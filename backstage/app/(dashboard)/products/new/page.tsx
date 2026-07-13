"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "@/lib/api";
import type { Product } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { ProductForm } from "@/components/ProductForm";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import styles from "./new.module.css";

export default function NewProductPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [lastSavedModel, setLastSavedModel] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [escModalOpen, setEscModalOpen] = useState(false);

  const createMut = useMutation({
    mutationFn: (data: Partial<Product>) => createProduct(data),
    onSuccess: (res, variables) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("产品创建成功");
      setLastSavedModel(variables.model ?? null);
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goBack = useCallback(() => router.push("/products"), [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dirty) {
        setEscModalOpen(true);
      } else {
        goBack();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [dirty, goBack]);

  function handleAddAnother() {
    setLastSavedModel(null);
    setFormKey((k) => k + 1);
    createMut.reset();
    setDirty(false);
  }

  const saved = createMut.isSuccess;

  return (
    <div className={styles.page}>
      <PageHeader
        title="新建产品"
        description="填写产品型号、规格参数与变体"
        action={
          <div className={styles.headerActions}>
            <Link href="/products">
              <Button variant="secondary" icon={<ArrowLeft size={14} />}>
                返回列表
              </Button>
            </Link>
            <kbd className={styles.kbdHint}>ESC</kbd>
          </div>
        }
      />
      <ProductForm
        key={formKey}
        onSave={async (data) => {
          await createMut.mutateAsync(data);
        }}
        loading={createMut.isPending}
        onDirtyChange={setDirty}
      />
      {saved && (
        <div className={styles.savedActions}>
          <span className={styles.savedNote}>
            已保存型号「{lastSavedModel}」
          </span>
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={handleAddAnother}
          >
            继续添加新产品
          </Button>
        </div>
      )}

      <Modal
        open={escModalOpen}
        onClose={() => setEscModalOpen(false)}
        title="有未保存的更改"
        width={400}
      >
        <p className={styles.modalText}>当前页面有未保存的更改，是否放弃并返回列表？</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setEscModalOpen(false)}>
            继续编辑
          </Button>
          <Button variant="danger" onClick={goBack}>
            放弃并返回
          </Button>
        </div>
      </Modal>
    </div>
  );
}
