"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface PagosLayoutContextType {
    sidebarExpanded: boolean;
    setSidebarExpanded: (expanded: boolean) => void;
    isMobileMenuOpen: boolean;
    toggleMobileMenu: () => void;
}

const PagosLayoutContext = createContext<PagosLayoutContextType | undefined>(undefined);

export const PagosLayoutProvider = ({ children }: { children: ReactNode }) => {
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen((prev) => !prev);
    };

    return (
        <PagosLayoutContext.Provider
            value={{
                sidebarExpanded,
                setSidebarExpanded,
                isMobileMenuOpen,
                toggleMobileMenu,
            }}
        >
            {children}
        </PagosLayoutContext.Provider>
    );
};

export const usePagosLayoutContext = () => {
    const context = useContext(PagosLayoutContext);
    if (!context) {
        throw new Error("usePagosLayoutContext must be used within a PagosLayoutProvider");
    }
    return context;
};
