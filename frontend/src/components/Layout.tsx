import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Toaster } from './ui/sonner';

export function Layout() {
  return (
    <div className="flex flex-col min-h-svh bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
      <Toaster richColors closeButton />
    </div>
  );
}
