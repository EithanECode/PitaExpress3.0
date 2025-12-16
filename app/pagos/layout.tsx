"use client";

import { ReactNode, useState, useEffect } from "react";
import { PagosLayoutProvider, usePagosLayoutContext } from "@/lib/PagosLayoutContext";
import Sidebar from "@/components/layout/Sidebar";
import { useTheme } from "next-themes";

function PagosLayoutContent({ children }: { children: ReactNode }) {
    const { sidebarExpanded, setSidebarExpanded, isMobileMenuOpen, toggleMobileMenu } = usePagosLayoutContext();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className={`min-h-screen flex overflow-x-hidden ${mounted && theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <Sidebar
                isExpanded={sidebarExpanded}
                setIsExpanded={setSidebarExpanded}
                isMobileMenuOpen={isMobileMenuOpen}
                onMobileMenuClose={() => toggleMobileMenu()}
                userRole="pagos"
            />

            <div className={`flex-1 transition-all duration-300 ${sidebarExpanded ? 'lg:ml-72 lg:w-[calc(100%-18rem)]' : 'lg:ml-24 lg:w-[calc(100%-6rem)]'}`}>
                {children}
            </div>
        </div>
    );
}

export default function PagosLayout({ children }: { children: ReactNode }) {
    return (
        <PagosLayoutProvider>
            <PagosLayoutContent>{children}</PagosLayoutContent>
        </PagosLayoutProvider>
    );
}
