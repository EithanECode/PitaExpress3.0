"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ArchiveHistoryButtonProps {
    role: 'client' | 'china' | 'vzla' | 'pagos' | 'admin';
    userId: string;
    onSuccess?: () => void;
    className?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg';
}

export function ArchiveHistoryButton({
    role,
    userId,
    onSuccess,
    className = '',
    variant = 'outline',
    size = 'sm',
}: ArchiveHistoryButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    const handleArchive = async () => {
        setIsArchiving(true);
        try {
            const res = await fetch('/api/orders/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, userId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast({
                title: "Historial limpiado",
                description: data.count > 0
                    ? `Se han eliminado ${data.count} pedidos del historial.`
                    : "No hay pedidos para eliminar.",
            });
            setIsModalOpen(false);
            onSuccess?.();
        } catch (e: any) {
            toast({
                title: "Error",
                description: 'Error al borrar historial: ' + e.message,
                variant: "destructive",
            });
        } finally {
            setIsArchiving(false);
        }
    };

    // Message varies by role
    const getDescription = () => {
        if (role === 'admin') {
            return 'Esta acción eliminará permanentemente los pedidos cancelados y entregados con más de 30 días de antigüedad. Esta acción no se puede deshacer.';
        }
        if (role === 'pagos') {
            return 'Esta acción ocultará los pagos aceptados y rechazados de tu vista. Los demás usuarios seguirán viéndolos.';
        }
        return 'Esta acción ocultará los pedidos cancelados y entregados de tu vista. Los demás usuarios seguirán viéndolos.';
    };

    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={`text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30 ${className}`}
                onClick={() => setIsModalOpen(true)}
            >
                <Trash2 className="h-4 w-4 mr-2" />
                Borrar Historial
            </Button>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            ¿Borrar historial de pedidos?
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            {getDescription()}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        <span className="text-sm text-red-700 dark:text-red-300">
                            {role === 'admin' ? 'Esta acción no se puede deshacer.' : 'Esta acción solo afecta tu vista.'}
                        </span>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isArchiving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleArchive}
                            disabled={isArchiving}
                        >
                            {isArchiving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Borrando...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Borrar
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
