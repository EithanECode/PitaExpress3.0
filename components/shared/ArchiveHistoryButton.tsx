"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';

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
    const { t } = useTranslation();
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
                title: t('venezuela.pagos.modal.deleteHistory.success.title'),
                description: data.count > 0
                    ? t('venezuela.pagos.modal.deleteHistory.success.descriptionWithCount', { count: data.count })
                    : t('venezuela.pagos.modal.deleteHistory.success.descriptionEmpty'),
            });
            setIsModalOpen(false);
            onSuccess?.();
        } catch (e: any) {
            toast({
                title: t('venezuela.pagos.modal.deleteHistory.error.title'),
                description: t('venezuela.pagos.modal.deleteHistory.error.description', { message: e.message }),
                variant: "destructive",
            });
        } finally {
            setIsArchiving(false);
        }
    };

    // Message varies by role
    const getDescription = () => {
        if (role === 'admin') {
            return t('venezuela.pagos.modal.deleteHistory.description.admin');
        }
        if (role === 'pagos') {
            return t('venezuela.pagos.modal.deleteHistory.description.pagos');
        }
        return t('venezuela.pagos.modal.deleteHistory.description.default');
    };

    const getWarning = () => {
        if (role === 'admin') {
            return t('venezuela.pagos.modal.deleteHistory.warning.admin');
        }
        return t('venezuela.pagos.modal.deleteHistory.warning.default');
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
                {t('venezuela.pagos.actions.deleteHistory')}
            </Button>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            {t('venezuela.pagos.modal.deleteHistory.title')}
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            {getDescription()}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        <span className="text-sm text-red-700 dark:text-red-300">
                            {getWarning()}
                        </span>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isArchiving}
                        >
                            {t('venezuela.pagos.modal.deleteHistory.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleArchive}
                            disabled={isArchiving}
                        >
                            {isArchiving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t('venezuela.pagos.modal.deleteHistory.deleting')}
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('venezuela.pagos.modal.deleteHistory.delete')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
