"use client";

import { memo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, CheckCheck, FileText, Download, MoreHorizontal, Pencil, Trash2, X, Languages, Loader2, Ban } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/lib/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';

interface MessageBubbleProps {
    id: string;
    message: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileType: string | null;
    timestamp: string;
    isSent: boolean;
    isRead: boolean;
    senderName?: string;
    isEdited?: boolean;
    onEdit?: (id: string, newContent: string) => void;
    onDelete?: (id: string) => void;
    isDeleted?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
    id,
    message,
    fileUrl,
    fileName,
    fileType,
    timestamp,
    isSent,
    isRead,
    senderName,
    isEdited,
    onEdit,
    onDelete,
    isDeleted,
}: MessageBubbleProps) {
    const isImage = fileType?.startsWith('image/');
    const isPDF = fileType === 'application/pdf';
    const { theme } = useTheme();
    const { language } = useLanguage();
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message || '');
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);

    // Estados de traducción
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Efecto para traducir mensajes entrantes
    useEffect(() => {
        const translateMessage = async () => {
            // Solo traducir mensajes de texto entrantes que no estén vacíos
            if (!message || isSent || !language) return;

            try {
                setIsTranslating(true);
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: message,
                        targetLang: language
                    })
                });

                if (!response.ok) throw new Error('Translation failed');

                const data = await response.json();

                // Solo mostrar traducción si es diferente al original (y no es error)
                if (data.translated && data.translated.toLowerCase() !== message.toLowerCase()) {
                    setTranslatedText(data.translated);
                }
            } catch (error) {
                console.error('Error translating message:', error);
            } finally {
                setIsTranslating(false);
            }
        };

        translateMessage();
    }, [message, isSent, language]);

    const handleSaveEdit = () => {
        if (onEdit && editContent.trim() !== message) {
            onEdit(id, editContent);
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditContent(message || '');
        setIsEditing(false);
    };

    return (
        <div
            className={`flex items-end gap-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300 group/message ${isSent ? 'flex-row-reverse' : 'flex-row'
                }`}
        >
            {!isSent && (
                <Avatar className="w-8 h-8 border-2 border-white shadow-sm shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold">
                        {senderName?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                </Avatar>
            )}

            <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                {!isSent && senderName && (
                    <span className={`text-xs mb-1 px-2 font-medium ${mounted && theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{senderName}</span>
                )}

                <div className="relative flex items-center gap-2">
                    {/* Menú de acciones (solo para mis mensajes y si no estoy editando) */}
                    {isSent && !isEditing && !isDeleted && onEdit && onDelete && (
                        <div className="opacity-0 group-hover/message:opacity-100 transition-opacity">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setIsEditing(true)} className="cursor-pointer">
                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowDeleteAlert(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                        Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    <div
                        className={`rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md ${isSent
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                            : (mounted && theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white rounded-bl-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md')
                            } ${isEditing ? 'min-w-[200px]' : ''}`}
                    >
                        {/* Archivo adjunto */}
                        {fileUrl && (
                            <div className="mb-2">
                                {isImage ? (
                                    <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block group"
                                    >
                                        <div className="relative rounded-lg overflow-hidden">
                                            <img
                                                src={fileUrl}
                                                alt={fileName || 'Imagen'}
                                                className="rounded-lg max-w-full h-auto max-h-64 object-cover transition-transform duration-200 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200"></div>
                                        </div>
                                    </a>
                                ) : (
                                    <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isSent
                                            ? 'bg-blue-600/50 hover:bg-blue-600/70'
                                            : (mounted && theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200')
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${isSent ? 'bg-white/20' : (mounted && theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100')}`}>
                                            {isPDF ? (
                                                <FileText className={`w-5 h-5 ${isSent ? 'text-white' : (mounted && theme === 'dark' ? 'text-blue-300' : 'text-blue-600')}`} />
                                            ) : (
                                                <Download className={`w-5 h-5 ${isSent ? 'text-white' : (mounted && theme === 'dark' ? 'text-blue-300' : 'text-blue-600')}`} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isSent ? 'text-white' : (mounted && theme === 'dark' ? 'text-white' : 'text-slate-800')}`}>
                                                {fileName || 'Archivo'}
                                            </p>
                                            <p className={`text-xs ${isSent ? 'text-blue-100' : (mounted && theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}`}>
                                                Clic para descargar
                                            </p>
                                        </div>
                                        <Download className={`w-4 h-4 shrink-0 ${isSent ? 'text-white' : (mounted && theme === 'dark' ? 'text-slate-400' : 'text-slate-400')}`} />
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Mensaje de texto o Edición */}
                        {isDeleted ? (
                            <div className={`flex items-center gap-2 italic text-sm ${isSent ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                                <Ban className="w-4 h-4" />
                                <span>{t('chat.messageDeleted')}</span>
                            </div>
                        ) : isEditing ? (
                            <div className="flex flex-col gap-2">
                                <Input
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="text-slate-900 bg-white"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-6 px-2 text-white hover:bg-white/20 hover:text-white">
                                        <X className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-6 px-2 text-white hover:bg-white/20 hover:text-white">
                                        <Check className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            message && (
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-all">
                                        {translatedText && !showOriginal ? translatedText : message}
                                        {isEdited && <span className="text-[10px] opacity-70 ml-1">(editado)</span>}
                                    </p>

                                    {/* Indicador de traducción */}
                                    {(translatedText || isTranslating) && !isSent && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <button
                                                onClick={() => setShowOriginal(!showOriginal)}
                                                className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-colors ${mounted && theme === 'dark'
                                                    ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                                                    }`}
                                            >
                                                {isTranslating ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Languages className="w-3 h-3" />
                                                )}
                                                <span>
                                                    {isTranslating
                                                        ? 'Traduciendo...'
                                                        : (showOriginal ? 'Ver traducción' : 'Traducido automáticamente')
                                                    }
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        )}

                        {/* Timestamp y estado de lectura */}
                        <div className={`flex items-center gap-1.5 mt-1.5 ${isSent ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[11px] ${isSent ? 'text-blue-100' : (mounted && theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}`}>
                                {format(new Date(timestamp), 'HH:mm', { locale: es })}
                            </span>
                            {isSent && (
                                <span className="transition-all duration-200">
                                    {isRead ? (
                                        <CheckCheck className="w-4 h-4 text-blue-100" />
                                    ) : (
                                        <Check className="w-4 h-4 text-blue-200" />
                                    )}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('chat.deleteConfirmation.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('chat.deleteConfirmation.description')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('chat.deleteConfirmation.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (onDelete) onDelete(id);
                                setShowDeleteAlert(false);
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {t('chat.deleteConfirmation.confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
});
