"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "@/lib/api";
import type { Product } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { ProductForm } from "@/components/ProductForm";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import styles from "./new.module.css";

export default function NewProductPage() {
  const qc = useQueryClient();
  const [formKey, setFormKey] = useState(0);
  const [lastSavedModel, setLastSavedModel] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (data: Partial<Product>) => createProduct(data),
    onSuccess: (res, variables) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("产品创建成功");
      setLastSavedModel(variables.model ?? null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleAddAnother() {
    setLastSavedModel(null);
    setFormKey((k) => k + 1);
    createMut.reset();
  }

  const saved = createMut.isSuccess;

  return (
    <div className={styles.page}>
      <PageHeader
        title="新建产品"
        description="填写产品型号、规格参数与变体"
        action={
          <Link href="/products">
            <Button variant="secondary" icon={<ArrowLeft size={14} />}>
              返回列表
            </Button>
          </Link>
        }
      />
      <ProductForm
        key={formKey}
        onSave={async (data) => {
          await createMut.mutateAsync(data);
        }}
        loading={createMut.isPending}
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
    </div>
  );
}
