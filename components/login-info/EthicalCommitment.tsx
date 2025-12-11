"use client";

import React from "react";
import { useTranslation } from "@/hooks/useTranslation";

export default function EthicalCommitment() {
  const { t } = useTranslation();

  const guarantees = [
    "respect",
    "integrity",
    "trust",
  ];

  return (
    <section className="login-info-section ethical-commitment">
      <div className="section-divider"></div>
      <h2 className="section-title">{t('loginInfo.ethicalCommitment.title')}</h2>
      <p className="commitment-intro">
        {t('loginInfo.ethicalCommitment.intro').split('**').map((part, index) => 
          index % 2 === 1 ? <strong key={index}>{part}</strong> : part
        )}
      </p>
      <ul className="guarantees-list">
        {guarantees.map((guarantee) => (
          <li key={guarantee} className="guarantee-item">
            {t(`loginInfo.ethicalCommitment.guarantees.${guarantee}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}

