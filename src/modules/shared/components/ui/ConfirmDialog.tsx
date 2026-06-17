import { Button } from "./Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "Confirmer",
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel}>
    <ModalHeader title={title} onClose={onCancel} />
    <ModalBody>
    <p className="text-sm leading-relaxed text-gray-400">{message}</p>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={onCancel}>
    {cancelLabel}
    </Button>
    <Button variant={variant} onClick={onConfirm}>
    {confirmLabel}
    </Button>
    </ModalFooter>
    </Modal>
  );
}

export default ConfirmDialog;
