"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCompany,
  updateCompany,
  fetchBanners,
  deleteBanner,
  type CompanyInfo,
  type Banner,
} from "@/lib/api";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import styles from "./company.module.css";

export default function CompanyPage() {
  const qc = useQueryClient();

  const { data: company, isPending: loadingCompany } = useQuery({
    queryKey: ["company"],
    queryFn: fetchCompany,
  });

  const { data: banners = [], isPending: loadingBanners } = useQuery({
    queryKey: ["banners"],
    queryFn: fetchBanners,
  });

  const { data: announcements = [], isPending: loadingAnn } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.get<{ id: number; content: string; is_active: boolean; created_at?: string }[]>("/announcements"),
  });

  const [form, setForm] = useState<Partial<CompanyInfo>>({});

  useEffect(() => {
    if (company) setForm(company);
  }, [company]);

  const saveMut = useMutation({
    mutationFn: () => updateCompany(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company"] });
      toast.success("保存成功");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBannerMut = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banners"] });
      toast.success("已删除");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAnnMut = useMutation({
    mutationFn: (id: number) => api.delete<{ ok: boolean }>(`/announcements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("已删除");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Banner add form state
  const [bannerForm, setBannerForm] = useState({ title: "", subtitle: "", tag: "" });
  const addBannerMut = useMutation({
    mutationFn: () =>
      api.post<{ id: number }>("/banners", { ...bannerForm, sort_order: 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banners"] });
      setBannerForm({ title: "", subtitle: "", tag: "" });
      toast.success("已添加");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Announcement add form state
  const [annContent, setAnnContent] = useState("");
  const addAnnMut = useMutation({
    mutationFn: () => api.post<{ id: number }>("/announcements", { content: annContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setAnnContent("");
      toast.success("已添加");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const val = (field: keyof CompanyInfo) =>
    field in form ? (form[field] as string) : ((company?.[field] as string) ?? "");

  const set = (field: keyof CompanyInfo, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loadingCompany) {
    return (
      <div className={styles.page}>
        <div style={{ padding: 32, color: "var(--text-muted)" }}>加载中…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title="企业简介" description="管理公司信息、轮播图和公告" />
      <div className={styles.body}>

        {/* 基本信息 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>基本信息</span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>公司名称</label>
                <input
                  className={styles.input}
                  value={val("company_name")}
                  onChange={(e) => set("company_name", e.target.value)}
                  placeholder="箭牌卫浴"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>品牌口号</label>
                <input
                  className={styles.input}
                  value={val("slogan")}
                  onChange={(e) => set("slogan", e.target.value)}
                  placeholder="品质生活从卫浴开始"
                />
              </div>
              <div className={styles.formGroupFull}>
                <label className={styles.label}>公司简介</label>
                <textarea
                  className={styles.textarea}
                  value={val("description")}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="请输入公司简介…"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>联系方式</span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>电话</label>
                <input
                  className={styles.input}
                  value={val("phone")}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="400-xxx-xxxx"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>微信</label>
                <input
                  className={styles.input}
                  value={val("wechat")}
                  onChange={(e) => set("wechat", e.target.value)}
                  placeholder="微信号"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>邮箱</label>
                <input
                  className={styles.input}
                  value={val("email")}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>地址</label>
                <input
                  className={styles.input}
                  value={val("address")}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="公司地址"
                />
              </div>
            </div>
            <div className={styles.saveRow}>
              <Button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending ? "保存中…" : "保存信息"}
              </Button>
            </div>
          </div>
        </div>

        {/* 轮播图 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>轮播图管理</span>
          </div>
          <div className={styles.cardBody}>
            {loadingBanners ? (
              <div className={styles.emptyState}>加载中…</div>
            ) : banners.length === 0 ? (
              <div className={styles.emptyState}>暂无轮播图</div>
            ) : (
              banners.map((b: Banner) => (
                <div key={b.id} className={styles.listItem}>
                  <div className={styles.listItemInfo}>
                    <span className={styles.listItemTitle}>{b.title}</span>
                    {(b.subtitle || b.tag) && (
                      <span className={styles.listItemSub}>
                        {b.tag && `[${b.tag}] `}{b.subtitle}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    icon={<Trash2 size={13} />}
                    onClick={() => deleteBannerMut.mutate(b.id)}
                    disabled={deleteBannerMut.isPending}
                  >
                    删除
                  </Button>
                </div>
              ))
            )}
            <div className={styles.addForm}>
              <div className={styles.formGroup}>
                <label className={styles.label}>标题 *</label>
                <input
                  className={styles.input}
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="轮播图标题"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>副标题</label>
                <input
                  className={styles.input}
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm((p) => ({ ...p, subtitle: e.target.value }))}
                  placeholder="副标题"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>标签</label>
                <input
                  className={styles.input}
                  value={bannerForm.tag}
                  onChange={(e) => setBannerForm((p) => ({ ...p, tag: e.target.value }))}
                  placeholder="NEW / HOT"
                />
              </div>
              <Button
                onClick={() => bannerForm.title && addBannerMut.mutate()}
                disabled={addBannerMut.isPending || !bannerForm.title}
              >
                添加
              </Button>
            </div>
          </div>
        </div>

        {/* 公告 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>公告管理</span>
          </div>
          <div className={styles.cardBody}>
            {loadingAnn ? (
              <div className={styles.emptyState}>加载中…</div>
            ) : announcements.length === 0 ? (
              <div className={styles.emptyState}>暂无公告</div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className={styles.listItem}>
                  <span className={styles.listItemTitle}>{a.content}</span>
                  <Button
                    variant="secondary"
                    icon={<Trash2 size={13} />}
                    onClick={() => deleteAnnMut.mutate(a.id)}
                    disabled={deleteAnnMut.isPending}
                  >
                    删除
                  </Button>
                </div>
              ))
            )}
            <div className={styles.addFormFull}>
              <div className={styles.formGroup}>
                <label className={styles.label}>新公告内容 *</label>
                <input
                  className={styles.input}
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="输入公告内容…"
                />
              </div>
              <Button
                onClick={() => annContent && addAnnMut.mutate()}
                disabled={addAnnMut.isPending || !annContent}
              >
                添加
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
