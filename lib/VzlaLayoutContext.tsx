"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface VzlaLayoutContextType {
    sidebarExpanded: boolean;
    setSidebarExpanded: (expanded: boolean) => void;
    isMobileMenuOpen: boolean;
    toggleMobileMenu: () => void;
}

const VzlaLayoutContext = createContext<VzlaLayoutContextType | undefined>(undefined);

export const VzlaLayoutProvider = ({ children }: { children: ReactNode }) => {
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen((prev) => !prev);
    };

    return (
        <VzlaLayoutContext.Provider
            value={{
                sidebarExpanded,
                setSidebarExpanded,
                isMobileMenuOpen,
                toggleMobileMenu,
            }}
        >
            {children}
        </VzlaLayoutContext.Provider>
    );
};

export const useVzlaLayoutContext = () => {
    const context = useContext(VzlaLayoutContext);
    if (!context) {
        throw new Error("useVzlaLayoutContext must be used within a VzlaLayoutProvider");
    }
    return context;
};
