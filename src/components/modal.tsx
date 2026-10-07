"use client";

import { useEffect, useRef } from "react";

export function Modal({ children, titleId, onClose, busy = false }: {
  children: React.ReactNode; titleId: string; onClose: () => void; busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return <dialog ref={dialog} className="dialog-card" aria-labelledby={titleId} onCancel={event => {
    event.preventDefault(); if (!busy) onClose();
  }}>{children}</dialog>;
}
