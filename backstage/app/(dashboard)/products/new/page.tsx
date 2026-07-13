"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "@/lib/api";
import type { Product } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { ProductForm } from "@/components/ProductForm";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./new.module.css";

export default function NewProductPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: (data: Partial<Product>) => createProduct(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("产品创建成功");
      router.push(`/products/${res.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="新建产品"
        description="填写产品基本信息、规格参数与变体"
        action={
          <Link href="/products">
            <Button variant="secondary" icon={<ArrowLeft size={14} />}>
              返回列表
            </Button>
          </Link>
        }
      />
      <ProductForm
        onSave={async (data) => {
          await createMut.mutateAsync(data);
        }}
        loading={createMut.isPending}
      />
    </div>
  );
}
