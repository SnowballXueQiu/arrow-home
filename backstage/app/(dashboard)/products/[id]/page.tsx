"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProduct, updateProduct } from "@/lib/api";
import type { Product } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { ProductForm } from "@/components/ProductForm";
import { toast } from "sonner";
import Link from "next/link";
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
        title={product.name}
        description={`型号：${product.model || "—"}  ·  ID: ${product.id}`}
        action={
          <Link href="/products">
            <Button variant="secondary" icon={<ArrowLeft size={14} />}>
              返回列表
            </Button>
          </Link>
        }
      />
      <ProductForm
        initial={product}
        onSave={async (data) => {
          await updateMut.mutateAsync(data);
        }}
        loading={updateMut.isPending}
      />
    </div>
  );
}
