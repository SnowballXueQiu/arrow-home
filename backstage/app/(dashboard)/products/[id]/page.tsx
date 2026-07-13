"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProduct, updateProduct } from "@/lib/api";
import type { Product } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { ProductForm } from "@/components/ProductForm";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import styles from "./edit.module.css";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const productId = Number(id);
  const qc = useQueryClient();
  const router = useRouter();

  const [dirty, setDirty] = useState(false);
  const [escModalOpen, setEscModalOpen] = useState(false);

  const { data: product, isPending } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct(productId),
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<Product>) => updateProduct(productId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("保存成功");
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

  if (isPending) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeletonLine}`} />
          ))}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>产品不存在</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={product.model || `产品 #${product.id}`}
        description={`ID: ${product.id}${product.category_name ? `  ·  ${product.category_name}` : ""}`}
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
        initial={product}
        onSave={async (data) => {
          await updateMut.mutateAsync(data);
        }}
        loading={updateMut.isPending}
        onDirtyChange={setDirty}
      />

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
