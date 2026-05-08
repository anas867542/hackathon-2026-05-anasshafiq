import { Header } from '@/components/nav/Header';
import { BottomNav } from '@/components/nav/BottomNav';
import { AuthGuard } from '@/components/nav/AuthGuard';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="driver">
      {/* Desktop header */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Page content */}
      <main className="min-h-screen pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav role="driver" />
    </AuthGuard>
  );
}
