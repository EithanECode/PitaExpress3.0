"use client";

import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { FileText, ShoppingCart, Package, CreditCard, Phone } from "lucide-react";

export default function PortalFeatures() {
  const { t } = useTranslation();

  const features = [
    {
      icon: FileText,
      key: "quotes",
    },
    {
      icon: ShoppingCart,
      key: "buy",
    },
    {
      icon: Package,
      key: "tracking",
    },
    {
      icon: CreditCard,
      key: "payments",
    },
    {
      icon: Phone,
      key: "support",
    },
  ];

  return (
    <section className="login-info-section portal-features">
      <div className="section-divider"></div>
      <h2 className="section-title" suppressHydrationWarning>{t('loginInfo.portalFeatures.title')}</h2>
      <div className="features-list">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={feature.key} className="feature-item">
              <div className="feature-icon">
                <Icon size={20} />
              </div>
              <div className="feature-content">
                <h3 className="feature-title" suppressHydrationWarning>
                  {t(`loginInfo.portalFeatures.features.${feature.key}.title`)}
                </h3>
                <p className="feature-description" suppressHydrationWarning>
                  {t(`loginInfo.portalFeatures.features.${feature.key}.description`)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="section-divider"></div>
    </section>
  );
}

