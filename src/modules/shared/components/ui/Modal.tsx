// ui/Modal.tsx — Modal moderne avec overlay flou (100% Tailwind pur)
import { useEffect, type MouseEvent, type ReactNode } from "react";

/* ─── Modal ─── */
interface ModalProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  onOpenChange,
  title,
  children,
  width = 480,
  footer,
}: ModalProps) {
  const handleClose = onClose || (onOpenChange ? () => onOpenChange(false) : undefined);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm animate-fade-in"
    onClick={handleClose}
    >
    <div
    className="w-full max-h-[90vh] overflow-auto rounded-2xl border border-white/[0.06] bg-[#121218] shadow-[0_16px_48px_rgba(0,0,0,0.7)] animate-scale-in"
    style={{ maxWidth: width }}
    onClick={(e: MouseEvent) => e.stopPropagation()}
    >
    {title && (
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
      <h3 className="text-base font-bold tracking-tight text-gray-100">{title}</h3>
      {handleClose && (
        <button
        type="button"
        onClick={handleClose}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-gray-500 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400"
        >
        ×
        </button>
      )}
      </div>
    )}
    <div className="p-5">{children}</div>
    {footer && (
      <div className="flex justify-end gap-2 rounded-b-2xl border-t border-white/[0.06] bg-gray-950 px-5 py-3">
      {footer}
      </div>
    )}
    </div>
    </div>
  );
}

export default Modal;

/* ─── Sous-composants ─── */
interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
    <h3 className="text-base font-bold tracking-tight text-gray-100">{title}</h3>
    {onClose && (
      <button
      type="button"
      onClick={onClose}
      className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-gray-500 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400"
      >
      ×
      </button>
    )}
    </div>
  );
}

interface ModalTitleProps {
  children: ReactNode;
}

export function ModalTitle({ children }: ModalTitleProps) {
  return (
    <h3 className="text-base font-bold tracking-tight text-gray-100">
    {children}
    </h3>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="p-5">{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2 rounded-b-2xl border-t border-white/[0.06] bg-gray-950 px-5 py-3">
    {children}
    </div>
  );
}
