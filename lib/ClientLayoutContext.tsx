"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type ClientLayoutContextType = {
    sidebarExpanded: boolean;
    setSidebarExpanded: (expanded: boolean) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    toggleMobileMenu: () => void;
};

const ClientLayoutContext = createContext<ClientLayoutContextType | undefined>(undefined);

export const useClientLayoutContext = () => {
    const context = useContext(ClientLayoutContext);
    if (!context) {
        throw new Error("useClientLayoutContext must be used within a ClientLayoutProvider");
    }
    return context;
};

export const ClientLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    // Close mobile menu on resize if screen becomes large
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <ClientLayoutContext.Provider value={{
            sidebarExpanded,
            setSidebarExpanded,
            isMobileMenuOpen,
            setIsMobileMenuOpen,
            toggleMobileMenu
        }}>
            {children}
        </ClientLayoutContext.Provider>
    );
};
