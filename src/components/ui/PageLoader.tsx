'use client';

import { motion } from 'framer-motion';

interface PageLoaderProps {
  title?: string;
  subtitle?: string;
  rows?: number;
}

export function PageLoader({
  title = 'Loading',
  subtitle = 'Preparing your workspace...',
  rows = 4,
}: PageLoaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--card-shadow)]">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        animate={{ x: ['0%', '420%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative z-10 space-y-5">
        <div className="flex items-center gap-3">
          <motion.div
            className="size-11 rounded-xl border border-primary/35 bg-primary/10"
            animate={{ scale: [1, 1.07, 1], rotate: [0, 4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="space-y-2">
            <p className="text-base font-semibold">{title}</p>
            <p className="text-sm text-[var(--muted)]">{subtitle}</p>
          </div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <motion.div
              key={index}
              className="h-3 rounded-full bg-[var(--surface-muted)]"
              initial={{ opacity: 0.4, scaleX: 0.97 }}
              animate={{ opacity: [0.4, 0.9, 0.4], scaleX: [0.97, 1, 0.97] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.08,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
