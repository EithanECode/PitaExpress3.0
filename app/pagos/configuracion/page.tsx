"use client";

import ConfigurationContent from '@/components/shared/configuration/ConfigurationContent';
import { usePagosLayoutContext } from '@/lib/PagosLayoutContext';
import Header from '@/components/layout/Header';
import { useTranslation } from '@/hooks/useTranslation';

export default function ConfiguracionPagosPage() {
  const { toggleMobileMenu } = usePagosLayoutContext();
  const { t } = useTranslation();

  return (
    <>
      <Header
        onMenuToggle={toggleMobileMenu}
        notifications={0}
        title={t('admin.configuration.title')}
        subtitle={t('admin.configuration.subtitle')}
      />
      <ConfigurationContent role="pagos" layoutMode="integrated" />
    </>
  );
}
