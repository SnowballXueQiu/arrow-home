"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCategories, createProduct } from "@/lib/api";
import type { Category } from "@/lib/api";
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
} from "lucide-react";
import { toast } from "sonner";
import styles from "./import.module.css";

// The target schema for import
const TARGET_FIELDS: ReadonlyArray<{
  key: FieldKey;
  label: string;
  required?: true;
}> = [
  { key: "name", label: "产品名称", required: true },
  { key: "model", label: "型号" },
  { key: "description", label: "描述" },
  { key: "category_name", label: "品类名称" },
  { key: "is_hot", label: "热门(1/0)" },
];

type FieldKey = "name" | "model" | "description" | "category_name" | "is_hot";

interface ParsedRow {
  [key: string]: string;
}

type ImportStatus = "idle" | "preview" | "importing" | "done";

// Auto-match heuristic
function autoMatch(col: string, fields: typeof TARGET_FIELDS): FieldKey | "" {
  const c = col.toLowerCase().replace(/[_\s-]/g, "");
  if (c.includes("name") || c.includes("名称") || c.includes("产品")) return "name";
  if (c.includes("model") || c.includes("型号") || c.includes("sku")) return "model";
  if (c.includes("desc") || c.includes("描述") || c.includes("说明")) return "description";
  if (c.includes("cat") || c.includes("品类") || c.includes("分类") || c.includes("category")) return "category_name";
  if (c.includes("hot") || c.includes("热门")) return "is_hot";
  return "";
}

export default function ImportPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<ImportStatus>("idle");
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "">>({});
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const { data: cats = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: fetchCategories,
  });

  const catByName = Object.fromEntries(
    cats.map((c: Category) => [c.name, c.id])
  );

  async function parseFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    setFileName(file.name);

    if (ext === "csv") {
      const Papa = (await import("papaparse")).default;
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const cols = (result.meta.fields ?? []) as string[];
          const data = result.data as ParsedRow[];
          applyParsed(cols, data);
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
        if (data.length === 0) {
          toast.error("表格为空");
          return;
        }
        const cols = Object.keys(data[0]);
        applyParsed(cols, data);
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("仅支持 CSV、XLSX、XLS 格式");
    }
  }

  function applyParsed(cols: string[], data: ParsedRow[]) {
    setColumns(cols);
    setRows(data.slice(0, 500)); // cap preview
    const m: Record<string, FieldKey | ""> = {};
    for (const col of cols) {
      m[col] = autoMatch(col, TARGET_FIELDS);
    }
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
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Build reverse mapping: fieldKey → column name
    const fieldToCol: Partial<Record<FieldKey, string>> = {};
    for (const [col, field] of Object.entries(mapping)) {
      if (field) fieldToCol[field] = col;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = fieldToCol.name ? row[fieldToCol.name]?.trim() : "";
      if (!name) {
        failed++;
        errors.push(`第 ${i + 2} 行：缺少产品名称，已跳过`);
        continue;
      }

      const catName = fieldToCol.category_name
        ? row[fieldToCol.category_name]?.trim()
        : "";
      const catId = catName ? catByName[catName] ?? null : null;

      // Collect unmapped columns as attributes
      const mappedCols = new Set(Object.values(fieldToCol));
      const attributes = [];
      for (const col of columns) {
        if (!mappedCols.has(col) && row[col]?.trim()) {
          attributes.push({ key: col, value: row[col].trim(), sort_order: attributes.length });
        }
      }

      try {
        await createProduct({
          name,
          model: fieldToCol.model ? row[fieldToCol.model]?.trim() ?? "" : "",
          description: fieldToCol.description
            ? row[fieldToCol.description]?.trim() ?? ""
            : "",
          category_id: catId,
          is_hot:
            fieldToCol.is_hot
              ? row[fieldToCol.is_hot]?.trim() === "1"
              : false,
          attributes,
        });
        success++;
      } catch (e: unknown) {
        failed++;
        errors.push(
          `第 ${i + 2} 行 [${name}]：${e instanceof Error ? e.message : "未知错误"}`
        );
      }
    }

    qc.invalidateQueries({ queryKey: ["products"] });
    setResults({ success, failed, errors });
    setStatus("done");
    if (success > 0) toast.success(`成功导入 ${success} 个产品`);
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
        title="批量导入"
        description="支持 CSV、Excel 格式，最大 500 行"
      />

      <div className={styles.content}>
        {status === "idle" && (
          <div
            className={styles.dropzone}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div className={styles.dropIcon}>
              <Upload size={32} strokeWidth={1.5} />
            </div>
            <div className={styles.dropTitle}>拖拽文件至此，或点击上传</div>
            <div className={styles.dropSub}>支持 CSV · XLSX · XLS</div>
            <div className={styles.dropFormats}>
              <span className={styles.formatTag}>
                <FileSpreadsheet size={12} /> .csv
              </span>
              <span className={styles.formatTag}>
                <FileSpreadsheet size={12} /> .xlsx
              </span>
              <span className={styles.formatTag}>
                <FileSpreadsheet size={12} /> .xls
              </span>
            </div>
          </div>
        )}

        {(status === "preview" || status === "importing") && (
          <div className={styles.previewWrap}>
            {/* File info */}
            <div className={styles.fileInfo}>
              <FileSpreadsheet size={16} className={styles.fileIcon} />
              <span className={styles.fileName}>{fileName}</span>
              <span className={styles.rowCount}>{rows.length} 行数据</span>
              <button className={styles.resetLink} onClick={reset}>
                重新上传
              </button>
            </div>

            {/* Column Mapping */}
            <div className={styles.mappingSection}>
              <h3 className={styles.mappingTitle}>字段映射</h3>
              <p className={styles.mappingDesc}>
                将文件中的列映射到系统字段。未映射的列将作为产品属性参数导入。
              </p>
              <div className={styles.mappingGrid}>
                {columns.map((col) => (
                  <div key={col} className={styles.mappingRow}>
                    <span className={styles.colName}>{col}</span>
                    <ArrowRight
                      size={14}
                      className={styles.arrowIcon}
                    />
                    <div className={styles.selectWrap}>
                      <select
                        className={styles.mapSelect}
                        value={mapping[col] ?? ""}
                        onChange={(e) =>
                          setMapping((m) => ({
                            ...m,
                            [col]: e.target.value as FieldKey | "",
                          }))
                        }
                      >
                        <option value="">— 作为属性导入 —</option>
                        {TARGET_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                            {f.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={12}
                        className={styles.selectChevron}
                      />
                    </div>
                    <span className={styles.previewVal}>
                      {rows[0]?.[col] ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Preview */}
            <div className={styles.previewSection}>
              <h3 className={styles.mappingTitle}>
                数据预览（前 10 行）
              </h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className={styles.th}>
                          {col}
                          {mapping[col] && (
                            <span className={styles.thMap}>
                              → {mapping[col]}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className={styles.tr}>
                        {columns.map((col) => (
                          <td key={col} className={styles.td}>
                            {row[col] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.importActions}>
              <Button variant="secondary" onClick={reset}>
                取消
              </Button>
              <Button
                variant="primary"
                loading={status === "importing"}
                onClick={handleImport}
                icon={<Upload size={14} />}
              >
                {status === "importing"
                  ? "导入中…"
                  : `确认导入 ${rows.length} 条`}
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
                <div className={styles.errTitle}>
                  <AlertCircle size={13} /> 错误详情
                </div>
                {results.errors.map((err, i) => (
                  <div key={i} className={styles.errItem}>
                    {err}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.resultActions}>
              <Button variant="primary" onClick={reset}>
                继续导入
              </Button>
            </div>
          </div>
        )}

        {/* Template Download Section */}
        <div className={styles.templateSection}>
          <div className={styles.templateTitle}>导入模板说明</div>
          <div className={styles.templateDesc}>
            文件第一行应为列标题。系统字段如下表，其余列将自动作为产品参数（属性 KV）导入。
          </div>
          <div className={styles.templateTable}>
            <div className={styles.templateHeader}>
              <span>列名</span>
              <span>对应字段</span>
              <span>说明</span>
            </div>
            {TARGET_FIELDS.map((f) => (
              <div key={f.key} className={styles.templateRow}>
                <span className={styles.templateCol}>{f.label}</span>
                <span className={styles.templateField}>{f.key}</span>
                <span className={styles.templateNote}>
                  {f.required ? "必填" : "可选"}
                </span>
              </div>
            ))}
            <div className={styles.templateRow}>
              <span className={styles.templateCol}>其他任意列</span>
              <span className={styles.templateField}>—</span>
              <span className={styles.templateNote}>
                自动作为属性参数
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
