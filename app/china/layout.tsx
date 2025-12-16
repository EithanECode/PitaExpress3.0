"use client";

import { ReactNode, useState, useEffect } from "react";
import { ChinaProvider } from "@/lib/ChinaContext";
import { ChinaLayoutProvider, useChinaLayoutContext } from "@/lib/ChinaLayoutContext";
import ChinaContextInitializer from "./ChinaContextInitializer";
import Sidebar from "@/components/layout/Sidebar";
import { useTheme } from "next-themes";

function ChinaLayoutContent({ children }: { children: ReactNode }) {
    const { sidebarExpanded, setSidebarExpanded, isMobileMenuOpen, toggleMobileMenu } = useChinaLayoutContext();
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
                onMobileMenuClose={() => toggleMobileMenu()} // Assuming Sidebar accepts a close handler or we just toggle
                userRole="china"
            />

            {/* 
         Note: The actual main content margin logic needs to be consistent.
         In previous refactors (client/admin), we used:
         className={`flex-1 transition-all duration-300 ${sidebarExpanded ? 'lg:ml-72 lg:w-[calc(100%-18rem)]' : 'lg:ml-24 lg:w-[calc(100%-6rem)]'}`}
      */}
            <div className={`flex-1 transition-all duration-300 ${sidebarExpanded ? 'lg:ml-72 lg:w-[calc(100%-18rem)]' : 'lg:ml-24 lg:w-[calc(100%-6rem)]'}`}>
                {children}
            </div>
        </div>
    );
}

export default function ChinaLayout({ children }: { children: ReactNode }) {
    return (
        <ChinaProvider>
            <ChinaLayoutProvider>
                <ChinaContextInitializer />
                <ChinaLayoutContent>{children}</ChinaLayoutContent>
            </ChinaLayoutProvider>
        </ChinaProvider>
    );
}
