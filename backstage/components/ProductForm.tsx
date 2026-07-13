"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/api";
import type { Product, ProductAttribute, ProductVariant } from "@/lib/api";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "./Button";
import { ImageUploader, uid as imgUid } from "./ImageUploader";
import type { ImageItem } from "./ImageUploader";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
} from "lucide-react";
import styles from "./ProductForm.module.css";

interface AttrRow extends ProductAttribute {
  _id: string;
}

interface VariantRow extends ProductVariant {
  _id: string;
}

interface Props {
  initial?: Partial<Product>;
  onSave: (data: Partial<Product>) => Promise<void>;
  loading?: boolean;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function toAttrRows(attrs?: ProductAttribute[]): AttrRow[] {
  return (attrs ?? []).map((a) => ({ ...a, _id: uid() }));
}

function toVariantRows(variants?: ProductVariant[]): VariantRow[] {
  return (variants ?? []).map((v) => ({ ...v, _id: uid() }));
}

function SortableAttrRow({
  row,
  onChange,
  onDelete,
}: {
  row: AttrRow;
  onChange: (id: string, field: "key" | "value", val: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: row._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={styles.attrRow}>
      <span
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        title="拖拽排序"
      >
        <GripVertical size={14} />
      </span>
      <input
        className={styles.attrKey}
        placeholder="属性名"
        value={row.key}
        onChange={(e) => onChange(row._id, "key", e.target.value)}
      />
      <input
        className={styles.attrVal}
        placeholder="属性值"
        value={row.value}
        onChange={(e) => onChange(row._id, "value", e.target.value)}
      />
      <button
        type="button"
        className={styles.rowDeleteBtn}
        onClick={() => onDelete(row._id)}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function SortableVariantRow({
  row,
  onChange,
  onDelete,
}: {
  row: VariantRow;
  onChange: (
    id: string,
    field: "variant_type" | "variant_value",
    val: string
  ) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: row._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={styles.attrRow}>
      <span className={styles.dragHandle} {...attributes} {...listeners}>
        <GripVertical size={14} />
      </span>
      <input
        className={styles.attrKey}
        placeholder="变体类型 (如: 颜色)"
        value={row.variant_type}
        onChange={(e) => onChange(row._id, "variant_type", e.target.value)}
      />
      <input
        className={styles.attrVal}
        placeholder="变体值 (如: 象牙白)"
        value={row.variant_value}
        onChange={(e) => onChange(row._id, "variant_value", e.target.value)}
      />
      <button
        type="button"
        className={styles.rowDeleteBtn}
        onClick={() => onDelete(row._id)}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export function ProductForm({ initial, onSave, loading }: Props) {
  const [model, setModel] = useState(initial?.model ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    initial?.category_id ? String(initial.category_id) : ""
  );
  const [isHot, setIsHot] = useState(initial?.is_hot ?? false);
  const [price, setPrice] = useState<string>(
    initial?.price != null ? String(initial.price) : ""
  );
  const [discountPrice, setDiscountPrice] = useState<string>(
    initial?.discount_price != null ? String(initial.discount_price) : ""
  );
  const [showPrice, setShowPrice] = useState(initial?.show_price ?? false);
  const [attrs, setAttrs] = useState<AttrRow[]>(() =>
    toAttrRows(initial?.attributes)
  );
  const [variants, setVariants] = useState<VariantRow[]>(() =>
    toVariantRows(initial?.variants)
  );
  const [images, setImages] = useState<ImageItem[]>(
    () => initial?.images?.map((i) => ({ _id: imgUid(), url: i.url })) ?? []
  );

  const { data: cats = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: fetchCategories,
  });

  const sensors = useSensors(useSensor(PointerSensor));

  // --- Attrs ---
  function addAttr() {
    setAttrs((prev) => [
      ...prev,
      { _id: uid(), key: "", value: "", sort_order: prev.length },
    ]);
  }

  function updateAttr(id: string, field: "key" | "value", val: string) {
    setAttrs((prev) =>
      prev.map((a) => (a._id === id ? { ...a, [field]: val } : a))
    );
  }

  function deleteAttr(id: string) {
    setAttrs((prev) => prev.filter((a) => a._id !== id));
  }

  function handleAttrDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setAttrs((prev) => {
        const oldIdx = prev.findIndex((a) => a._id === active.id);
        const newIdx = prev.findIndex((a) => a._id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  // --- Variants ---
  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        _id: uid(),
        variant_type: "",
        variant_value: "",
        sort_order: prev.length,
      },
    ]);
  }

  function updateVariant(
    id: string,
    field: "variant_type" | "variant_value",
    val: string
  ) {
    setVariants((prev) =>
      prev.map((v) => (v._id === id ? { ...v, [field]: val } : v))
    );
  }

  function deleteVariant(id: string) {
    setVariants((prev) => prev.filter((v) => v._id !== id));
  }

  function handleVariantDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setVariants((prev) => {
        const oldIdx = prev.findIndex((v) => v._id === active.id);
        const newIdx = prev.findIndex((v) => v._id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      model: model.trim(),
      description: description.trim(),
      category_id: categoryId ? Number(categoryId) : null,
      is_hot: isHot,
      price: price !== "" ? parseFloat(price) : null,
      discount_price: discountPrice !== "" ? parseFloat(discountPrice) : null,
      show_price: showPrice,
      attributes: attrs
        .filter((a) => a.key.trim())
        .map((a, i) => ({ key: a.key.trim(), value: a.value.trim(), sort_order: i })),
      variants: variants
        .filter((v) => v.variant_type.trim())
        .map((v, i) => ({
          variant_type: v.variant_type.trim(),
          variant_value: v.variant_value.trim(),
          sort_order: i,
        })),
      images: images.map((img, i) => ({ url: img.url, sort_order: i })) as any,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Basic Info */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>基本信息</h3>
        <div className={styles.field}>
          <label className={styles.label}>
            型号 <span className={styles.required}>*</span>
          </label>
          <input
            className={styles.input}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="例：AKB1312"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>产品描述</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简短描述产品特性…"
            rows={3}
          />
        </div>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>所属品类</label>
            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">— 未分类 —</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? "  └ " : ""}
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className={styles.selectChevron} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>热门推荐</label>
            <button
              type="button"
              className={`${styles.toggleBtn} ${isHot ? styles.toggleOn : ""}`}
              onClick={() => setIsHot((v) => !v)}
            >
              <span className={styles.toggleDot} />
              <span>{isHot ? "是" : "否"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>价格设置</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>原价 (元)</label>
            <div className={styles.inputPrefix}>
              <span className={styles.prefix}>¥</span>
              <input
                className={`${styles.input} ${styles.inputWithPrefix}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="未设置"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>折扣价 (元)</label>
            <div className={styles.inputPrefix}>
              <span className={styles.prefix}>¥</span>
              <input
                className={`${styles.input} ${styles.inputWithPrefix}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="不填则无折扣"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>价格展示</label>
          <button
            type="button"
            className={`${styles.toggleBtn} ${showPrice ? styles.toggleOn : ""}`}
            onClick={() => setShowPrice((v) => !v)}
          >
            <span className={styles.toggleDot} />
            <span>{showPrice ? "展示价格" : "不展示价格"}</span>
          </button>
          {showPrice && price !== "" && (
            <div className={styles.pricePreview}>
              {discountPrice !== "" ? (
                <>
                  <span className={styles.originalPrice}>¥{parseFloat(price).toFixed(2)}</span>
                  <span className={styles.discountPrice}>¥{parseFloat(discountPrice).toFixed(2)}</span>
                </>
              ) : (
                <span className={styles.currentPrice}>¥{parseFloat(price).toFixed(2)}</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Attributes */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>规格参数</h3>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            icon={<Plus size={13} />}
            onClick={addAttr}
          >
            添加参数
          </Button>
        </div>
        {attrs.length === 0 ? (
          <div className={styles.empty}>暂无参数，点击「添加参数」开始</div>
        ) : (
          <div className={styles.attrHeader}>
            <span style={{ flex: 1 }}>属性名</span>
            <span style={{ flex: 1 }}>属性值</span>
            <span style={{ width: 28 }} />
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleAttrDragEnd}
        >
          <SortableContext
            items={attrs.map((a) => a._id)}
            strategy={verticalListSortingStrategy}
          >
            {attrs.map((row) => (
              <SortableAttrRow
                key={row._id}
                row={row}
                onChange={updateAttr}
                onDelete={deleteAttr}
              />
            ))}
          </SortableContext>
        </DndContext>
      </section>

      {/* Variants */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>产品变体</h3>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            icon={<Plus size={13} />}
            onClick={addVariant}
          >
            添加变体
          </Button>
        </div>
        {variants.length === 0 ? (
          <div className={styles.empty}>暂无变体，例如颜色/规格选项</div>
        ) : (
          <div className={styles.attrHeader}>
            <span style={{ flex: 1 }}>变体类型</span>
            <span style={{ flex: 1 }}>变体值</span>
            <span style={{ width: 28 }} />
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleVariantDragEnd}
        >
          <SortableContext
            items={variants.map((v) => v._id)}
            strategy={verticalListSortingStrategy}
          >
            {variants.map((row) => (
              <SortableVariantRow
                key={row._id}
                row={row}
                onChange={updateVariant}
                onDelete={deleteVariant}
              />
            ))}
          </SortableContext>
        </DndContext>
      </section>

      {/* Images */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>产品图片</h3>
        <ImageUploader value={images} onChange={setImages} />
      </section>

      {/* Submit */}
      <div className={styles.submitRow}>
        <Button variant="primary" type="submit" loading={loading} size="md">
          保存产品
        </Button>
      </div>
    </form>
  );
}
