"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "danger" | "warning" | "info";

export type ToastState = {
  visible: boolean;
  type: ToastType;
  message: string;
};

interface ToastProps {
  type?: ToastType;
  children: React.ReactNode;
  visible: boolean;
  onClose: () => void;
}

const typeStyles: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function Toast({
  type = "info",
  children,
  visible,
  onClose,
}: ToastProps) {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);

    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 200);
  };

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      handleClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible && !closing) return null;

  return (
    <div
      role="alert"
      className={`
        fixed left-1/2 top-6 z-50
        flex w-[calc(100%-2rem)] max-w-xl
        -translate-x-1/2 items-center gap-4
        rounded-xl border px-4 py-3 shadow-lg
        ${typeStyles[type]}
        ${closing ? "opacity-0" : "opacity-100"}
        transition-all duration-200
      `}
    >
      <div className="flex-1">
        <strong className="block capitalize">{type}</strong>
        <div className="text-sm text-gray-600">{children}</div>
      </div>

      <button
        type="button"
        onClick={handleClose}
        className="text-gray-400 hover:text-gray-700"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}