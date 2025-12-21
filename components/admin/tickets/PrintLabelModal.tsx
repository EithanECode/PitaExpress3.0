"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { Ticket } from '@/lib/tickets/types';

interface PrintLabelModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticket: Ticket | null;
    onSuccess: () => void;
}

// Barcode component for label
const BarcodeDisplay = ({ code }: { code: string }) => {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-[2px] bg-white px-4 py-3 rounded print:gap-[1px]">
                {code.split('').map((char, idx) => (
                    <div
                        key={idx}
                        className="h-16 bg-black print:h-32"
                        style={{
                            width: char === '*' ? '8px' : ['0', '1'].includes(char) ? '6px' : '7px'
                        }}
                    />
                ))}
            </div>
            <span className="text-sm font-mono text-slate-600 tracking-widest print:text-base">{code}</span>
        </div>
    );
};

export default function PrintLabelModal({ open, onOpenChange, ticket, onSuccess }: PrintLabelModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handlePrint = async () => {
        if (!ticket) return;

        setIsLoading(true);

        try {
            // Record print in history
            const response = await fetch('/api/admin/tickets/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket_id: ticket.id })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al registrar impresión');
            }

            // Open print dialog
            window.print();

            toast.success('Etiqueta enviada a impresión');
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error('Error printing label:', error);
            toast.error(error.message || 'Error al imprimir etiqueta');
        } finally {
            setIsLoading(false);
        }
    };

    if (!ticket) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Imprimir Etiqueta</DialogTitle>
                        <DialogDescription>
                            Vista previa de la etiqueta para {ticket.user_name}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Label Preview */}
                    <div className="flex justify-center py-6">
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 bg-white">
                            <div className="flex flex-col items-center gap-4 print-label">
                                {/* Logo */}
                                <div className="text-3xl font-bold text-blue-600">
                                    QX304YW
                                </div>

                                {/* Base Code */}
                                <div className="text-4xl font-bold tracking-wider">
                                    {ticket.base_code}
                                </div>

                                {/* Separator */}
                                <div className="w-full h-px bg-slate-800 my-2"></div>

                                {/* Barcode */}
                                <BarcodeDisplay code={ticket.full_code} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handlePrint} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Printer className="mr-2 h-4 w-4" />
                            )}
                            Confirmar Impresión
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Print-only content */}
            <style jsx global>{`
        @media print {
          @page {
            size: 11.69in 4.26in;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .print-label, .print-label * {
            visibility: visible;
          }
          .print-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 11.69in;
            height: 4.26in;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0.5in;
          }
        }
      `}</style>
        </>
    );
}
