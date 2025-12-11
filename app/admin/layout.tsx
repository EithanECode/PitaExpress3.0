"use client";

import { AdminProvider } from '@/lib/AdminContext';
import { AdminLayoutProvider, useAdminLayoutContext } from '@/lib/AdminLayoutContext';
import AdminContextInitializer from './AdminContextInitializer';
import Sidebar from '@/components/layout/Sidebar';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

// Inner component to consume the context
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    sidebarExpanded,
    setSidebarExpanded,
    isMobileMenuOpen,
    setIsMobileMenuOpen
  } = useAdminLayoutContext();

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`min-h-screen flex overflow-x-hidden ${mounted && theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
      <Sidebar
        isExpanded={sidebarExpanded}
        setIsExpanded={setSidebarExpanded}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
        userRole="admin"
      />

      <main className={`flex-1 transition-all duration-300 w-full ${sidebarExpanded ? 'lg:ml-72 lg:w-[calc(100%-18rem)]' : 'lg:ml-24 lg:w-[calc(100%-6rem)]'
        }`}>
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutProvider>
        <AdminContextInitializer />
        <AdminLayoutContent>
          {children}
        </AdminLayoutContent>
      </AdminLayoutProvider>
    </AdminProvider>
  );
}
