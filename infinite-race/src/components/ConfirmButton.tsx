"use client";
import { useState, useRef } from "react";

export default function ConfirmButton({
  onConfirm,
  className,
  children,
  confirmLabel = "Segur?",
}: {
  onConfirm: () => void;
  className?: string;
  children: React.ReactNode;
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timeout = useRef<any>(null);

  return (
    <button
      disabled={busy}
      className={`${className ?? ""} ${armed ? "!bg-red-600 !text-white" : ""} disabled:opacity-50`}
      onClick={async () => {
        if (!armed) {
          setArmed(true);
          timeout.current = setTimeout(() => setArmed(false), 3000);
          return;
        }
        clearTimeout(timeout.current);
        setArmed(false);
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
