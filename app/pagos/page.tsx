"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { usePagosLayoutContext } from '@/lib/PagosLayoutContext';
import Header from '@/components/layout/Header';
import { usePagosStats } from '@/hooks/use-pagos-stats';
import { RefreshCcw, TrendingUp, CheckCircle2, Clock, DollarSign, FileText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from '@/components/shared/PriceDisplay';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useNotifications } from '@/hooks/use-notifications';

export default function PagosDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const { toggleMobileMenu } = usePagosLayoutContext();
  const { pending, completed, totalAmount, loading, error, refresh } = usePagosStats();
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Notificaciones para rol Pagos (igual que en /pagos/validacion-pagos)
  const { uiItems: pagosNotifItems, unreadCount: pagosUnread, markAllAsRead: markAllPagosRead, markOneAsRead: markPagosOneRead } = useNotifications({ role: 'pagos', limit: 20, enabled: true });

  const totalProcesados = pending + completed; // pedidos en pipeline de pagos
  const porcentajeConfirmados = totalProcesados > 0 ? (completed / totalProcesados) * 100 : 0;

  if (!mounted) return null;

  return (
    <div className={`flex-1 overflow-x-hidden`}>
      <Header
        notifications={pagosUnread}
        notificationsItems={pagosNotifItems.filter(n => n.unread)}
        onMarkAllAsRead={markAllPagosRead}
        onItemClick={(id) => markPagosOneRead(id)}
        notificationsRole="pagos"
        onMenuToggle={toggleMobileMenu}
        title={t('paymentsDashboard.title')}
        subtitle={t('paymentsDashboard.subtitle')}
      />
      <div className="p-4 md:p-5 lg:p-6 space-y-6 md:space-y-6 lg:space-y-8">
        {/* Hero */}
        <div className={`rounded-xl p-4 md:p-6 lg:p-8 text-white relative overflow-hidden ${mounted && theme === 'dark' ? 'bg-gradient-to-r from-blue-900 via-blue-800 to-orange-900' : 'bg-gradient-to-r from-blue-500 via-blue-600 to-orange-500'}`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2">{t('paymentsDashboard.hero.title')}</h2>
              <p className={`text-sm md:text-base lg:text-lg ${mounted && theme === 'dark' ? 'text-blue-200' : 'text-blue-100'}`}>{t('paymentsDashboard.hero.desc1')}</p>
              <p className={`mt-2 text-xs md:text-sm ${mounted && theme === 'dark' ? 'text-blue-300' : 'text-blue-200'}`}>{t('paymentsDashboard.hero.desc2')}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold">{pending}</div>
                <p className={`text-xs md:text-sm ${mounted && theme === 'dark' ? 'text-blue-200' : 'text-blue-100'}`}>{t('paymentsDashboard.stats.pending.label')}</p>
              </div>
              <div className="text-center hidden md:block">
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold">{completed}</div>
                <p className={`text-xs md:text-sm ${mounted && theme === 'dark' ? 'text-blue-200' : 'text-blue-100'}`}>{t('paymentsDashboard.stats.completed.label')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        {error && (
          <div className={`text-sm rounded-md px-3 py-2 ${mounted && theme === 'dark' ? 'text-red-200 bg-red-900/20 border border-red-700' : 'text-red-600 bg-red-100 border border-red-300'}`}>{error}</div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          <Card className={`hover:shadow-lg transition-all duration-300 group ${mounted && theme === 'dark' ? 'bg-slate-800/70 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-xs md:text-sm font-medium flex items-center gap-1 ${mounted && theme === 'dark' ? 'text-white' : 'text-blue-800'}`}><Clock className="h-3 w-3" /> {t('paymentsDashboard.stats.pending.label')}</CardTitle>
              <div className={`p-1 md:p-2 rounded-lg group-hover:scale-110 transition-transform ${mounted && theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'}`}><Clock className="h-3 w-3 md:h-4 md:w-4 text-white" /></div>
            </CardHeader>
            <CardContent>
              <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${mounted && theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>{loading ? '—' : pending}</div>
              <p className={`text-xs ${mounted && theme === 'dark' ? 'text-slate-300' : 'text-blue-700'}`}>{t('paymentsDashboard.stats.pending.help')}</p>
              <div className={`mt-2 w-full rounded-full h-2 ${mounted && theme === 'dark' ? 'bg-blue-900/50' : 'bg-blue-200'}`}>
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(pending / Math.max(totalProcesados, 1)) * 100}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card className={`hover:shadow-lg transition-all duration-300 group ${mounted && theme === 'dark' ? 'bg-slate-800/70 border-slate-700' : 'bg-emerald-50 border-emerald-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-xs md:text-sm font-medium flex items-center gap-1 ${mounted && theme === 'dark' ? 'text-white' : 'text-emerald-800'}`}><CheckCircle2 className="h-3 w-3" /> {t('paymentsDashboard.stats.completed.label')}</CardTitle>
              <div className={`p-1 md:p-2 rounded-lg group-hover:scale-110 transition-transform ${mounted && theme === 'dark' ? 'bg-emerald-600' : 'bg-emerald-500'}`}><CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-white" /></div>
            </CardHeader>
            <CardContent>
              <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${mounted && theme === 'dark' ? 'text-emerald-300' : 'text-emerald-900'}`}>{loading ? '—' : completed}</div>
              <p className={`text-xs ${mounted && theme === 'dark' ? 'text-slate-300' : 'text-emerald-700'}`}>{t('paymentsDashboard.stats.completed.help')}</p>
              <div className={`mt-2 w-full rounded-full h-2 ${mounted && theme === 'dark' ? 'bg-emerald-900/50' : 'bg-emerald-200'}`}>
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${porcentajeConfirmados}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card className={`hover:shadow-lg transition-all duration-300 group ${mounted && theme === 'dark' ? 'bg-slate-800/70 border-slate-700' : 'bg-amber-50 border-amber-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-xs md:text-sm font-medium flex items-center gap-1 ${mounted && theme === 'dark' ? 'text-white' : 'text-amber-800'}`}><TrendingUp className="h-3 w-3" /> {t('paymentsDashboard.stats.totalAmount.label')}</CardTitle>
              <div className={`p-1 md:p-2 rounded-lg group-hover:scale-110 transition-transform ${mounted && theme === 'dark' ? 'bg-amber-600' : 'bg-amber-500'}`}><TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-white" /></div>
            </CardHeader>
            <CardContent>
              <div className={`text-lg md:text-xl lg:text-2xl font-bold ${mounted && theme === 'dark' ? 'text-amber-300' : 'text-amber-900'}`}>{loading ? '—' : <PriceDisplay amount={totalAmount} currency="USD" variant="inline" size="md" />}</div>
              <p className={`text-xs ${mounted && theme === 'dark' ? 'text-slate-300' : 'text-amber-700'}`}>{t('paymentsDashboard.stats.totalAmount.help')}</p>
              <div className={`mt-2 w-full rounded-full h-2 ${mounted && theme === 'dark' ? 'bg-amber-900/50' : 'bg-amber-200'}`}>
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, totalAmount / 10000 * 100)}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <Card className={`backdrop-blur-sm hover:shadow-lg transition-shadow ${mounted && theme === 'dark' ? 'bg-slate-800/70 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
          <CardHeader>
            <CardTitle className={`text-lg md:text-xl font-semibold flex items-center gap-2 ${mounted && theme === 'dark' ? 'text-white' : ''}`}><DollarSign className={`h-5 w-5 ${mounted && theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} /> {t('paymentsDashboard.quickActions.title')}</CardTitle>
            <p className={`text-xs md:text-sm ${mounted && theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('paymentsDashboard.quickActions.subtitle')}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-4 lg:gap-6">
              <Link href="/pagos/validacion-pagos" className="col-span-2 md:col-span-1">
                <Button variant="outline" className={`h-16 md:h-20 lg:h-24 w-full flex flex-col gap-2 transition-all duration-300 group ${mounted && theme === 'dark' ? 'hover:bg-slate-700 hover:border-slate-600 border-slate-600' : 'hover:bg-blue-50 hover:border-blue-300'}`}>
                  <div className={`p-2 md:p-3 rounded-lg transition-colors ${mounted && theme === 'dark' ? 'bg-blue-900/30 group-hover:bg-blue-900/50' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                    <ShieldCheck className={`h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 ${mounted && theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <span className={`text-xs md:text-sm font-medium ${mounted && theme === 'dark' ? 'text-white' : ''}`}>{t('paymentsDashboard.quickActions.validate')}</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
