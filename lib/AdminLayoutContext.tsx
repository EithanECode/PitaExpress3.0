"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type AdminLayoutContextType = {
    sidebarExpanded: boolean;
    setSidebarExpanded: (expanded: boolean) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    toggleMobileMenu: () => void;
};

const AdminLayoutContext = createContext<AdminLayoutContextType | undefined>(undefined);

export const useAdminLayoutContext = () => {
    const context = useContext(AdminLayoutContext);
    if (!context) {
        throw new Error("useAdminLayoutContext must be used within an AdminLayoutProvider");
    }
    return context;
};

export const AdminLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
        <AdminLayoutContext.Provider value={{
            sidebarExpanded,
            setSidebarExpanded,
            isMobileMenuOpen,
            setIsMobileMenuOpen,
            toggleMobileMenu
        }}>
            {children}
        </AdminLayoutContext.Provider>
    );
};
