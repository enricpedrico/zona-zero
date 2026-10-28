import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface ModalProps {
  title: string;
  eyebrow?: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  narrow?: boolean;
}

export function Modal({ title, eyebrow, closeLabel, onClose, children, narrow }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={narrow ? "modal-panel modal-panel--narrow" : "modal-panel"} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id="modal-title">{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={closeLabel}>
            <X />
          </button>
        </header>
        <div className="modal-content">{children}</div>
      </section>
    </div>
  );
}
