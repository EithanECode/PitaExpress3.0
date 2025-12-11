"use client";

import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Search, Handshake, RefreshCw } from "lucide-react";

export default function ServicePhilosophy() {
  const { t } = useTranslation();

  const values = [
    {
      icon: Search,
      key: "transparency",
    },
    {
      icon: Handshake,
      key: "commitment",
    },
    {
      icon: RefreshCw,
      key: "adaptability",
    },
  ];

  return (
    <section className="login-info-section service-philosophy">
      <h2 className="section-title">{t('loginInfo.servicePhilosophy.title')}</h2>
      <p className="philosophy-slogan">{t('loginInfo.servicePhilosophy.slogan')}</p>
      <p className="philosophy-intro">{t('loginInfo.servicePhilosophy.intro')}</p>
      <div className="values-list">
        {values.map((value) => {
          const Icon = value.icon;
          return (
            <div key={value.key} className="value-item">
              <div className="value-icon">
                <Icon size={20} />
              </div>
              <div className="value-content">
                <h3 className="value-title">
                  {t(`loginInfo.servicePhilosophy.values.${value.key}.title`)}
                </h3>
                <p className="value-description">
                  {t(`loginInfo.servicePhilosophy.values.${value.key}.description`)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

