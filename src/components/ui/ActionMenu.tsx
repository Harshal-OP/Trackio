'use client';

import { useState } from 'react';

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export function ActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="material-symbols-outlined text-[18px]">more_horiz</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] ${item.danger ? 'text-rose-400' : 'text-[var(--foreground)]'
                }`}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
