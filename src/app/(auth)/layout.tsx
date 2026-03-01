import AuthGraphPanel from '@/components/auth/AuthGraphPanel';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <div className="flex flex-1">
        {/* Left — form panel */}
        <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24 max-w-2xl">
          {children}
        </div>

        {/* Right — animated graph panel */}
        <div className="hidden lg:block flex-1 p-4">
          <AuthGraphPanel />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--background)]">
        <div className="px-6 sm:px-12 lg:px-16 xl:px-24 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">
            © {currentYear} Trakio. Built by{' '}
            <span className="text-[var(--foreground)] font-medium">Harshal Mahajan</span>
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs text-[var(--muted)] hover:text-primary transition-colors">
              Terms of Service
            </a>
            <span className="text-[var(--border)]">·</span>
            <a href="#" className="text-xs text-[var(--muted)] hover:text-primary transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
