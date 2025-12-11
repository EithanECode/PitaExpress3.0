"use client";

import { ClientProvider } from "@/lib/ClientContext";
import { ClientLayoutProvider, useClientLayoutContext } from "@/lib/ClientLayoutContext";
import ClientContextInitializer from "./ClientContextInitializer";
import Sidebar from '@/components/layout/Sidebar';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

// Inner component to consume the context
function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    sidebarExpanded,
    setSidebarExpanded,
    isMobileMenuOpen,
    setIsMobileMenuOpen
  } = useClientLayoutContext();

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
        userRole="client"
      />

      <main className={`flex-1 transition-all duration-300 w-full ${sidebarExpanded ? 'lg:ml-72 lg:w-[calc(100%-18rem)]' : 'lg:ml-24 lg:w-[calc(100%-6rem)]'
        }`}>
        {children}
      </main>
    </div>
  );
}

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientProvider>
      <ClientLayoutProvider>
        <ClientContextInitializer />
        <ClientLayoutContent>
          {children}
        </ClientLayoutContent>
      </ClientLayoutProvider>
    </ClientProvider>
  );
}
