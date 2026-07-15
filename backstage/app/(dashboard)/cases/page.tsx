"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCases, deleteCase, type ProjectCase } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./cases.module.css";

export default function CasesPage() {
  const qc = useQueryClient();
  const router = useRouter();

  const { data: cases = [], isPending } = useQuery({
    queryKey: ["cases"],
    queryFn: fetchCases,
  });

  const deleteMut = useMutation({
    mutationFn: deleteCase,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      toast.success("已删除");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDelete = (c: ProjectCase) => {
    if (confirm(`确定要删除案例「${c.name}」吗？`)) {
      deleteMut.mutate(c.id);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="工程案例"
        description="管理展示的工程案例及配图"
        action={
          <Link href="/cases/new">
            <Button icon={<Plus size={14} />}>新建案例</Button>
          </Link>
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
                        onClick={() => router.push(`/cases/${c.id}`)}
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
    </div>
  );
}
