import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import PWAInstallBanner from './PWAInstallBanner';
import MobileNav from './MobileNav';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-3 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      {/* Mobile bottom nav — hidden on desktop */}
      <MobileNav />
      <PWAInstallBanner />
    </div>
  );
}
