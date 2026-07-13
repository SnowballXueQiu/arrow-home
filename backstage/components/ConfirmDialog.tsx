"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";
import styles from "./ConfirmDialog.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  loading,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      {description && <p className={styles.desc}>{description}</p>}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          loading={loading}
        >
          确认删除
        </Button>
      </div>
    </Modal>
  );
}
