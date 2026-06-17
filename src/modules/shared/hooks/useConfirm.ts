// src/modules/shared/hooks/useConfirm.ts
"use client";

import { useCallback, useState } from "react";

/* ─── Types ─── */
interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface UseConfirmReturn {
  state: ConfirmState | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
  isOpen: boolean;
}

/* ─── Hook ─── */
export function useConfirm(): UseConfirmReturn {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (state) {
      state.resolve(true);
      setState(null);
    }
  }, [state]);

  const handleCancel = useCallback(() => {
    if (state) {
      state.resolve(false);
      setState(null);
    }
  }, [state]);

  return {
    state,
    confirm,
    handleConfirm,
    handleCancel,
    isOpen: !!state,
  };
}
