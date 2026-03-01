'use client';

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${maxWidth} rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl animate-slide-up`}
        onClick={(event) => event.stopPropagation()}
      >
        {title ? (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
