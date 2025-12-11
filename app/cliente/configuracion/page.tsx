"use client";

import React from 'react';
import ConfigurationContent from '@/components/shared/configuration/ConfigurationContent';
import { useClientContext } from '@/lib/ClientContext';
import { useClientLayoutContext } from '@/lib/ClientLayoutContext';
import Header from '@/components/layout/Header';
import { useTranslation } from '@/hooks/useTranslation';

export default function ConfiguracionPage() {
  const { setClient } = useClientContext();
  const { toggleMobileMenu } = useClientLayoutContext();
  const { t } = useTranslation();

  return (
    <>
      <Header
        onMenuToggle={toggleMobileMenu}
        notifications={0} // Default for config page
        title={t('admin.configuration.title')}
        subtitle={t('admin.configuration.subtitle')}
      />
      <ConfigurationContent
        role="client"
        onUserImageUpdate={(url) => setClient({ userImage: url })}
        layoutMode="integrated"
      />
    </>
  );
}
