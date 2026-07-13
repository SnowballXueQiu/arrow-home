"use client";

import { useRef, useState } from "react";
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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, ImagePlus, GripVertical } from "lucide-react";
import styles from "./ImageUploader.module.css";

export interface ImageItem {
  _id: string;
  url: string; // base64 data URL or http URL
}

interface Props {
  value: ImageItem[];
  onChange: (items: ImageItem[]) => void;
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function compressImage(file: File, maxPx = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxPx || h > maxPx) {
          if (w >= h) { h = Math.round((h * maxPx) / w); w = maxPx; }
          else { w = Math.round((w * maxPx) / h); h = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function SortableImage({
  item,
  index,
  onDelete,
}: {
  item: ImageItem;
  index: number;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item._id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={styles.card}
    >
      <div className={styles.thumbWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.url} alt="" className={styles.thumb} />
        <div className={styles.overlay}>
          <button
            type="button"
            className={styles.delBtn}
            onClick={() => onDelete(item._id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
        <span className={styles.idx}>{index + 1}</span>
      </div>
      <div className={styles.handle} {...attributes} {...listeners} title="拖拽排序">
        <GripVertical size={13} />
      </div>
    </div>
  );
}

export function ImageUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function processFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    setProcessing(true);
    try {
      const items = await Promise.all(
        arr.map(async (f) => ({ _id: uid(), url: await compressImage(f) }))
      );
      onChange([...value, ...items]);
    } finally {
      setProcessing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oi = value.findIndex((i) => i._id === active.id);
      const ni = value.findIndex((i) => i._id === over.id);
      onChange(arrayMove(value, oi, ni));
    }
  }

  return (
    <div className={styles.root}>
      {/* Upload zone */}
      <div
        className={`${styles.zone} ${dragOver ? styles.over : ""} ${processing ? styles.busy : ""}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !processing && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
        {processing ? (
          <span className={styles.spinner} />
        ) : (
          <ImagePlus size={20} strokeWidth={1.5} className={styles.zoneIcon} />
        )}
        <span className={styles.zoneText}>
          {processing ? "压缩处理中…" : "拖拽图片至此，或点击上传"}
        </span>
        <span className={styles.zoneSub}>JPG · PNG · WEBP，自动压缩至 1200px / 85%</span>
      </div>

      {/* Sortable grid */}
      {value.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={value.map((i) => i._id)}
            strategy={rectSortingStrategy}
          >
            <div className={styles.grid}>
              {value.map((item, idx) => (
                <SortableImage
                  key={item._id}
                  item={item}
                  index={idx}
                  onDelete={(id) => onChange(value.filter((i) => i._id !== id))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
