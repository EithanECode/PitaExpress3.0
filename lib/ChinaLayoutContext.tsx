"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ChinaLayoutContextType = {
    sidebarExpanded: boolean;
    setSidebarExpanded: (expanded: boolean) => void;
    isMobileMenuOpen: boolean;
    toggleMobileMenu: () => void;
};

const ChinaLayoutContext = createContext<ChinaLayoutContextType | undefined>(undefined);

export function ChinaLayoutProvider({ children }: { children: ReactNode }) {
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);

    return (
        <ChinaLayoutContext.Provider
            value={{
                sidebarExpanded,
                setSidebarExpanded,
                isMobileMenuOpen,
                toggleMobileMenu,
            }}
        >
            {children}
        </ChinaLayoutContext.Provider>
    );
}

export function useChinaLayoutContext() {
    const context = useContext(ChinaLayoutContext);
    if (context === undefined) {
        throw new Error('useChinaLayoutContext must be used within a ChinaLayoutProvider');
    }
    return context;
}
