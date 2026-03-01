import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-screen flex overflow-hidden bg-[var(--background)]">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-y-auto">
                <Header />
                <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
