import { AuthGuard } from '@/components/nav/AuthGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="admin">
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <span className="text-base font-semibold tracking-tight text-zinc-900">
              TranspoLink <span className="ml-1.5 rounded-md bg-zinc-900 px-1.5 py-0.5 text-xs font-medium text-white">Admin</span>
            </span>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</div>
      </div>
    </AuthGuard>
  );
}
