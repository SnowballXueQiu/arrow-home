"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCategories, createProduct, createCategory, bulkImportProducts, exportAllData } from "@/lib/api";
import type { Category, ExportData } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ArrowRight,
  Download,
  DatabaseBackup,
} from "lucide-react";
import { toast } from "sonner";
import styles from "./import.module.css";

// The target schema for CSV/XLSX import
const TARGET_FIELDS: ReadonlyArray<{
  key: FieldKey;
  label: string;
  required?: true;
}> = [
  { key: "model", label: "型号", required: true },
  { key: "name", label: "产品名称" },
  { key: "description", label: "描述" },
  { key: "category_name", label: "品类名称" },
  { key: "is_hot", label: "热门(1/0)" },
];

type FieldKey = "name" | "model" | "description" | "category_name" | "is_hot";

interface ParsedRow {
  [key: string]: string;
}

type ImportStatus = "idle" | "preview" | "importing" | "done";
type BackupStatus = "idle" | "preview" | "importing" | "done";

function autoMatch(col: string): FieldKey | "" {
  const c = col.toLowerCase().replace(/[_\s-]/g, "");
  if (c.includes("model") || c.includes("型号") || c.includes("sku")) return "model";
  if (c.includes("name") || c.includes("名称") || c.includes("产品")) return "name";
  if (c.includes("desc") || c.includes("描述") || c.includes("说明")) return "description";
  if (c.includes("cat") || c.includes("品类") || c.includes("分类") || c.includes("category")) return "category_name";
  if (c.includes("hot") || c.includes("热门")) return "is_hot";
  return "";
}

export default function ImportPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // CSV/XLSX import state
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "">>({});
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  // Full backup import state
  const [backupStatus, setBackupStatus] = useState<BackupStatus>("idle");
  const [backupData, setBackupData] = useState<ExportData | null>(null);
  const [backupProgress, setBackupProgress] = useState({ current: 0, total: 0, step: "" });
  const [backupResult, setBackupResult] = useState<{ cats: number; products: number } | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  const { data: cats = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: fetchCategories,
  });

  const catByName = Object.fromEntries(cats.map((c: Category) => [c.name, c.id]));

  // --- Export ---
  async function handleExport() {
    setExporting(true);
    setExportProgress({ current: 0, total: 0 });
    try {
      const data = await exportAllData((current, total) => {
        setExportProgress({ current, total });
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arrow-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`已导出 ${data.categories.length} 个品类、${data.products.length} 个产品`);
    } catch (e) {
      toast.error("导出失败：" + (e instanceof Error ? e.message : "未知错误"));
    } finally {
      setExporting(false);
    }
  }

  // --- Full backup import ---
  async function handleBackupFile(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;
      if (data.version !== 1 || !Array.isArray(data.categories) || !Array.isArray(data.products)) {
        toast.error("文件格式不正确，请上传 arrow-export-*.json 备份文件");
        return;
      }
      setBackupData(data);
      setBackupStatus("preview");
    } catch {
      toast.error("JSON 解析失败，文件可能已损坏");
    }
  }

  async function handleBackupImport() {
    if (!backupData) return;
    setBackupStatus("importing");

    let catsImported = 0;
    let productsImported = 0;

    try {
      // 1. Import categories — top-level first, then children
      const sorted = [...backupData.categories].sort((a, b) => {
        if (!a.parent_id && b.parent_id) return -1;
        if (a.parent_id && !b.parent_id) return 1;
        return a.sort_order - b.sort_order;
      });

      // old id → new id mapping
      const catIdMap: Record<number, number> = {};
      setBackupProgress({ current: 0, total: sorted.length, step: "导入品类" });

      for (let i = 0; i < sorted.length; i++) {
        const c = sorted[i];
        setBackupProgress({ current: i + 1, total: sorted.length, step: "导入品类" });
        // check if exists by name + parent
        const newParentId = c.parent_id != null ? (catIdMap[c.parent_id] ?? null) : null;
        const existing = cats.find(
          (ex) => ex.name === c.name && ex.parent_id === newParentId
        );
        if (existing) {
          catIdMap[c.id] = existing.id;
        } else {
          const res = await createCategory({ name: c.name, parent_id: newParentId, sort_order: c.sort_order });
          catIdMap[c.id] = res.id;
          catsImported++;
        }
      }

      // 2. Import products via bulk endpoint (skips duplicates by model)
      setBackupProgress({ current: 0, total: backupData.products.length, step: "导入产品" });
      const productPayload = backupData.products.map((p) => ({
        model: p.model,
        name: p.name || "",
        description: p.description || "",
        category_id: p.category_id != null ? (catIdMap[p.category_id] ?? null) : null,
        is_hot: p.is_hot,
        sort_order: p.sort_order,
        price: p.price ?? undefined,
        discount_price: p.discount_price ?? undefined,
        show_price: p.show_price,
        attributes: p.attributes ?? [],
        variants: p.variants ?? [],
        images: p.images ?? [],
      }));
      setBackupProgress({ current: productPayload.length, total: productPayload.length, step: "导入产品" });
      const bulkResult = await bulkImportProducts(productPayload);
      productsImported = bulkResult.imported;

      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      const skippedMsg = bulkResult.skipped > 0 ? `，跳过重复 ${bulkResult.skipped} 个` : "";
      setBackupResult({ cats: catsImported, products: productsImported });
      setBackupStatus("done");
      toast.success(`备份恢复完成：${catsImported} 品类，${productsImported} 产品${skippedMsg}`);
    } catch (e) {
      toast.error("导入失败：" + (e instanceof Error ? e.message : "未知错误"));
      setBackupStatus("preview");
    }
  }

  function resetBackup() {
    setBackupStatus("idle");
    setBackupData(null);
    setBackupResult(null);
    setBackupProgress({ current: 0, total: 0, step: "" });
    if (fileRef.current) fileRef.current.value = "";
  }

  // --- CSV/XLSX parse ---
  async function parseFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "json") {
      await handleBackupFile(file);
      return;
    }
    setFileName(file.name);

    if (ext === "csv") {
      const Papa = (await import("papaparse")).default;
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          applyParsed((result.meta.fields ?? []) as string[], result.data as ParsedRow[]);
        },
        error: (e) => toast.error("CSV 解析失败：" + e.message),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = (e) => {
        const buf = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: "" });
        if (!data.length) { toast.error("表格为空"); return; }
        applyParsed(Object.keys(data[0]), data);
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("仅支持 CSV、XLSX、XLS、JSON 格式");
    }
  }

  function applyParsed(cols: string[], data: ParsedRow[]) {
    setColumns(cols);
    setRows(data.slice(0, 500));
    const m: Record<string, FieldKey | ""> = {};
    for (const col of cols) m[col] = autoMatch(col);
    setMapping(m);
    setStatus("preview");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  async function handleImport() {
    setStatus("importing");
    const fieldToCol: Partial<Record<FieldKey, string>> = {};
    for (const [col, field] of Object.entries(mapping)) {
      if (field) fieldToCol[field] = col;
    }

    const payload = [];
    const rowErrors: string[] = [];
    const mappedCols = new Set(Object.values(fieldToCol));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const model = fieldToCol.model ? row[fieldToCol.model]?.trim() : "";
      if (!model) {
        rowErrors.push(`第 ${i + 2} 行：缺少型号，已跳过`);
        continue;
      }
      const catName = fieldToCol.category_name ? row[fieldToCol.category_name]?.trim() : "";
      const catId = catName ? catByName[catName] ?? null : null;
      const attributes = [];
      for (const col of columns) {
        if (!mappedCols.has(col) && row[col]?.trim()) {
          attributes.push({ key: col, value: row[col].trim(), sort_order: attributes.length });
        }
      }
      payload.push({
        model,
        name: fieldToCol.name ? row[fieldToCol.name]?.trim() ?? "" : "",
        description: fieldToCol.description ? row[fieldToCol.description]?.trim() ?? "" : "",
        category_id: catId,
        is_hot: fieldToCol.is_hot ? row[fieldToCol.is_hot]?.trim() === "1" : false,
        attributes,
      });
    }

    try {
      const result = await bulkImportProducts(payload);
      qc.invalidateQueries({ queryKey: ["products"] });
      const allErrors = [...rowErrors, ...result.errors];
      setResults({ success: result.imported, failed: rowErrors.length + result.errors.length, errors: allErrors });
      setStatus("done");
      const skippedMsg = result.skipped > 0 ? `，跳过重复 ${result.skipped} 个` : "";
      if (result.imported > 0) toast.success(`成功导入 ${result.imported} 个产品${skippedMsg}`);
      else toast.info(`无新产品导入${skippedMsg}`);
    } catch (e: unknown) {
      setResults({ success: 0, failed: rows.length, errors: [e instanceof Error ? e.message : "未知错误"] });
      setStatus("done");
      toast.error("导入失败");
    }
  }

  function reset() {
    setStatus("idle");
    setFileName("");
    setColumns([]);
    setRows([]);
    setMapping({});
    setResults(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="数据管理"
        description="批量导入产品，或导出 / 恢复完整数据备份"
        action={
          <Button
            variant="secondary"
            icon={<Download size={14} />}
            loading={exporting}
            onClick={handleExport}
          >
            {exporting
              ? exportProgress.total > 0
                ? `导出中 ${exportProgress.current}/${exportProgress.total}…`
                : "导出中…"
              : "导出全部数据"}
          </Button>
        }
      />

      <div className={styles.content}>
        {/* --- Full Backup Restore Section --- */}
        {backupStatus === "idle" && status === "idle" && (
          <div className={styles.backupCard}>
            <div className={styles.backupIcon}><DatabaseBackup size={22} /></div>
            <div className={styles.backupInfo}>
              <div className={styles.backupTitle}>完整数据恢复</div>
              <div className={styles.backupDesc}>上传 <code>arrow-export-*.json</code> 备份文件，自动恢复所有品类和产品数据（跳过已存在的品类）</div>
            </div>
          </div>
        )}

        {backupStatus === "preview" && backupData && (
          <div className={styles.backupPreview}>
            <div className={styles.backupPreviewHeader}>
              <DatabaseBackup size={16} />
              <span>备份文件预览</span>
              <span className={styles.backupMeta}>导出于 {new Date(backupData.exported_at).toLocaleString("zh-CN")}</span>
            </div>
            <div className={styles.backupStats}>
              <div className={styles.backupStat}>
                <span className={styles.backupStatNum}>{backupData.categories.length}</span>
                <span className={styles.backupStatLabel}>个品类</span>
              </div>
              <div className={styles.backupStat}>
                <span className={styles.backupStatNum}>{backupData.products.length}</span>
                <span className={styles.backupStatLabel}>个产品</span>
              </div>
            </div>
            <div className={styles.importActions}>
              <Button variant="secondary" onClick={resetBackup}>取消</Button>
              <Button variant="primary" icon={<DatabaseBackup size={14} />} onClick={handleBackupImport}>
                开始恢复数据
              </Button>
            </div>
          </div>
        )}

        {backupStatus === "importing" && (
          <div className={styles.backupImporting}>
            <div className={styles.backupProgressLabel}>
              {backupProgress.step}… {backupProgress.current}/{backupProgress.total}
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: backupProgress.total > 0 ? `${(backupProgress.current / backupProgress.total) * 100}%` : "0%" }}
              />
            </div>
          </div>
        )}

        {backupStatus === "done" && backupResult && (
          <div className={styles.resultWrap}>
            <div className={styles.resultStats}>
              <div className={`${styles.resultStat} ${styles.success}`}>
                <Check size={20} />
                <span className={styles.resultNum}>{backupResult.cats}</span>
                <span className={styles.resultLabel}>品类已导入</span>
              </div>
              <div className={`${styles.resultStat} ${styles.success}`}>
                <Check size={20} />
                <span className={styles.resultNum}>{backupResult.products}</span>
                <span className={styles.resultLabel}>产品已导入</span>
              </div>
            </div>
            <div className={styles.resultActions}>
              <Button variant="primary" onClick={resetBackup}>完成</Button>
            </div>
          </div>
        )}

        {/* --- CSV/XLSX Import Section --- */}
        {backupStatus === "idle" && status === "idle" && (
          <div
            className={styles.dropzone}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div className={styles.dropIcon}><Upload size={32} strokeWidth={1.5} /></div>
            <div className={styles.dropTitle}>拖拽文件至此，或点击上传</div>
            <div className={styles.dropSub}>CSV / XLSX / XLS 产品导入　·　JSON 完整备份恢复</div>
            <div className={styles.dropFormats}>
              {[".csv", ".xlsx", ".xls", ".json"].map((f) => (
                <span key={f} className={styles.formatTag}>
                  <FileSpreadsheet size={12} /> {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {(status === "preview" || status === "importing") && (
          <div className={styles.previewWrap}>
            <div className={styles.fileInfo}>
              <FileSpreadsheet size={16} className={styles.fileIcon} />
              <span className={styles.fileName}>{fileName}</span>
              <span className={styles.rowCount}>{rows.length} 行数据</span>
              <button className={styles.resetLink} onClick={reset}>重新上传</button>
            </div>

            <div className={styles.mappingSection}>
              <h3 className={styles.mappingTitle}>字段映射</h3>
              <p className={styles.mappingDesc}>将文件中的列映射到系统字段。未映射的列将作为产品属性参数导入。</p>
              <div className={styles.mappingGrid}>
                {columns.map((col) => (
                  <div key={col} className={styles.mappingRow}>
                    <span className={styles.colName}>{col}</span>
                    <ArrowRight size={14} className={styles.arrowIcon} />
                    <div className={styles.selectWrap}>
                      <select
                        className={styles.mapSelect}
                        value={mapping[col] ?? ""}
                        onChange={(e) => setMapping((m) => ({ ...m, [col]: e.target.value as FieldKey | "" }))}
                      >
                        <option value="">— 作为属性导入 —</option>
                        {TARGET_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className={styles.selectChevron} />
                    </div>
                    <span className={styles.previewVal}>{rows[0]?.[col] ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.previewSection}>
              <h3 className={styles.mappingTitle}>数据预览（前 10 行）</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className={styles.th}>
                          {col}
                          {mapping[col] && <span className={styles.thMap}>→ {mapping[col]}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className={styles.tr}>
                        {columns.map((col) => (
                          <td key={col} className={styles.td}>{row[col] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.importActions}>
              <Button variant="secondary" onClick={reset}>取消</Button>
              <Button variant="primary" loading={status === "importing"} onClick={handleImport} icon={<Upload size={14} />}>
                {status === "importing" ? "导入中…" : `确认导入 ${rows.length} 条`}
              </Button>
            </div>
          </div>
        )}

        {status === "done" && results && (
          <div className={styles.resultWrap}>
            <div className={styles.resultStats}>
              <div className={`${styles.resultStat} ${styles.success}`}>
                <Check size={20} />
                <span className={styles.resultNum}>{results.success}</span>
                <span className={styles.resultLabel}>成功导入</span>
              </div>
              <div className={`${styles.resultStat} ${results.failed > 0 ? styles.failed : styles.ok}`}>
                <X size={20} />
                <span className={styles.resultNum}>{results.failed}</span>
                <span className={styles.resultLabel}>导入失败</span>
              </div>
            </div>
            {results.errors.length > 0 && (
              <div className={styles.errList}>
                <div className={styles.errTitle}><AlertCircle size={13} /> 错误详情</div>
                {results.errors.map((err, i) => <div key={i} className={styles.errItem}>{err}</div>)}
              </div>
            )}
            <div className={styles.resultActions}>
              <Button variant="primary" onClick={reset}>继续导入</Button>
            </div>
          </div>
        )}

        {/* Template info */}
        {backupStatus === "idle" && (
          <div className={styles.templateSection}>
            <div className={styles.templateTitle}>CSV / XLSX 导入模板说明</div>
            <div className={styles.templateDesc}>文件第一行应为列标题。系统字段如下表，其余列将自动作为产品参数（属性 KV）导入。</div>
            <div className={styles.templateTable}>
              <div className={styles.templateHeader}>
                <span>列名</span><span>对应字段</span><span>说明</span>
              </div>
              {TARGET_FIELDS.map((f) => (
                <div key={f.key} className={styles.templateRow}>
                  <span className={styles.templateCol}>{f.label}</span>
                  <span className={styles.templateField}>{f.key}</span>
                  <span className={styles.templateNote}>{f.required ? "必填" : "可选"}</span>
                </div>
              ))}
              <div className={styles.templateRow}>
                <span className={styles.templateCol}>其他任意列</span>
                <span className={styles.templateField}>—</span>
                <span className={styles.templateNote}>自动作为属性参数</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
